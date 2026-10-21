#!/usr/bin/env python3
"""Stage an approved, locally uploaded runtime. Never activate services or change current."""
import argparse
import hashlib
import json
import os
import platform
from pathlib import Path, PurePosixPath
import re
import shutil
import tarfile
import tempfile


def stage(args):
    if not re.fullmatch(r"[a-f0-9]{40}", args.sha) or not re.fullmatch(r"[a-f0-9]{64}", args.digest):
        raise ValueError("Exact source SHA and trusted payload digest required")
    manifest = json.loads(Path(args.manifest).read_text())
    repo = "gduf-community/" + ("competition-Q-A-website" if args.unit == "api" else "ai-data-competitions-ui")
    arch = {"x86_64": "x64", "aarch64": "arm64"}.get(platform.machine())
    if any(manifest.get(key) != value for key, value in {
        "version": 1, "unit": args.unit, "repository": repo, "sha": args.sha,
        "payloadSha256": args.digest, "platform": "linux", "arch": arch, "node": "v22.23.3",
        "server": "build/api/server.js" if args.unit == "api" else "server.js",
    }.items()) or arch is None or platform.system() != "Linux":
        raise ValueError("Runtime identity/platform mismatch")
    with open(args.payload, "rb") as stream:
        digest = hashlib.sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != args.digest:
        raise ValueError("Payload digest mismatch")
    releases = Path(args.releases).resolve(strict=True)
    destination = releases / args.sha
    if destination.exists() or destination.is_symlink():
        raise ValueError("Release already exists; refusing overwrite")
    temporary = Path(tempfile.mkdtemp(prefix=".stage-", dir=releases))
    try:
        with tarfile.open(args.payload, "r:gz") as archive:
            members = archive.getmembers()
            if shutil.disk_usage(releases).free < sum(item.size for item in members) + 512 * 1024 * 1024:
                raise ValueError("Insufficient free disk with 512 MiB reserve")
            names = set()
            links = []
            for item in members:
                name = PurePosixPath(item.name)
                if name.is_absolute() or ".." in name.parts or any(part.startswith(".env") for part in name.parts):
                    raise ValueError("Unsafe archive path")
                if str(name) == "." and item.isdir():
                    continue
                if str(name) in names:
                    raise ValueError("Duplicate archive path")
                names.add(str(name))
                target = temporary.joinpath(*name.parts)
                if item.issym():
                    link = PurePosixPath(item.linkname)
                    if link.is_absolute():
                        raise ValueError("Absolute archive symlink")
                    links.append((target, item.linkname))
                elif item.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                elif item.isfile():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with archive.extractfile(item) as source, target.open("xb") as output:
                        shutil.copyfileobj(source, output)
                    target.chmod(0o700 if item.mode & 0o111 else 0o600)
                else:
                    raise ValueError("Unsupported archive entry")
            # Create links after files, so archive writes never traverse symlink parents.
            for target, value in links:
                for parent in target.parents:
                    if parent == temporary:
                        break
                    if parent.is_symlink():
                        raise ValueError("Symlink parent in archive")
                target.parent.mkdir(parents=True, exist_ok=True)
                if not os.path.abspath(target.parent / value).startswith(str(temporary) + os.sep):
                    raise ValueError("Archive symlink escapes release")
                target.symlink_to(value)
            for target, _ in links:
                if not str(target.resolve(strict=True)).startswith(str(temporary) + os.sep):
                    raise ValueError("Archive symlink chain escapes release")
        for required in [manifest["server"], "ecs-start.mjs"]:
            if not (temporary / required).is_file():
                raise ValueError("Missing runtime entrypoint")
        (temporary / "runtime-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        # Caller serializes staging per unit; no current symlink, process, DB or storage changes.
        if destination.exists() or destination.is_symlink():
            raise ValueError("Release appeared during staging")
        temporary.rename(destination)
        print("Staged " + args.unit + " " + args.sha + "; not activated")
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["payload", "manifest", "sha", "digest", "releases"]:
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--unit", choices=["api", "web"], required=True)
    stage(parser.parse_args())

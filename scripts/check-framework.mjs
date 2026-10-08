import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const installed = name => JSON.parse(readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), "utf8")).version;
const next = installed("next");
assert.match(next, /^\d+\.\d+\.\d+$/, "Next must be a stable release");
const [major, minor, patch] = next.split(".").map(Number);
assert.ok(major > 16 || major === 16 && (minor > 3 || minor === 3 && patch >= 8), "Next must be >=16.3.8");
assert.equal(next, manifest.dependencies.next, "Next must match the exact manifest pin");
assert.equal(installed("eslint-config-next"), next, "Next ESLint config must match Next");
assert.equal(manifest.devDependencies["eslint-config-next"], next);
assert.equal(installed("react"), installed("react-dom"), "React and React DOM must match");
for (const name of ["react", "react-dom"]) assert.equal(installed(name), manifest.dependencies[name]);
for (const name of ["@types/react", "@types/react-dom"]) {
  assert.equal(installed(name).split(".")[0], installed("react").split(".")[0], "React types must match the runtime major");
}
console.log(`Framework verified: Next ${next}, React/DOM ${installed("react")}, types ${installed("@types/react")}/${installed("@types/react-dom")}`);

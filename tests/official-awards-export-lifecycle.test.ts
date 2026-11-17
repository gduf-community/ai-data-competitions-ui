import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

import * as contract from "../src/lib/contracts/official-awards";

// Execute the shipped hook with deterministic React lifecycle and HTTP boundaries.
// The harness controls responses after cancellation; browser download UI is separate.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function exporter() {
  const states: unknown[] = [], refs: Array<{ current: unknown }> = [];
  const effects: Array<{ dependencies: readonly unknown[]; cleanup?: () => void }> = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, writes = 0;
  const pendingEffects: Array<() => void> = [];
  const requests: Array<{ url: string; signal: AbortSignal; response: ReturnType<typeof deferred<Response>> }> = [];
  const downloads: string[] = [], successes: string[] = [], errors: string[] = [];
  let confirmations = 0;
  const react = {
    useState<T>(initial: T) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index] as T, (value: T | ((previous: T) => T)) => {
        writes++;
        states[index] = typeof value === "function" ? (value as (previous: T) => T)(states[index] as T) : value;
      }] as const;
    },
    useRef<T>(initial: T) {
      const index = refIndex++;
      refs[index] ??= { current: initial };
      return refs[index] as { current: T };
    },
    useCallback<T>(callback: T) { return callback; },
    useLayoutEffect(callback: () => void | (() => void), dependencies: readonly unknown[]) {
      const index = effectIndex++, previous = effects[index];
      if (previous && dependencies.every((value, position) => Object.is(value, previous.dependencies[position]))) return;
      pendingEffects.push(() => {
        previous?.cleanup?.();
        effects[index] = { dependencies, cleanup: callback() || undefined };
      });
    },
  };
  const exports: Record<string, unknown> = {};
  const code = ts.transpileModule(readFileSync("src/hooks/use-official-award-export.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, AbortController, URLSearchParams, Error,
    require(name: string) {
      if (name === "react") return react;
      if (name === "@/lib/contracts/official-awards") return contract;
      if (name === "@/lib/i18n/client") return { confirmI18n: () => { confirmations++; return true; } };
      if (name === "@/lib/i18n/toast") return { toast: { success: (message: string) => successes.push(message), error: (message: string) => errors.push(message) } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    fetch(url: string, init: RequestInit) {
      const response = deferred<Response>();
      requests.push({ url, signal: init.signal as AbortSignal, response });
      return response.promise;
    },
    URL: { createObjectURL: () => "blob:synthetic", revokeObjectURL() {} },
    document: { body: { appendChild() {} }, createElement: () => {
      const anchor = { href: "", download: "", click() { downloads.push(anchor.download); }, remove() {} };
      return anchor;
    } },
  });
  const hook = exports.useOfficialAwardExport as typeof import("../src/hooks/use-official-award-export").useOfficialAwardExport;
  return {
    render(competitionId = "competition-a", filterQuery = "year=2026") {
      stateIndex = refIndex = effectIndex = 0;
      const result = hook(competitionId, filterQuery);
      pendingEffects.splice(0).forEach(effect => effect());
      return result;
    },
    unmount() { effects.forEach(effect => effect.cleanup?.()); },
    requests, downloads, successes, errors,
    writes: () => writes,
    confirmations: () => confirmations,
  };
}

const scope = { awardCount: 1, memberCount: 2 };
const turn = () => new Promise(resolve => setImmediate(resolve));
function csv(blob: () => Promise<Blob> = async () => new Blob(["\ufeffsynthetic"])) {
  return { ok: true, headers: new Headers({ "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="awards.csv"' }), blob } as Response;
}

test("export is single-flight even before React renders the disabled button", async () => {
  const harness = exporter(), current = harness.render();
  const first = current.run("csv", "award", scope);
  const second = current.run("xlsx", "member", scope);
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.confirmations(), 1);
  harness.requests[0].response.resolve(csv());
  await Promise.all([first, second]);
  assert.equal(harness.downloads.length, 1);
  assert.equal(harness.render().exporting, null);
});

test("cancel works before re-render and suppresses a transport that ignores abort", async () => {
  const harness = exporter(), current = harness.render();
  const pending = current.run("csv", "award", scope);
  current.cancel();
  assert.equal(harness.requests[0].signal.aborted, true);
  harness.requests[0].response.resolve(csv());
  await pending;
  assert.deepEqual(harness.downloads, []);
  assert.deepEqual(harness.successes, []);
  assert.deepEqual(harness.errors, []);
});

test("cancel after headers prevents a late blob from triggering a download", async () => {
  const harness = exporter();
  const blob = deferred<Blob>();
  const pending = harness.render().run("csv", "award", scope);
  harness.requests[0].response.resolve(csv(() => blob.promise));
  await turn();
  harness.render().cancel();
  blob.resolve(new Blob(["late"]));
  await pending;
  assert.deepEqual(harness.downloads, []);
  assert.deepEqual(harness.successes, []);
});

test("competition or filter changes abort old exports and cannot download obsolete results", async () => {
  for (const [competitionId, filterQuery] of [["competition-b", "year=2026"], ["competition-a", "year=2025"]]) {
    const harness = exporter();
    const pending = harness.render().run("csv", "award", scope);
    harness.render(competitionId, filterQuery);
    assert.equal(harness.requests[0].signal.aborted, true);
    assert.equal(harness.render(competitionId, filterQuery).exporting, null);
    harness.requests[0].response.resolve(csv());
    await pending;
    assert.deepEqual(harness.downloads, []);
  }
});

test("old completion cannot clear the progress or cancellation handle of a new export", async () => {
  const harness = exporter();
  const old = harness.render().run("csv", "award", scope);
  harness.render().cancel();
  const current = harness.render();
  const next = current.run("xlsx", "member", scope);
  harness.requests[0].response.resolve(csv());
  await old;
  assert.equal(harness.render().exporting, "xlsx");
  harness.render().cancel();
  assert.equal(harness.requests[1].signal.aborted, true);
  harness.requests[1].response.resolve(csv());
  await next;
  assert.deepEqual(harness.downloads, []);
});

test("unmount aborts the export and late completion produces no state, toast or download", async () => {
  const harness = exporter();
  const pending = harness.render().run("csv", "award", scope);
  harness.unmount();
  const writesAfterUnmount = harness.writes();
  assert.equal(harness.requests[0].signal.aborted, true);
  harness.requests[0].response.resolve(csv());
  await pending;
  assert.equal(harness.writes(), writesAfterUnmount);
  assert.deepEqual(harness.downloads, []);
  assert.deepEqual(harness.successes, []);
  assert.deepEqual(harness.errors, []);
});

test("a failed export unlocks manual retry without downloading the error response", async () => {
  const harness = exporter();
  const first = harness.render().run("csv", "award", scope);
  harness.requests[0].response.resolve(new Response(JSON.stringify({ message: "temporary failure" }), { status: 503 }));
  await first;
  assert.equal(harness.errors.length, 1);
  assert.deepEqual(harness.downloads, []);
  const retry = harness.render().run("csv", "award", scope);
  assert.equal(harness.requests.length, 2);
  harness.requests[1].response.resolve(csv());
  await retry;
  assert.deepEqual(harness.downloads, ["awards.csv"]);
});

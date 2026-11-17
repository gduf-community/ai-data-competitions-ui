import assert from "node:assert/strict";
import test from "node:test";
import {
  createPhotoReviewSession,
  type PhotoReviewPage,
} from "../src/components/admin/hall-of-fame-photo-review-session";
import { syntheticAdminPhotoRequests } from "./fixtures/hall-of-fame";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const request = syntheticAdminPhotoRequests[0];
const empty: PhotoReviewPage = { rows: [], total: 0, canManage: false, canViewPreview: false };
const approved: PhotoReviewPage = {
  rows: [{ ...request, status: "approved" }],
  total: 1,
  canManage: true,
  canViewPreview: true,
};

for (const phase of ["current", "all"] as const) {
  for (const nextId of ["another-request", request.id]) {
    test(`closing during ${phase} read isolates reopened ${nextId === request.id ? "same" : "other"} request`, async () => {
      const old = createPhotoReviewSession(request.id);
      const delayed = deferred<PhotoReviewPage>();
      const entered = deferred<void>();
      let signal: AbortSignal | undefined;
      let selection = request.id;
      let permissions = false;
      let draft = "old draft";
      let applied = 0;
      let errors = 0;
      let allCalls = 0;
      const slowRead = (value: AbortSignal) => {
        signal = value;
        entered.resolve();
        // Deliberately ignore abort, just as a response already queued may do.
        return delayed.promise;
      };
      const pending = old.refresh({
        loadCurrent: phase === "current" ? slowRead : async () => empty,
        loadAll: (value) => { allCalls++; return slowRead(value); },
        applyCurrent: () => { applied++; },
        applyLatest: (page, found) => {
          selection = found?.id ?? "none";
          permissions = page.canManage;
          draft = "reset by remount";
          applied++;
        },
        onError: () => { errors++; },
      });
      await entered.promise;
      const appliedBeforeClose = applied;
      old.cancel();
      const next = createPhotoReviewSession(nextId);
      selection = nextId;
      draft = "new reviewer draft";
      assert.equal(signal?.aborted, true);
      delayed.resolve(approved);
      assert.equal(await pending, null);
      assert.equal(selection, nextId);
      assert.equal(draft, "new reviewer draft");
      assert.equal(permissions, false);
      assert.equal(applied, appliedBeforeClose);
      assert.equal(errors, 0);
      assert.equal(allCalls, phase === "all" ? 1 : 0);

      // A 409 from the old dialog may arrive only after it was closed.
      await old.refresh({
        loadCurrent: async () => { assert.fail("closed session started a request"); },
        loadAll: async () => empty,
        applyCurrent: () => assert.fail("closed session applied data"),
        applyLatest: () => assert.fail("closed session changed selection"),
        onError: () => assert.fail("closed session reported an error"),
      });
      next.cancel();
    });
  }
}

test("newer refresh wins even when an aborted response arrives last", async () => {
  const session = createPhotoReviewSession(request.id);
  const delayed = deferred<PhotoReviewPage>();
  let oldSignal: AbortSignal | undefined;
  const statuses: string[] = [];
  const options = {
    loadAll: async () => empty,
    applyCurrent: () => {},
    applyLatest: (_page: PhotoReviewPage, found: typeof request | null) => {
      statuses.push(found?.status ?? "missing");
    },
    onError: () => assert.fail("obsolete error escaped"),
  };
  const old = session.refresh({
    ...options,
    loadCurrent: async (signal) => { oldSignal = signal; return delayed.promise; },
  });
  const latest = await session.refresh({ ...options, loadCurrent: async () => approved });
  assert.equal(latest?.status, "approved");
  assert.equal(oldSignal?.aborted, true);
  delayed.resolve({ ...approved, rows: [request] });
  assert.equal(await old, null);
  assert.deepEqual(statuses, ["approved"]);
});

test("current session refreshes filtered rows then returns terminal state and permissions", async () => {
  const session = createPhotoReviewSession(request.id);
  const calls: string[] = [];
  const found = await session.refresh({
    loadCurrent: async () => empty,
    loadAll: async (signal) => { assert.equal(signal.aborted, false); return approved; },
    applyCurrent: (page) => { assert.equal(page, empty); calls.push("list"); },
    applyLatest: (page, latest) => {
      assert.equal(page.canViewPreview, true);
      assert.equal(latest?.status, "approved");
      calls.push("selection");
    },
    onError: () => assert.fail("unexpected error"),
  });
  assert.equal(found?.status, "approved");
  assert.deepEqual(calls, ["list", "selection"]);
});

test("current fallback failure reports revocation, but errors after closing are discarded", async () => {
  for (const close of [false, true]) {
    const session = createPhotoReviewSession(request.id);
    const delayed = deferred<PhotoReviewPage>();
    const entered = deferred<void>();
    const forbidden = new Error("403 permissions revoked");
    const errors: unknown[] = [];
    const result = session.refresh({
      loadCurrent: async () => empty,
      loadAll: async () => { entered.resolve(); return delayed.promise; },
      applyCurrent: () => {},
      applyLatest: () => assert.fail("failed read applied permissions"),
      onError: (error) => errors.push(error),
    });
    await entered.promise;
    if (close) session.cancel();
    delayed.reject(forbidden);
    assert.equal(await result, null);
    assert.deepEqual(errors, close ? [] : [forbidden]);
  }
});

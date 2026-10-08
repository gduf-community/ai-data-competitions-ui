// Focused execution of the shipped portal handler, not a browser integration test.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/components/marketing/new-navbar.tsx", import.meta.url), "utf8");
const match = source.match(/async function handleSignOut\(\) \{([\s\S]*?)\n  \}/);
assert.ok(match, "portal logout handler exists");
function handler(signOut, navigation) {
  return vm.runInNewContext("(async function () {" + match[1] + "})", {
    signOut,
    window: { location: { assign: path => navigation.push(path) } },
  });
}

test("portal logout disables Auth.js redirects and ignores a private API callback origin", async () => {
  const calls = [], navigation = [];
  const logout = handler(async options => {
    calls.push(JSON.parse(JSON.stringify(options)));
    return { url: "http://private-api.example.invalid:3001/" };
  }, navigation);
  await logout();
  assert.deepEqual(calls, [{ redirect: false, callbackUrl: "/" }]);
  assert.deepEqual(navigation, ["/"]);
  assert.equal(new URL(navigation[0], "https://web.example.invalid/me").origin, "https://web.example.invalid");
});

test("portal logout waits for sign-out completion before navigating", async () => {
  let finish;
  const navigation = [];
  const logout = handler(() => new Promise(resolve => { finish = resolve; }), navigation);
  const pending = logout();
  assert.deepEqual(navigation, []);
  finish({ url: "http://private-api.example.invalid/" });
  await pending;
  assert.deepEqual(navigation, ["/"]);
});

test("portal logout does not navigate when sign-out rejects and supports retry", async () => {
  const navigation = [];
  let attempts = 0;
  const logout = handler(async () => {
    if (++attempts === 1) throw new Error("offline");
    return { url: "http://private-api.example.invalid/" };
  }, navigation);
  await assert.rejects(logout(), /offline/);
  assert.deepEqual(navigation, []);
  await logout();
  assert.deepEqual(navigation, ["/"]);
});

test("desktop and mobile portal logout controls share the tested handler", () => {
  assert.equal((source.match(/onClick=\{\(\) => void handleSignOut\(\)\}/g) || []).length, 2);
});

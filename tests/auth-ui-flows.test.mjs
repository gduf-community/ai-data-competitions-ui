// Execute the shipped source schemas and handlers with the pinned form libraries.
// These are focused source/library regressions, not browser or server integration tests.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFormControl } from "react-hook-form";

const resetPath = "../src/app/(auth)/reset-password/components/reset-password-form-1.tsx";
const navPath = "../src/components/nav-user.tsx";
const read = path => fs.readFileSync(new URL(path, import.meta.url), "utf8");
function parsed(path) {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function find(sf, predicate) {
  let found;
  function visit(node) {
    if (predicate(node)) found = node;
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(found, "source declaration exists");
  return found;
}
function evaluate(source, context) {
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(js, { Error, ...context });
}
function initializer(sf, name, context) {
  const node = find(sf, n => ts.isVariableDeclaration(n) && n.name.getText(sf) === name);
  return evaluate(`(${node.initializer.getText(sf)})`, context);
}
function handler(sf, name, context) {
  const node = find(sf, n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  return evaluate(`(${node.getText(sf)})`, context);
}
const reset = parsed(resetPath);
const nav = parsed(navPath);
const schema = initializer(reset, "resetPasswordFormSchema", { z });
const fields = {
  email: "synthetic-reset@example.invalid",
  verificationCode: "",
  password: "synthetic-password-105",
  confirmPassword: "synthetic-password-105",
};
function legacyMode(email, token) {
  const context = { searchParams: new URLSearchParams({ email, token }) };
  context.initialEmail = initializer(reset, "initialEmail", context);
  context.legacyToken = initializer(reset, "legacyToken", context);
  return initializer(reset, "usesLegacyLink", context);
}
function form(legacy, values = fields) {
  const control = createFormControl({ resolver: zodResolver(schema(legacy)), defaultValues: values });
  for (const name of ["email", "password", "confirmPassword", ...legacy ? [] : ["verificationCode"]]) control.register(name);
  return control;
}

test("legacy mode requires both a nonempty email and token", () => {
  assert.equal(legacyMode(" User@EXAMPLE.invalid ", " token "), true);
  for (const [email, token] of [["", "token"], ["user@example.invalid", ""], [" ", "token"], ["user@example.invalid", " "]]) {
    assert.equal(legacyMode(email, token), false);
  }
});

test("legacy hidden-code fields pass the actual RHF resolver and submit once", async () => {
  let submissions = 0;
  await form(true).handleSubmit(values => {
    submissions++;
    assert.deepEqual(values, fields);
  }, () => assert.fail("legacy link rejected"))();
  assert.equal(submissions, 1);
});

test("current code flow requires exactly six digits and still normalizes input", async () => {
  for (const code of ["", "12345", "1234567", "abcdef", "１２３４５６"]) {
    let errors;
    await form(false, { ...fields, verificationCode: code }).handleSubmit(
      () => assert.fail("invalid code submitted"), value => { errors = value; },
    )();
    assert.deepEqual(Object.keys(errors), ["verificationCode"]);
  }
  let submissions = 0;
  await form(false, { ...fields, email: " User@EXAMPLE.invalid ", verificationCode: " 123456 " }).handleSubmit(values => {
    submissions++;
    assert.equal(values.email, "user@example.invalid");
    assert.equal(values.verificationCode, "123456");
  })();
  assert.equal(submissions, 1);
});

test("email, password strength and confirmation remain required in both modes", () => {
  for (const legacy of [true, false]) {
    const valid = { ...fields, verificationCode: "123456" };
    for (const changes of [
      { email: "invalid" },
      { password: "short1", confirmPassword: "short1" },
      { password: "12345678", confirmPassword: "12345678" },
      { password: "abcdefgh", confirmPassword: "abcdefgh" },
      { confirmPassword: "different-password-105" },
    ]) assert.equal(schema(legacy).safeParse({ ...valid, ...changes }).success, false);
  }
});

test("the hidden-field branch uses the mode-aware resolver in the shipped form", () => {
  assert.match(reset.text, /resolver: zodResolver\(resetPasswordFormSchema\(usesLegacyLink\)\)/);
  assert.match(reset.text, /<form onSubmit=\{form\.handleSubmit\(onSubmit\)\}>/);
  assert.match(reset.text, /\{usesLegacyLink \? null : \(\s*<FormField\s*control=\{form\.control\}\s*name="verificationCode"/);
});

for (const legacy of [true, false]) {
  test(`${legacy ? "legacy token" : "current code"} submits the existing payload and redirects only on success`, async () => {
    const requests = [], navigation = [], success = [], pending = [];
    const onSubmit = handler(reset, "onSubmit", {
      usesLegacyLink: legacy, legacyToken: "synthetic-token",
      setSubmitting: value => pending.push(value),
      fetch: async (url, init) => {
        requests.push({ url, ...JSON.parse(init.body) });
        return { ok: true, json: async () => ({ message: "done" }) };
      },
      router: { push: path => navigation.push(path) },
      toast: { success: message => success.push(message), error: () => assert.fail("unexpected error") },
    });
    const values = { ...fields, verificationCode: legacy ? "" : "123456" };
    await form(legacy, values).handleSubmit(onSubmit)();
    assert.deepEqual(requests, [{ url: "/api/auth/reset-password", ...values, ...legacy ? { token: "synthetic-token" } : {} }]);
    assert.deepEqual(navigation, ["/sign-in"]);
    assert.deepEqual(success, ["done"]);
    assert.deepEqual(pending, [true, false]);
  });

  test(`${legacy ? "legacy token" : "current code"} failure preserves values and allows retry`, async () => {
    for (const failure of ["response", "network"]) {
      const errors = [], pending = [];
      let attempts = 0;
      const onSubmit = handler(reset, "onSubmit", {
        usesLegacyLink: legacy, legacyToken: "synthetic-expired-token",
        setSubmitting: value => pending.push(value),
        fetch: async () => {
          attempts++;
          if (failure === "network") throw new Error("network unavailable");
          return { ok: false, json: async () => ({ message: "expired or invalid" }) };
        },
        router: { push: () => assert.fail("failed reset navigated") },
        toast: { success: () => assert.fail("failed reset succeeded"), error: message => errors.push(message) },
      });
      const values = { ...fields, verificationCode: legacy ? "" : "123456" };
      const control = form(legacy, values);
      await control.handleSubmit(onSubmit)();
      assert.deepEqual(control.getValues(), values);
      await control.handleSubmit(onSubmit)();
      assert.equal(attempts, 2);
      assert.deepEqual(errors, Array(2).fill(failure === "network" ? "network unavailable" : "expired or invalid"));
      assert.deepEqual(pending, [true, false, true, false]);
    }
  });
}

test("admin logout uses an accessible disabled menu action rather than a sign-in link", () => {
  const item = find(nav, n => ts.isJsxElement(n) && n.openingElement.tagName.getText(nav) === "DropdownMenuItem" && n.getText(nav).includes("handleSignOut"));
  assert.match(item.getText(nav), /onSelect=\{\(\) => void handleSignOut\(\)\}/);
  assert.match(item.getText(nav), /disabled=\{isSigningOut\}/);
  assert.doesNotMatch(item.getText(nav), /<Link|asChild/);
  assert.match(nav.text, /import \{ signOut \} from "next-auth\/react"/);
});

test("admin logout calls Auth.js once during repeated activation and unlocks afterward", async () => {
  let finish;
  const calls = [], pending = [], navigation = [], signingOut = { current: false };
  const signOut = options => {
    calls.push(JSON.parse(JSON.stringify(options)));
    return new Promise(resolve => { finish = resolve; });
  };
  const logout = handler(nav, "handleSignOut", {
    signingOut, signOut, setIsSigningOut: value => pending.push(value),
    fetchClientSessionUser: async () => null,
    window: { location: { assign: path => navigation.push(path) } },
    toast: { error: () => assert.fail("unexpected logout failure") },
  });
  const first = logout();
  await logout();
  assert.deepEqual(calls, [{ redirect: false, callbackUrl: "/sign-in" }]);
  assert.equal(signingOut.current, true);
  assert.deepEqual(pending, [true]);
  finish();
  await first;
  assert.equal(signingOut.current, false);
  assert.deepEqual(navigation, ["/sign-in"]);
  assert.deepEqual(pending, [true, false]);
});

test("admin logout rejection is reported and another attempt is allowed", async () => {
  let attempts = 0;
  const errors = [], pending = [], signingOut = { current: false };
  const logout = handler(nav, "handleSignOut", {
    signingOut, setIsSigningOut: value => pending.push(value),
    signOut: async () => { attempts++; throw new Error("offline"); },
    toast: { error: message => errors.push(message) },
  });
  await logout();
  await logout();
  assert.equal(attempts, 2);
  assert.equal(errors.length, 2);
  assert.equal(signingOut.current, false);
  assert.deepEqual(pending, [true, false, true, false]);
});


test("resolved Auth.js responses cannot redirect while a session remains or cannot be verified", async () => {
  // Execute the installed Auth.js signOut implementation, including its non-2xx behavior.
  const authSource = fs.readFileSync(new URL("../node_modules/next-auth/react.js", import.meta.url), "utf8");
  const auth = ts.createSourceFile("react.js", authSource, ts.ScriptTarget.Latest, true);
  const declaration = find(auth, n => ts.isFunctionDeclaration(n) && n.name?.text === "signOut");
  const implementation = declaration.getText(auth).replace(/^export /, "");
  for (const status of [200, 403, 500]) {
    for (const session of ["active", "unavailable", "anonymous"]) {
      const navigation = [], errors = [], pending = [];
      const signOut = evaluate(`(${implementation})`, {
        URLSearchParams,
        __NEXTAUTH: { _getSession: async () => {} },
        apiBaseUrl: () => "/api/auth",
        getCsrfToken: async () => "synthetic-csrf",
        broadcast: () => ({ postMessage: () => {} }),
        fetch: async () => ({ ok: status === 200, status, json: async () => ({ url: "/sign-in" }) }),
        window: { location: { set href(_) { assert.fail("Auth.js redirected before verification"); } } },
      });
      const logout = handler(nav, "handleSignOut", {
        signingOut: { current: false }, signOut,
        setIsSigningOut: value => pending.push(value),
        fetchClientSessionUser: async () => {
          if (session === "unavailable") throw new Error("session API unavailable");
          return session === "active" ? { id: "synthetic-user" } : null;
        },
        window: { location: { assign: path => navigation.push(path) } },
        toast: { error: message => errors.push(message) },
      });
      await logout();
      assert.deepEqual(navigation, session === "anonymous" ? ["/sign-in"] : []);
      assert.equal(errors.length, session === "anonymous" ? 0 : 1);
      assert.deepEqual(pending, [true, false]);
    }
  }
});

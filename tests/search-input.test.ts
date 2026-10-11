import assert from "node:assert/strict";
import { test } from "node:test";
import { createSearchSubmission } from "../src/lib/search-input";
test("IME, debounce, immediate submit, clear and disposal", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: unknown[] = [];
  const controller = createSearchSubmission((...args) => calls.push(args));
  controller.compositionStart(); controller.change("数"); controller.submit();
  context.mock.timers.tick(1000); assert.equal(calls.length, 0);
  controller.compositionEnd("数学建模"); controller.change("数学建模");
  context.mock.timers.tick(249); assert.equal(calls.length, 0);
  context.mock.timers.tick(1); assert.deepEqual(calls, [["数学建模", "replace"]]);
  controller.change("C++"); context.mock.timers.tick(100); controller.submit();
  context.mock.timers.tick(500); assert.equal(calls.length, 2);
  controller.change("old"); controller.clear(); context.mock.timers.tick(500);
  assert.deepEqual(calls.at(-1), ["", "push"]); assert.equal(calls.length, 3);
  controller.change("late"); controller.cancel(); context.mock.timers.tick(500); assert.equal(calls.length, 3);
});

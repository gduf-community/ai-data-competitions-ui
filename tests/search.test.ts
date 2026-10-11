import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSearchText, parseSearchQuery, serializeSearchQuery, matchSearchText, searchInMemory, scoreSearchItem, escapeLikePattern } from "../src/lib/search";

const query = (q: string, mode = "fuzzy") => parseSearchQuery(new URLSearchParams({ q, mode }));
for (const [q, text, mode, score] of [
  ["ＣＵＭＣＭ", "CUMCM", "exact", 100], ["cumcm", "CUMCM 2026", "fuzzy", 80],
  ["cumcm", "CUMCM 2026", "exact", 0], ["数学   建模", "数学 建模", "exact", 0],
  ["  数学   建模  ", "数学建模竞赛", "fuzzy", 40], ["数学 数学 建模", "数学建模", "fuzzy", 40],
  ["a.b", "axb", "fuzzy", 0], ["a.b", "a.b入门", "fuzzy", 80],
  ["C++", "c++", "fuzzy", 100], ["[2026]", "[2026]", "fuzzy", 100],
  ["100%", "1000", "fuzzy", 0], ["_", "a_b", "fuzzy", 60],
  ["e\u0301", "é", "exact", 100], ["数学 建模", "数学竞赛", "fuzzy", 20],
  ["  ", "any", "fuzzy", 0], ["\\", "x\\y", "fuzzy", 60],
] as const) test(`literal fixture ${JSON.stringify([q, text, mode])}`, () => {
  assert.equal(matchSearchText(text, query(q, mode)), score);
});

test("strict query limits, duplicates and disabled regex", () => {
  for (const input of ["page=", "page=-1", "page=1.1", "page=Infinity", "page=1&page=2", "pageSize=51", "mode=bad", "mode=regex", "q=a&keyword=b", "page=1000001&pageSize=50"]) {
    assert.throws(() => parseSearchQuery(new URLSearchParams(input)));
  }
  assert.equal(query("x".repeat(256)).q.length, 256);
  assert.throws(() => query("x".repeat(257)));
  assert.throws(() => query("\ufdfa".repeat(30))); // NFKC expands this ligature.
  assert.equal(parseSearchQuery(new URLSearchParams("pageSize=200"), { maxPageSize: 200 }).pageSize, 200);
});

test("canonical URL roundtrip and idempotent normalization", () => {
  for (const text of ["C++ & [2026] # 100%", " 数学\t 建模 ", "e\u0301", "😀\u200b", "\ud800"]) {
    const parsed = query(text);
    const serialized = serializeSearchQuery({ ...parsed, page: 2 }, new URLSearchParams("year=2026&extra=ok"));
    assert.deepEqual(parseSearchQuery(serialized), { ...parsed, page: 2 });
    assert.equal(serialized.get("year"), "2026");
    assert.equal(serialized.get("extra"), "ok");
    assert.equal(normalizeSearchText(parsed.q), parsed.q);
  }
});

const fields = [{ key: "title", weight: 10, text: (item: { title: string }) => item.title }];
test("global ranking before paging, tie IDs, empty/out-of-range and immutability", () => {
  const items = ["e", "c", "a", "d", "b"].map(id => ({ id, title: "数学", date: 1 }));
  const config = { fields, id: (item: typeof items[number]) => item.id, compare: () => 0 };
  const search = (source: typeof items, page: number, q = "数学") => searchInMemory({ kind: "complete", items: source }, { ...query(q), page, pageSize: 2 }, config);
  assert.deepEqual(search(items, 2).items.map(hit => hit.item.id), ["c", "d"]);
  assert.deepEqual(search([...items].reverse(), 2), search(items, 2));
  assert.equal(search(items, 4).total, 5);
  assert.equal(search(items, 4).items.length, 0);
  assert.deepEqual(search(items, 1, "").items.map(hit => hit.score), [0, 0]);
  assert.deepEqual([1, 2, 3].flatMap(page => search(items, page).items.map(hit => hit.item.id)), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(items.map(item => item.id), ["e", "c", "a", "d", "b"]);
  assert.throws(() => search([items[0], items[0]], 1));
});

test("tokens and array values never combine across fields, score is max", () => {
  const hit = scoreSearchItem({ title: "数学", tags: ["建模", "数学"] }, query("数学 建模"), [
    ...fields, { key: "tags", weight: 3, text: item => item.tags },
  ]);
  assert.equal(hit.score, 200);
  assert.deepEqual(hit.matchedFields, ["title", "tags"]);
  assert.equal(escapeLikePattern("!%_\\"), "!!!%!_\\");
});

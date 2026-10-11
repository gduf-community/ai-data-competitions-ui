/** Grammar v1: case sensitive raw Unicode, no user flags or backtracking constructs. */
export const REGEX_LIMITS = { patternUnits: 128, atoms: 32, states: 64, repeat: 16, fieldPoints: 16_384, rows: 1_000, textBytes: 1_048_576 } as const;
export class RegexQueryError extends Error {
  constructor(public code: "INVALID_REGEX" | "REGEX_TOO_LONG" | "UNSUPPORTED_REGEX_SYNTAX" | "REGEX_CAPACITY_EXCEEDED", message: string) { super(message); }
}
type Atom = { kind: "literal" | "any" | "set"; value: string; min: number; max: number };
type Program = { start: boolean; end: boolean; atoms: Atom[]; postgres: string };
const special = ".[]\\^${}*+?()|-";
const literalSQL = (value: string) => Array.from(value).map(char => special.includes(char) ? "\\" + char : char).join("");

export function parseBoundedRegex(pattern: string): Program {
  if (pattern.length > REGEX_LIMITS.patternUnits) throw new RegexQueryError("REGEX_TOO_LONG", "正则表达式最多128个UTF-16单元。");
  const chars = Array.from(pattern);
  if (chars.some(char => char === "\0" || (char.codePointAt(0)! >= 0xd800 && char.codePointAt(0)! <= 0xdfff))) throw new RegexQueryError("INVALID_REGEX", "表达式包含不支持的字符。");
  let i = 0, states = 0;
  const start = chars[0] === "^";
  if (start) i++;
  const atoms: Atom[] = [];
  let end = false;
  const invalid = (): never => { throw new RegexQueryError("INVALID_REGEX", "正则表达式格式不合法。"); };
  const unsupported = (): never => { throw new RegexQueryError("UNSUPPORTED_REGEX_SYNTAX", "仅支持字面文本、首尾锚点、点、字符集合和0至16次有界重复。"); };
  const escaped = () => {
    i++;
    const char = chars[i++];
    if (!char) return invalid();
    if (!special.includes(char)) return unsupported();
    return char;
  };
  while (i < chars.length) {
    if (chars[i] === "$" && i === chars.length - 1) { end = true; i++; break; }
    let atom: Atom;
    const char = chars[i];
    if (char === "\\") atom = { kind: "literal", value: escaped(), min: 1, max: 1 };
    else if (char === ".") { i++; atom = { kind: "any", value: "", min: 1, max: 1 }; }
    else if (char === "[") {
      i++;
      const members: string[] = [];
      while (i < chars.length && chars[i] !== "]") {
        const member = chars[i] === "\\" ? escaped() : chars[i++];
        if (member === "-" || member === "^" || member === "[") return unsupported();
        members.push(member);
        if (members.length > 16) return unsupported();
      }
      if (chars[i++] !== "]" || !members.length) return invalid();
      atom = { kind: "set", value: members.join(""), min: 1, max: 1 };
    } else {
      if (special.includes(char) && char !== "-") return unsupported();
      i++; atom = { kind: "literal", value: char, min: 1, max: 1 };
    }
    if (chars[i] === "{") {
      i++;
      let lower = "", upper = "";
      while (i < chars.length && chars[i] >= "0" && chars[i] <= "9") lower += chars[i++];
      if (chars[i] === ",") { i++; while (i < chars.length && chars[i] >= "0" && chars[i] <= "9") upper += chars[i++]; if (!upper) return unsupported(); }
      else upper = lower;
      if (!lower || chars[i++] !== "}") return invalid();
      atom.min = Number(lower); atom.max = Number(upper);
      if (atom.min > atom.max || atom.max > REGEX_LIMITS.repeat) return unsupported();
    }
    states += atom.max;
    atoms.push(atom);
    if (atoms.length > REGEX_LIMITS.atoms || states > REGEX_LIMITS.states) return unsupported();
  }
  const postgres = (start ? "\\A" : "") + atoms.map(atom => {
    const value = atom.kind === "any" ? "." : atom.kind === "literal" ? literalSQL(atom.value)
      : "(?:" + Array.from(atom.value).map(literalSQL).join("|") + ")";
    return value + (atom.min === 1 && atom.max === 1 ? "" : `{${atom.min},${atom.max}}`);
  }).join("") + (end ? "\\Z" : "");
  return { start, end, atoms, postgres };
}

/** Finite-state simulation, O(text points * <=64 states), no native RegExp. */
export function matchBoundedRegex(program: Program, text: string): boolean {
  const chars = Array.from(text);
  if (chars.length > REGEX_LIMITS.fieldPoints) throw new RegexQueryError("REGEX_CAPACITY_EXCEEDED", "搜索字段超过正则资源上限。");
  const tokens = program.atoms.flatMap(atom => Array.from({ length: atom.max }, (_, index) => ({ ...atom, optional: index >= atom.min })));
  let reachable = new Uint8Array(tokens.length + 1);
  reachable[0] = 1;
  for (let position = 0; position <= chars.length; position++) {
    if (!program.start) reachable[0] = 1;
    for (let state = 0; state < tokens.length; state++) if (reachable[state] && tokens[state].optional) reachable[state + 1] = 1;
    if (reachable[tokens.length] && (!program.end || position === chars.length)) return true;
    const next = new Uint8Array(tokens.length + 1);
    if (position < chars.length) for (let state = 0; state < tokens.length; state++) {
      const token = tokens[state];
      if (reachable[state] && (token.kind === "any" || (token.kind === "literal" ? token.value === chars[position] : token.value.includes(chars[position])))) next[state + 1] = 1;
    }
    reachable = next;
  }
  return false;
}

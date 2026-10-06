

import type { SqlConsoleFieldSchema, SqlConsoleQueryDraft, SqlConsoleWhereCondition } from "@/lib/admin/sql-console-types";

export const initialQueryDraft: SqlConsoleQueryDraft = {
  select: [],
  from: null,
  joins: [],
  where: [],
  groupBy: [],
  having: [],
  orderBy: [],
  limit: 100,
};

export const operatorOptions: Array<SqlConsoleWhereCondition["operator"]> = [
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "like",
  "in",
  "not in",
  "between",
  "is null",
  "is not null",
];

export const permissionLabelMap: Record<SqlConsoleFieldSchema["permission"], string> = {
  queryable: "可查询",
  masked: "脱敏",
  aggregate_only: "仅聚合",
  join_only: "仅关联",
  restricted: "受限",
  forbidden: "禁止",
};

export const permissionClassMap: Record<SqlConsoleFieldSchema["permission"], string> = {
  queryable: "border-emerald-200 bg-emerald-50 text-emerald-700",
  masked: "border-sky-200 bg-sky-50 text-sky-700",
  aggregate_only: "border-amber-200 bg-amber-50 text-amber-700",
  join_only: "border-slate-200 bg-slate-50 text-slate-700",
  restricted: "border-zinc-200 bg-zinc-50 text-zinc-700",
  forbidden: "border-rose-200 bg-rose-50 text-rose-700",
};

export function makeFieldRef(field: SqlConsoleFieldSchema) {
  return `${field.tableName}.${field.fieldName}`;
}

export function canUseIn(field: SqlConsoleFieldSchema, clause: SqlConsoleFieldSchema["allowedIn"][number]) {
  return field.allowedIn.includes(clause);
}

export function parseAggregateAlias(expression: string) {
  const match = expression.trim().match(/\s+as\s+([a-z_][a-z0-9_]*)$/i);
  return match?.[1] ?? null;
}

export function parseJoinOn(on: string) {
  const match = on.match(
    /^([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\s*=\s*([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)$/i,
  );
  if (!match) {
    return { left: "", right: "" };
  }
  return {
    left: match[1],
    right: match[2],
  };
}

export function buildJoinOn(left: string, right: string) {
  if (!left || !right) return "";
  return `${left} = ${right}`;
}

export function quoteValue(value: unknown) {
  if (value == null || value === "") return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildConditionSql(conditions: SqlConsoleWhereCondition[]) {
  return conditions
    .map((item, index) => {
      const prefix = index === 0 ? "" : `${item.logic ?? "AND"} `;
      if (item.operator === "is null" || item.operator === "is not null") {
        return `${prefix}${item.field} ${item.operator.toUpperCase()}`;
      }
      if (item.operator === "between") {
        return `${prefix}${item.field} BETWEEN ${quoteValue(item.value)} AND ${quoteValue(item.secondValue)}`;
      }
      if (item.operator === "in" || item.operator === "not in") {
        const values = Array.isArray(item.value)
          ? item.value
          : String(item.value ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean);
        return `${prefix}${item.field} ${item.operator.toUpperCase()} (${values.map((value) => quoteValue(value)).join(", ")})`;
      }
      return `${prefix}${item.field} ${item.operator} ${quoteValue(item.value)}`;
    })
    .join(" ");
}

export function buildLocalSqlPreview(query: SqlConsoleQueryDraft) {
  const joinSql = query.joins
    .map((join) => `${join.type.toUpperCase()} JOIN ${join.table || "-- 请选择关联表 --"} ON ${join.on || "-- 配置 ON 条件 --"}`)
    .join("\n");
  const whereSql = buildConditionSql(query.where);
  const havingSql = buildConditionSql(query.having);
  const orderSql = query.orderBy
    .map((item) => `${item.field} ${item.direction.toUpperCase()}`)
    .join(", ");

  return [
    `SELECT ${query.select.length > 0 ? query.select.join(", ") : "-- 自动使用默认安全字段 --"}`,
    `FROM ${query.from ?? "-- 请选择视图 --"}`,
    joinSql,
    whereSql ? `WHERE ${whereSql}` : "",
    query.groupBy.length > 0 ? `GROUP BY ${query.groupBy.join(", ")}` : "",
    havingSql ? `HAVING ${havingSql}` : "",
    orderSql ? `ORDER BY ${orderSql}` : "",
    `LIMIT ${query.limit || 100}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseValueFromText(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (!Number.isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

export function makeCondition(field: string): SqlConsoleWhereCondition {
  return {
    field,
    operator: "=",
    value: "",
    logic: "AND",
  };
}
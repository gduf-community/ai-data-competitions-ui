import { z } from "zod";

export type SqlConsoleFieldPermission =
  | "queryable"
  | "masked"
  | "aggregate_only"
  | "join_only"
  | "restricted"
  | "forbidden";

export type SqlConsoleFieldType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "json"
  | "unknown";

export type SqlConsoleAllowedClause =
  | "select"
  | "where"
  | "groupBy"
  | "orderBy"
  | "join";

export type SqlConsoleFilterOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "like"
  | "in"
  | "not in"
  | "between"
  | "is null"
  | "is not null";

export interface SqlConsoleFieldSchema {
  tableName: string;
  fieldName: string;
  label: string;
  type: SqlConsoleFieldType;
  description?: string;
  permission: SqlConsoleFieldPermission;
  allowedIn: SqlConsoleAllowedClause[];
}

export interface SqlConsoleTableSchema {
  tableName: string;
  label: string;
  category: string;
  description: string;
  fields: SqlConsoleFieldSchema[];
  defaultSelect: string[];
  defaultOrderBy?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
}

export interface SqlConsoleWhereCondition {
  field: string;
  operator: SqlConsoleFilterOperator;
  value?: string | number | boolean | null | Array<string | number | boolean>;
  secondValue?: string | number | boolean | null;
  logic?: "AND" | "OR";
}

export interface SqlConsoleJoinClause {
  type: "left" | "inner";
  table: string;
  on: string;
}

export interface SqlConsoleOrderByClause {
  field: string;
  direction: "asc" | "desc";
}

export interface SqlConsoleQueryDraft {
  select: string[];
  from: string | null;
  joins: SqlConsoleJoinClause[];
  where: SqlConsoleWhereCondition[];
  groupBy: string[];
  having: SqlConsoleWhereCondition[];
  orderBy: SqlConsoleOrderByClause[];
  limit: number;
}

export interface SqlConsoleValidationResult {
  valid: boolean;
  sql: string;
  warnings: string[];
  errors: string[];
}

export interface SqlConsoleQueryResultColumn {
  key: string;
  label: string;
  type: SqlConsoleFieldType;
}

export interface SqlConsoleQueryResult {
  columns: SqlConsoleQueryResultColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  elapsedMs: number;
  truncated: boolean;
}

export interface SqlConsoleSchemaPayload {
  tables: SqlConsoleTableSchema[];
  roleTables: string[];
  maxLimit: number;
}

const sqlConsoleScalarSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const sqlConsoleConditionSchema = z
  .object({
    field: z.string().trim().min(1).max(200),
    operator: z.enum([
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
    ]),
    value: z
      .union([
        sqlConsoleScalarSchema,
        z
          .array(z.union([z.string().max(500), z.number().finite(), z.boolean()]))
          .max(100),
      ])
      .optional(),
    secondValue: sqlConsoleScalarSchema.optional(),
    logic: z.enum(["AND", "OR"]).optional(),
  })
  .strict();

export const sqlConsoleQueryDraftSchema = z
  .object({
    select: z.array(z.string().trim().min(1).max(300)).max(100),
    from: z.string().trim().min(1).max(120).nullable(),
    joins: z
      .array(
        z
          .object({
            type: z.enum(["left", "inner"]),
            table: z.string().trim().min(1).max(120),
            on: z.string().trim().min(1).max(500),
          })
          .strict(),
      )
      .max(10),
    where: z.array(sqlConsoleConditionSchema).max(100),
    groupBy: z.array(z.string().trim().min(1).max(200)).max(100),
    having: z.array(sqlConsoleConditionSchema).max(100),
    orderBy: z
      .array(
        z
          .object({
            field: z.string().trim().min(1).max(200),
            direction: z.enum(["asc", "desc"]),
          })
          .strict(),
      )
      .max(100),
    limit: z.number().int().min(1).max(1000),
  })
  .strict() satisfies z.ZodType<SqlConsoleQueryDraft>;

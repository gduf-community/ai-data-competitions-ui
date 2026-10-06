"use client";
import { useEffect, useMemo, useState, useRef } from "react";

import { toast } from "@/lib/i18n/toast";
import type { SqlConsoleFieldSchema, SqlConsoleJoinClause, SqlConsoleQueryDraft, SqlConsoleQueryResult, SqlConsoleSchemaPayload, SqlConsoleTableSchema, SqlConsoleValidationResult } from "@/lib/admin/sql-console-types";

import { initialQueryDraft, makeFieldRef, canUseIn, parseAggregateAlias, buildJoinOn, buildLocalSqlPreview, makeCondition } from "./query-draft";
import { requestJSON, HttpRequestError, isAbortError } from "@/lib/http-client";

export function useSqlConsole() {
  const [schemaPayload, setSchemaPayload] = useState<SqlConsoleSchemaPayload | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaSearch, setSchemaSearch] = useState("");
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [queryDraft, setQueryDraft] = useState<SqlConsoleQueryDraft>(initialQueryDraft);
  const [aggregateInput, setAggregateInput] = useState("count(*) as total");
  const [validation, setValidation] = useState<SqlConsoleValidationResult | null>(null);
  const [queryResult, setQueryResult] = useState<SqlConsoleQueryResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [running, setRunning] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaRevision, setSchemaRevision] = useState(0);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const request = useRef<{ id: number; controller?: AbortController }>({ id: 0 });

  useEffect(() => {
    const controller = new AbortController();
    void requestJSON<SqlConsoleSchemaPayload>("/api/admin/analytics/schema", {cache:"no-store",signal:controller.signal})
      .then(payload => {
        if (controller.signal.aborted) return;
        setSchemaPayload(payload);
        const firstTable = payload.tables[0]?.tableName ?? null;
        setSelectedTableName(firstTable);
        setQueryDraft(current => ({...current,from:current.from ?? firstTable}));
        setSchemaError(null);
      }).catch((error:unknown) => {
        if (!controller.signal.aborted) setSchemaError(error instanceof Error ? error.message : "加载白名单失败");
      }).finally(() => { if (!controller.signal.aborted) setSchemaLoading(false); });
    return () => controller.abort();
  }, [schemaRevision]);

  useEffect(() => {
    const currentRequest = request;
    return () => { currentRequest.current.id++; currentRequest.current.controller?.abort(); };
  }, []);

  const reloadSchema = () => { setSchemaLoading(true); setSchemaError(null); setSchemaRevision(value=>value+1); };
  const invalidateRequest = () => {
    request.current.id++;
    request.current.controller?.abort();
    setValidating(false); setRunning(false);
    setValidation(null); setQueryResult(null); setRequestStatus(null);
  };
  const cancelQuery = () => { invalidateRequest(); setRequestStatus("已停止等待；服务器可能仍在处理查询。"); };
  const tables = useMemo(() => schemaPayload?.tables ?? [], [schemaPayload]);

  const filteredTables = useMemo(() => {
    const keyword = schemaSearch.trim().toLowerCase();
    if (!keyword) {
      return tables;
    }
    return tables.filter((table) => {
      const tableHit =
        table.tableName.toLowerCase().includes(keyword) ||
        table.label.toLowerCase().includes(keyword) ||
        table.category.toLowerCase().includes(keyword) ||
        table.description.toLowerCase().includes(keyword);
      if (tableHit) return true;
      return table.fields.some((field) =>
        `${field.fieldName} ${field.label} ${field.description ?? ""}`
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [schemaSearch, tables]);

  const groupedTables = useMemo(() => {
    const map = new Map<string, SqlConsoleTableSchema[]>();
    for (const table of filteredTables) {
      const bucket = map.get(table.category) ?? [];
      bucket.push(table);
      map.set(table.category, bucket);
    }
    return [...map.entries()];
  }, [filteredTables]);

  const currentTable =
    tables.find((table) => table.tableName === selectedTableName) ??
    tables.find((table) => table.tableName === queryDraft.from) ??
    null;

  const currentTableFields = currentTable?.fields ?? [];

  const queryTableNames = useMemo(() => {
    const next = new Set<string>();
    if (queryDraft.from) next.add(queryDraft.from);
    for (const join of queryDraft.joins) {
      if (join.table) next.add(join.table);
    }
    return [...next];
  }, [queryDraft.from, queryDraft.joins]);

  const queryTables = useMemo(
    () => tables.filter((table) => queryTableNames.includes(table.tableName)),
    [queryTableNames, tables],
  );

  const queryFields = useMemo(
    () => queryTables.flatMap((table) => table.fields),
    [queryTables],
  );

  const queryFieldMap = useMemo(
    () => new Map(queryFields.map((field) => [makeFieldRef(field), field] as const)),
    [queryFields],
  );

  const selectableFields = useMemo(
    () => queryFields.filter((field) => canUseIn(field, "select")),
    [queryFields],
  );
  const whereFields = useMemo(
    () => queryFields.filter((field) => canUseIn(field, "where")),
    [queryFields],
  );
  const groupableFields = useMemo(
    () => queryFields.filter((field) => canUseIn(field, "groupBy")),
    [queryFields],
  );
  const joinableFields = useMemo(
    () => queryFields.filter((field) => canUseIn(field, "join")),
    [queryFields],
  );

  const aggregateAliases = useMemo(
    () =>
      queryDraft.select
        .map((item) => parseAggregateAlias(item))
        .filter((item): item is string => Boolean(item)),
    [queryDraft.select],
  );

  const havingFieldOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const fieldRef of queryDraft.groupBy) {
      const field = queryFieldMap.get(fieldRef);
      if (field) {
        options.set(fieldRef, `${field.label} (${fieldRef})`);
      }
    }
    for (const alias of aggregateAliases) {
      options.set(alias, `${alias} (聚合结果)`);
    }
    return [...options.entries()].map(([value, label]) => ({ value, label }));
  }, [aggregateAliases, queryDraft.groupBy, queryFieldMap]);

  const orderFieldOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of queryDraft.select) {
      const alias = parseAggregateAlias(item);
      const field = queryFieldMap.get(item);
      if (alias) {
        options.set(alias, `${alias} (聚合结果)`);
      } else if (field) {
        options.set(item, `${field.label} (${item})`);
      }
    }
    for (const item of queryDraft.groupBy) {
      const field = queryFieldMap.get(item);
      if (field) {
        options.set(item, `${field.label} (${item})`);
      }
    }
    return [...options.entries()].map(([value, label]) => ({ value, label }));
  }, [queryDraft.groupBy, queryDraft.select, queryFieldMap]);

  const previewSql = validation?.sql ?? buildLocalSqlPreview(queryDraft);
  const updateQueryDraft = (updater: (draft: SqlConsoleQueryDraft) => SqlConsoleQueryDraft) => {
    invalidateRequest();
    setQueryDraft((current) => updater(current));
  };

  const handleSwitchTable = (tableName: string) => {
    setSelectedTableName(tableName);
    updateQueryDraft(() => ({
      ...initialQueryDraft,
      from: tableName,
      limit: schemaPayload?.maxLimit ? Math.min(100, schemaPayload.maxLimit) : 100,
    }));
    setQueryResult(null);
  };

  const addSelectExpression = (expression: string) => {
    const normalized = expression.trim();
    if (!normalized) return;
    updateQueryDraft((current) => ({
      ...current,
      select: current.select.includes(normalized)
        ? current.select
        : [...current.select, normalized],
    }));
  };

  const addWhereCondition = (field: SqlConsoleFieldSchema) => {
    updateQueryDraft((current) => ({
      ...current,
      where: [
        ...current.where,
        {
          field: makeFieldRef(field),
          operator: field.type === "date" ? ">=" : "=",
          value: field.type === "boolean" ? true : "",
          logic: current.where.length === 0 ? "AND" : "AND",
        },
      ],
    }));
  };

  const addGroupByField = (field: SqlConsoleFieldSchema) => {
    const fieldRef = makeFieldRef(field);
    updateQueryDraft((current) => ({
      ...current,
      groupBy: current.groupBy.includes(fieldRef)
        ? current.groupBy
        : [...current.groupBy, fieldRef],
    }));
  };

  const addOrderByField = (field: SqlConsoleFieldSchema) => {
    const fieldRef = makeFieldRef(field);
    updateQueryDraft((current) => ({
      ...current,
      orderBy: current.orderBy.some((item) => item.field === fieldRef)
        ? current.orderBy
        : [...current.orderBy, { field: fieldRef, direction: "desc" }],
    }));
  };

  const addJoinClause = () => {
    const usedTableNames = new Set(queryTableNames);
    const candidateTable = tables.find(
      (table) =>
        !usedTableNames.has(table.tableName) &&
        table.fields.some((field) => canUseIn(field, "join")),
    );
    if (!candidateTable) {
      toast.error("没有可继续关联的白名单视图。");
      return;
    }

    const leftField =
      joinableFields.find((field) => field.fieldName === "competition_id") ??
      joinableFields[0];
    const rightJoinFields = candidateTable.fields.filter((field) => canUseIn(field, "join"));
    const rightField =
      rightJoinFields.find((field) => field.fieldName === leftField?.fieldName) ??
      rightJoinFields[0];

    if (!leftField || !rightField) {
      toast.error("当前查询范围内没有可用于 JOIN 的字段。");
      return;
    }

    const join: SqlConsoleJoinClause = {
      type: "left",
      table: candidateTable.tableName,
      on: buildJoinOn(makeFieldRef(leftField), makeFieldRef(rightField)),
    };

    updateQueryDraft((current) => ({
      ...current,
      joins: [...current.joins, join],
    }));
  };

  const updateJoinClause = (
    index: number,
    updater: (join: SqlConsoleJoinClause) => SqlConsoleJoinClause,
  ) => {
    updateQueryDraft((current) => ({
      ...current,
      joins: current.joins.map((join, joinIndex) =>
        joinIndex === index ? updater(join) : join,
      ),
    }));
  };

  const addHavingCondition = () => {
    const firstField = havingFieldOptions[0]?.value;
    if (!firstField) {
      toast.error("请先添加 GROUP BY 字段或聚合别名，再配置 HAVING。");
      return;
    }
    updateQueryDraft((current) => ({
      ...current,
      having: [
        ...current.having,
        {
          ...makeCondition(firstField),
          logic: current.having.length === 0 ? "AND" : "AND",
        },
      ],
    }));
  };

  const addOrderByEntry = () => {
    const firstField = orderFieldOptions[0]?.value;
    if (!firstField) {
      toast.error("请先选择 SELECT 或 GROUP BY 字段，再添加 ORDER BY。");
      return;
    }
    updateQueryDraft((current) => ({
      ...current,
      orderBy: [...current.orderBy, { field: firstField, direction: "desc" }],
    }));
  };

  const submitQuery = async (kind: "validate" | "run") => {
    invalidateRequest();
    const controller = new AbortController();
    request.current.controller = controller;
    const id = request.current.id;
    const snapshot = JSON.stringify(queryDraft);
    if (kind === "validate") setValidating(true); else setRunning(true);
    try {
      const payload = await requestJSON<SqlConsoleValidationResult | SqlConsoleQueryResult>("/api/admin/analytics/sql/" + kind, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:snapshot, signal:controller.signal,
      });
      if (id !== request.current.id || controller.signal.aborted) return;
      if (kind === "validate") { setValidation(payload as SqlConsoleValidationResult); toast.success("SQL 校验通过"); }
      else { setQueryResult(payload as SqlConsoleQueryResult); toast.success("查询完成"); }
    } catch (error) {
      if (id !== request.current.id || controller.signal.aborted || isAbortError(error)) return;
      if (error instanceof HttpRequestError && error.payload && typeof error.payload === "object" && "errors" in error.payload) {
        const validationError = error.payload as SqlConsoleValidationResult;
        setValidation(validationError);
        toast.error(validationError.errors?.[0] ?? error.message);
      } else toast.error(error instanceof Error ? error.message : "查询失败");
    } finally {
      if (id === request.current.id && !controller.signal.aborted) { setValidating(false); setRunning(false); }
    }
  };
  const runValidation = () => submitQuery("validate");
  const runQuery = () => submitQuery("run");

  const resetQuery = () => {
    invalidateRequest();
    setQueryDraft({
      ...initialQueryDraft,
      from: currentTable?.tableName ?? null,
    });
    setValidation(null);
    setQueryResult(null);
  };

  const copySql = async () => {
    await navigator.clipboard.writeText(previewSql);
    toast.success("SQL 已复制");
  };

  return {
    schemaLoading,
    schemaError,
    reloadSchema,
    tables,
    queryResult,
    schemaSearch,
    setSchemaSearch,
    groupedTables,
    currentTable,
    currentTableFields,
    handleSwitchTable,
    addSelectExpression,
    addWhereCondition,
    addGroupByField,
    addOrderByField,
    schemaPayload,
    queryDraft,
    aggregateInput,
    setAggregateInput,
    validation,
    validating,
    running,
    requestStatus,
    cancelQuery,
    queryTableNames,
    queryFields,
    selectableFields,
    whereFields,
    groupableFields,
    havingFieldOptions,
    orderFieldOptions,
    previewSql,
    updateQueryDraft,
    addJoinClause,
    updateJoinClause,
    addHavingCondition,
    addOrderByEntry,
    runValidation,
    runQuery,
    resetQuery,
    copySql
  };
}

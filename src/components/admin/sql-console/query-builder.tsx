"use client";

import { Copy, Loader2, Play, RefreshCw, Search } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import type { SqlConsoleWhereCondition } from "@/lib/admin/sql-console-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { operatorOptions, permissionLabelMap, permissionClassMap, makeFieldRef, canUseIn, parseJoinOn, buildJoinOn, parseValueFromText } from "./query-draft";
import type { useSqlConsole } from "./use-sql-console";

export function SqlConsoleBrowser({model}:{model:ReturnType<typeof useSqlConsole>}) {
  const {schemaSearch, setSchemaSearch, groupedTables, currentTable, currentTableFields, handleSwitchTable, addSelectExpression, addWhereCondition, addGroupByField, addOrderByField} = model;
  return (      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>视图浏览器</CardTitle>
          <CardDescription>搜索可查询视图编号、字段编号和中文含义，并一键加入结构化查询。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={schemaSearch}
              onChange={(event) => setSchemaSearch(event.target.value)}
              placeholder="搜索视图编号 / 字段编号 / 中文含义"
              className="pl-9"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <ScrollArea className="h-[400px] rounded-lg border border-border/60">
              <div className="space-y-4 p-3">
                {groupedTables.map(([category, categoryTables]) => (
                  <div key={category} className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {category}
                    </div>
                    {categoryTables.map((table) => (
                      <button
                        key={table.tableName}
                        type="button"
                        onClick={() => handleSwitchTable(table.tableName)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                          currentTable?.tableName === table.tableName
                            ? "border-primary bg-primary/5"
                            : "border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <div className="font-medium text-sm">{table.label}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{table.tableName}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {currentTable ? (
              <div className="space-y-3">
                <div>
                  <div className="font-medium">{currentTable.label}</div>
                  <div className="text-xs text-muted-foreground">{currentTable.description}</div>
                </div>
                <ScrollArea className="h-[360px] rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>字段</TableHead>
                        <TableHead>权限</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTableFields.map((field) => (
                        <TableRow key={makeFieldRef(field)}>
                          <TableCell className="align-top">
                            <div className="font-medium">{field.label}</div>
                            <div className="text-xs text-muted-foreground">{field.fieldName}</div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className={permissionClassMap[field.permission]}>
                              {permissionLabelMap[field.permission]}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addSelectExpression(makeFieldRef(field))}
                                disabled={!canUseIn(field, "select")}
                              >
                                + SELECT
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addWhereCondition(field)}
                                disabled={!canUseIn(field, "where")}
                              >
                                + WHERE
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addGroupByField(field)}
                                disabled={!canUseIn(field, "groupBy")}
                              >
                                + GROUP BY
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addOrderByField(field)}
                                disabled={!canUseIn(field, "orderBy")}
                              >
                                + ORDER BY
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                从左侧选择一张表查看字段详情
              </div>
            )}
          </div>
        </CardContent>
      </Card>

);
}

export function SqlConsoleBuilder({model}:{model:ReturnType<typeof useSqlConsole>}) {
  const {schemaPayload, queryDraft, aggregateInput, setAggregateInput, validation, validating, running, requestStatus, cancelQuery, tables, queryTableNames, queryFields, selectableFields, whereFields, groupableFields, havingFieldOptions, orderFieldOptions, previewSql, updateQueryDraft, handleSwitchTable, addSelectExpression, addWhereCondition, addJoinClause, updateJoinClause, addHavingCondition, addOrderByEntry, runValidation, runQuery, resetQuery, copySql} = model;
  return (      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>结构化查询编辑器</CardTitle>
          <CardDescription>页面允许留空，最终以服务端校验与生成结果为准。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="sql-from">FROM</Label>
                <select
                  id="sql-from"
                  value={queryDraft.from ?? ""}
                  onChange={(event) => handleSwitchTable(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {tables.map((table) => (
                    <option key={table.tableName} value={table.tableName}>
                      {table.label} ({table.tableName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>SELECT</Label>
                  <div className="text-xs text-muted-foreground">
                    当前查询范围字段数：{selectableFields.length}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 rounded-lg border border-border/60 p-3">
                  {queryDraft.select.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      当前为空，执行时将自动使用该视图的默认安全字段。
                    </div>
                  ) : (
                    queryDraft.select.map((item) => (
                      <Badge key={item} variant="secondary" className="gap-2 px-3 py-1">
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQueryDraft((current) => ({
                              ...current,
                              select: current.select.filter((candidate) => candidate !== item),
                            }))
                          }
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex flex-col gap-2 md:flex-row">
                  <Input
                    value={aggregateInput}
                    onChange={(event) => setAggregateInput(event.target.value)}
                    placeholder="例如：count(*) as total"
                  />
                  <Button variant="outline" onClick={() => addSelectExpression(aggregateInput)}>
                    添加聚合表达式
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>JOIN</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addJoinClause}>
                    添加 JOIN
                  </Button>
                </div>
                <div className="space-y-3 rounded-lg border border-border/60 p-3">
                  {queryDraft.joins.length === 0 ? (
                    <div className="text-sm text-muted-foreground">未添加关联视图。</div>
                  ) : (
                    queryDraft.joins.map((join, index) => {
                      const parsed = parseJoinOn(join.on);
                      const existingTableNames = [
                        queryDraft.from,
                        ...queryDraft.joins.slice(0, index).map((item) => item.table),
                      ].filter((item): item is string => Boolean(item));
                      const existingFields = tables
                        .filter((table) => existingTableNames.includes(table.tableName))
                        .flatMap((table) => table.fields)
                        .filter((field) => canUseIn(field, "join"));
                      const rightTable = tables.find((table) => table.tableName === join.table) ?? null;
                      const rightFields =
                        rightTable?.fields.filter((field) => canUseIn(field, "join")) ?? [];
                      const selectableJoinTables = tables.filter(
                        (table) =>
                          ![
                            queryDraft.from,
                            ...queryDraft.joins
                              .filter((_, joinIndex) => joinIndex !== index)
                              .map((item) => item.table),
                          ]
                            .filter(Boolean)
                            .includes(table.tableName) &&
                          table.fields.some((field) => canUseIn(field, "join")),
                      );

                      return (
                        <div
                          key={`${join.table}-${index}`}
                          className="grid gap-2 rounded-lg border border-border/60 p-3 lg:grid-cols-[110px_220px_1fr_1fr_48px]"
                        >
                          <select
                            value={join.type}
                            onChange={(event) =>
                              updateJoinClause(index, (current) => ({
                                ...current,
                                type: event.target.value as "left" | "inner",
                              }))
                            }
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="left">LEFT</option>
                            <option value="inner">INNER</option>
                          </select>
                          <select
                            value={join.table}
                            onChange={(event) => {
                              const nextTableName = event.target.value;
                              const nextTable = tables.find((table) => table.tableName === nextTableName);
                              const nextRightFields =
                                nextTable?.fields.filter((field) => canUseIn(field, "join")) ?? [];
                              const nextRightField =
                                nextRightFields.find((field) => field.fieldName === "competition_id") ??
                                nextRightFields[0];
                              const leftField =
                                existingFields.find((field) => makeFieldRef(field) === parsed.left) ??
                                existingFields.find((field) => field.fieldName === nextRightField?.fieldName) ??
                                existingFields[0];

                              updateJoinClause(index, (current) => ({
                                ...current,
                                table: nextTableName,
                                on: buildJoinOn(
                                  leftField ? makeFieldRef(leftField) : "",
                                  nextRightField ? makeFieldRef(nextRightField) : "",
                                ),
                              }));
                            }}
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {selectableJoinTables.map((table) => (
                              <option key={table.tableName} value={table.tableName}>
                                {table.label} ({table.tableName})
                              </option>
                            ))}
                          </select>
                          <select
                            value={parsed.left}
                            onChange={(event) =>
                              updateJoinClause(index, (current) => ({
                                ...current,
                                on: buildJoinOn(event.target.value, parseJoinOn(current.on).right),
                              }))
                            }
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {existingFields.map((field) => (
                              <option key={makeFieldRef(field)} value={makeFieldRef(field)}>
                                {field.label} ({makeFieldRef(field)})
                              </option>
                            ))}
                          </select>
                          <select
                            value={parsed.right}
                            onChange={(event) =>
                              updateJoinClause(index, (current) => ({
                                ...current,
                                on: buildJoinOn(parseJoinOn(current.on).left, event.target.value),
                              }))
                            }
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {rightFields.map((field) => (
                              <option key={makeFieldRef(field)} value={makeFieldRef(field)}>
                                {field.label} ({makeFieldRef(field)})
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateQueryDraft((current) => ({
                                ...current,
                                joins: current.joins.filter((_, joinIndex) => joinIndex !== index),
                              }))
                            }
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>WHERE</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const firstField = whereFields[0];
                      if (!firstField) {
                        toast.error("当前查询范围内没有可用于 WHERE 的字段。");
                        return;
                      }
                      addWhereCondition(firstField);
                    }}
                  >
                    添加条件
                  </Button>
                </div>
                <div className="space-y-3 rounded-lg border border-border/60 p-3">
                  {queryDraft.where.length === 0 ? (
                    <div className="text-sm text-muted-foreground">未添加筛选条件。</div>
                  ) : (
                    queryDraft.where.map((condition, index) => (
                      <div
                        key={`${condition.field}-${index}`}
                        className="grid gap-2 rounded-lg border border-border/60 p-3 md:grid-cols-[90px_1fr_140px_1fr_1fr_48px]"
                      >
                        <select
                          value={index === 0 ? "AND" : condition.logic ?? "AND"}
                          onChange={(event) =>
                            updateQueryDraft((current) => ({
                              ...current,
                              where: current.where.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, logic: event.target.value as "AND" | "OR" }
                                  : item,
                              ),
                            }))
                          }
                          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={index === 0}
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                        <select
                          value={condition.field}
                          onChange={(event) =>
                            updateQueryDraft((current) => ({
                              ...current,
                              where: current.where.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, field: event.target.value } : item,
                              ),
                            }))
                          }
                          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {whereFields.map((field) => (
                            <option key={makeFieldRef(field)} value={makeFieldRef(field)}>
                              {field.label} ({makeFieldRef(field)})
                            </option>
                          ))}
                        </select>
                        <select
                          value={condition.operator}
                          onChange={(event) =>
                            updateQueryDraft((current) => ({
                              ...current,
                              where: current.where.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, operator: event.target.value as SqlConsoleWhereCondition["operator"] }
                                  : item,
                              ),
                            }))
                          }
                          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {operatorOptions.map((operator) => (
                            <option key={operator} value={operator}>
                              {operator}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={Array.isArray(condition.value) ? condition.value.join(",") : String(condition.value ?? "")}
                          onChange={(event) =>
                            updateQueryDraft((current) => ({
                              ...current,
                              where: current.where.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      value:
                                        item.operator === "in" || item.operator === "not in"
                                          ? event.target.value
                                              .split(",")
                                              .map((value) => value.trim())
                                              .filter(Boolean)
                                          : parseValueFromText(event.target.value),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          placeholder="值"
                          disabled={condition.operator === "is null" || condition.operator === "is not null"}
                        />
                        <Input
                          value={String(condition.secondValue ?? "")}
                          onChange={(event) =>
                            updateQueryDraft((current) => ({
                              ...current,
                              where: current.where.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, secondValue: parseValueFromText(event.target.value) }
                                  : item,
                              ),
                            }))
                          }
                          placeholder="between 第二个值"
                          disabled={condition.operator !== "between"}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateQueryDraft((current) => ({
                              ...current,
                              where: current.where.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          ×
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>GROUP BY</Label>
                    <div className="text-xs text-muted-foreground">
                      可分组字段：{groupableFields.length}
                    </div>
                  </div>
                  <div className="flex min-h-20 flex-wrap gap-2 rounded-lg border border-border/60 p-3">
                    {queryDraft.groupBy.length === 0 ? (
                      <div className="text-sm text-muted-foreground">未设置分组字段。</div>
                    ) : (
                      queryDraft.groupBy.map((item) => (
                        <Badge key={item} variant="secondary" className="gap-2 px-3 py-1">
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQueryDraft((current) => ({
                                ...current,
                                groupBy: current.groupBy.filter((candidate) => candidate !== item),
                                having: current.having.filter((condition) => condition.field !== item),
                              }))
                            }
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>HAVING</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addHavingCondition}>
                      添加 HAVING
                    </Button>
                  </div>
                  <div className="space-y-3 rounded-lg border border-border/60 p-3">
                    {queryDraft.having.length === 0 ? (
                      <div className="text-sm text-muted-foreground">未设置 HAVING 条件。</div>
                    ) : (
                      queryDraft.having.map((condition, index) => (
                        <div
                          key={`${condition.field}-${index}`}
                          className="grid gap-2 rounded-lg border border-border/60 p-3 md:grid-cols-[90px_1fr_140px_1fr_1fr_48px]"
                        >
                          <select
                            value={index === 0 ? "AND" : condition.logic ?? "AND"}
                            onChange={(event) =>
                              updateQueryDraft((current) => ({
                                ...current,
                                having: current.having.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, logic: event.target.value as "AND" | "OR" }
                                    : item,
                                ),
                              }))
                            }
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            disabled={index === 0}
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                          <select
                            value={condition.field}
                            onChange={(event) =>
                              updateQueryDraft((current) => ({
                                ...current,
                                having: current.having.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, field: event.target.value } : item,
                                ),
                              }))
                            }
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {havingFieldOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={condition.operator}
                            onChange={(event) =>
                              updateQueryDraft((current) => ({
                                ...current,
                                having: current.having.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, operator: event.target.value as SqlConsoleWhereCondition["operator"] }
                                    : item,
                                ),
                              }))
                            }
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            {operatorOptions.map((operator) => (
                              <option key={operator} value={operator}>
                                {operator}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={Array.isArray(condition.value) ? condition.value.join(",") : String(condition.value ?? "")}
                            onChange={(event) =>
                              updateQueryDraft((current) => ({
                                ...current,
                                having: current.having.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        value:
                                          item.operator === "in" || item.operator === "not in"
                                            ? event.target.value
                                                .split(",")
                                                .map((value) => value.trim())
                                                .filter(Boolean)
                                            : parseValueFromText(event.target.value),
                                      }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="值"
                            disabled={condition.operator === "is null" || condition.operator === "is not null"}
                          />
                          <Input
                            value={String(condition.secondValue ?? "")}
                            onChange={(event) =>
                              updateQueryDraft((current) => ({
                                ...current,
                                having: current.having.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, secondValue: parseValueFromText(event.target.value) }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="between 第二个值"
                            disabled={condition.operator !== "between"}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateQueryDraft((current) => ({
                                ...current,
                                having: current.having.filter((_, itemIndex) => itemIndex !== index),
                              }))
                            }
                          >
                            ×
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>ORDER BY</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderByEntry}>
                    添加排序
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border border-border/60 p-3">
                  {queryDraft.orderBy.length === 0 ? (
                    <div className="text-sm text-muted-foreground">未设置排序。</div>
                  ) : (
                    queryDraft.orderBy.map((item, index) => (
                      <div key={`${item.field}-${index}`} className="grid gap-2 md:grid-cols-[1fr_120px_48px]">
                        <select
                          value={item.field}
                          onChange={(event) =>
                            updateQueryDraft((current) => ({
                              ...current,
                              orderBy: current.orderBy.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, field: event.target.value }
                                  : candidate,
                              ),
                            }))
                          }
                          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {orderFieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={item.direction}
                          onChange={(event) =>
                            updateQueryDraft((current) => ({
                              ...current,
                              orderBy: current.orderBy.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? {
                                      ...candidate,
                                      direction: event.target.value as "asc" | "desc",
                                    }
                                  : candidate,
                              ),
                            }))
                          }
                          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="asc">ASC</option>
                          <option value="desc">DESC</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateQueryDraft((current) => ({
                              ...current,
                              orderBy: current.orderBy.filter((_, candidateIndex) => candidateIndex !== index),
                            }))
                          }
                        >
                          ×
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="sql-limit">LIMIT</Label>
                  <Input
                    id="sql-limit"
                    type="number"
                    min={1}
                    max={schemaPayload?.maxLimit ?? 1000}
                    value={queryDraft.limit}
                    onChange={(event) =>
                      updateQueryDraft((current) => ({
                        ...current,
                        limit: Number(event.target.value || 100),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>执行范围</Label>
                  <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">
                    当前查询涉及 {queryTableNames.length || 1} 张白名单视图，候选字段 {queryFields.length} 个。
                    JOIN 只允许白名单等值关联；HAVING 只允许使用聚合别名或 GROUP BY 字段。
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="sql-preview">SQL 预览</Label>
                  <Button variant="ghost" size="sm" onClick={() => void copySql()}>
                    <Copy className="mr-2 size-4" />
                    复制 SQL
                  </Button>
                </div>
                <Textarea
                  id="sql-preview"
                  value={previewSql}
                  readOnly
                  className="min-h-[220px] font-mono text-xs"
                />
              </div>

              {validation?.warnings?.length ? (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {validation.warnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              ) : null}

              {validation?.errors?.length ? (
                <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {validation.errors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              ) : null}

              {requestStatus ? <p role="status" className="text-sm text-muted-foreground">{requestStatus}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void runValidation()} disabled={validating || running}>
                  {validating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-4" />
                  )}
                  校验 SQL
                </Button>
                <Button onClick={() => void runQuery()} disabled={running || validating}>
                  {running ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
                  执行查询
                </Button>
                {running || validating ? <Button variant="outline" onClick={cancelQuery}>停止等待</Button> : null}
                <Button variant="ghost" onClick={resetQuery}>
                  重置
                </Button>
              </div>
        </CardContent>
      </Card>

);
}
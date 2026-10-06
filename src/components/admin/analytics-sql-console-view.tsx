"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useSqlConsole } from "./sql-console/use-sql-console";
import { SqlConsoleBrowser, SqlConsoleBuilder } from "./sql-console/query-builder";
import { SqlConsoleResult } from "./sql-console/query-result";

export function AnalyticsSqlConsoleView() {
  const model = useSqlConsole();
  const { schemaLoading, schemaError, reloadSchema, tables, queryResult } = model;
  if (schemaLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在加载 SQL 查询台白名单...
        </CardContent>
      </Card>
    );
  }

  if (schemaError) return <Card><CardContent className="space-y-3 py-8"><p role="alert">{schemaError}</p><Button onClick={reloadSchema}>重试加载白名单</Button></CardContent></Card>;

  if (tables.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>SQL 查询台未开放</CardTitle>
          <CardDescription>
            当前角色未分配可查询视图。根据项目约束，督导和学生用户默认不分配查询表。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <div className="space-y-4"><SqlConsoleBrowser model={model}/><SqlConsoleBuilder model={model}/><SqlConsoleResult queryResult={queryResult} key={queryResult ? "result" : "empty"}/></div>;
}

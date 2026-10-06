"use client";
import { useState } from "react";
import { Copy, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import type { SqlConsoleQueryResult } from "@/lib/admin/sql-console-types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { inferCellText, downloadBlob, exportResultCsv, exportResultValues } from "./export-result";

export function SqlConsoleResult({queryResult}:{queryResult:SqlConsoleQueryResult | null}) {
  const [columnVisibility, setColumnVisibility] = useState<Record<string,boolean>>({});
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil((queryResult?.rows.length ?? 0) / 50));
  const pageRows = queryResult?.rows.slice(page * 50, (page + 1) * 50) ?? [];
  const visibleColumns = queryResult?.columns.filter(column=>columnVisibility[column.key] !== false) ?? [];
  const exportCsv = () => { if(queryResult) downloadBlob(exportResultCsv(queryResult,visibleColumns),"analytics-sql-result.csv","text/csv;charset=utf-8"); };
  const copyResult = async () => { if(queryResult) { await navigator.clipboard.writeText(exportResultCsv(queryResult,visibleColumns,"\t")); toast.success("结果已复制"); } };
  const exportXlsx = async () => {
    if(!queryResult)return;
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.aoa_to_sheet(exportResultValues(queryResult,visibleColumns));
    const workbook=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook,sheet,"QueryResult");
    downloadBlob(XLSX.write(workbook,{type:"array",bookType:"xlsx"}),"analytics-sql-result.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  };
  return (      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>查询结果</CardTitle>
          <CardDescription>
            {queryResult
              ? `返回 ${queryResult.rowCount} 行，用时 ${queryResult.elapsedMs}ms${queryResult.truncated ? "，结果已按 LIMIT 截断" : ""}`
              : "查询执行后，结果会展示在这里。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {queryResult ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="mr-2 size-4" />
                  导出 CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => void exportXlsx()}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  导出 XLSX
                </Button>
                <Button variant="outline" size="sm" onClick={() => void copyResult()}>
                  <Copy className="mr-2 size-4" />
                  复制结果
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 rounded-lg border border-border/60 p-3">
                {queryResult.columns.map((column) => (
                  <label
                    key={column.key}
                    className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={columnVisibility[column.key] !== false}
                      onChange={(event) =>
                        setColumnVisibility((current) => ({
                          ...current,
                          [column.key]: event.target.checked,
                        }))
                      }
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 text-sm">
                <span>已返回 {queryResult.rows.length} 行，计算总数 {queryResult.rowCount}；第 {page + 1}/{pageCount} 页</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={()=>setPage(page-1)}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={()=>setPage(page+1)}>下一页</Button>
                </div>
              </div>
              <ScrollArea className="h-[460px] rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((column) => (
                        <TableHead key={column.key}>{column.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {visibleColumns.map((column) => (
                          <TableCell key={column.key} className="max-w-[280px] align-top">
                            <div className="whitespace-pre-wrap break-all text-sm">
                              {inferCellText(row[column.key])}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground">
              查询执行后，结果将显示在这里。
            </div>
          )}
        </CardContent>
      </Card>
);
}

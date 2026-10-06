import type { SqlConsoleQueryResult } from "@/lib/admin/sql-console-types";

export function inferCellText(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function downloadBlob(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Prefix strings that spreadsheets could interpret as formulas, including leading whitespace.
export function safeSpreadsheetValue(value: unknown) {
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function quoteCell(value: unknown) { return '"' + String(value).replace(/"/g,'""') + '"'; }
export function exportResultCsv(result: SqlConsoleQueryResult, columns: SqlConsoleQueryResult["columns"], separator = ",") {
  return [columns.map(column=>quoteCell(safeSpreadsheetValue(column.label))).join(separator), ...result.rows.map(row=>columns.map(column=>quoteCell(safeSpreadsheetValue(inferCellText(row[column.key])))).join(separator))].join("\n");
}
export function exportResultValues(result: SqlConsoleQueryResult, columns: SqlConsoleQueryResult["columns"]) {
  return [columns.map(column=>safeSpreadsheetValue(column.label)), ...result.rows.map(row=>columns.map(column=>safeSpreadsheetValue(row[column.key] ?? null)))];
}

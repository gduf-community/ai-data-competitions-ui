"use client";

import { Fragment, useState, type ReactNode } from "react";import { matchSearchText, parseSearchQuery } from "@/lib/search";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type OnChangeFn,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { LoadingStatus } from "@/components/shared/euler-bridge-loader";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  searchPlaceholder: string;
  emptyLabel?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pageSize?: number;
  getRowId?: (row: TData) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  toolbar?: ReactNode;
  /** 可选：行展开。返回 true 时在该行下方渲染 renderExpandedRow 的内容。 */
  isRowExpanded?: (row: TData) => boolean;
  renderExpandedRow?: (row: TData) => ReactNode;
  /** 隐藏内置搜索框（由外部统一的筛选工具条承担搜索）。 */
  hideSearch?: boolean;
  /** cursor 分页：隐藏数字跳页与首尾页，只保留上一页/下一页，由调用方控制。 */
  cursorPaging?: {
    pageNumber: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
} & ({ pagination?: never; rowCount?: never; onPaginationChange?: never }
  | { pagination: PaginationState; rowCount: number; onPaginationChange: OnChangeFn<PaginationState> });

function buildPageItems(pageCount: number, currentPage: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, currentPage]);

  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < pageCount) pages.add(currentPage + 1);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= pageCount - 2) {
    pages.add(pageCount - 1);
    pages.add(pageCount - 2);
    pages.add(pageCount - 3);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];
  for (const page of sortedPages) {
    const lastItem = items[items.length - 1];
    if (typeof lastItem === "number" && page - lastItem > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}

export function AdminDataTable<TData>({
  data,
  columns,
  searchPlaceholder,
  emptyLabel = "暂无记录",
  searchValue,
  onSearchChange,
  pageSize = 10,
  getRowId,
  loading = false,
  error,
  onRetry,
  toolbar,
  isRowExpanded,
  renderExpandedRow,
  hideSearch = false,
  cursorPaging,
  pagination,
  rowCount,
  onPaginationChange,
}: AdminDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");

  const isExternalSearch = typeof onSearchChange === "function";
  const effectiveGlobalFilter = isExternalSearch ? "" : internalGlobalFilter;
  const effectiveSearchValue = isExternalSearch
    ? (searchValue ?? "")
    : internalGlobalFilter;
  let searchError: string | undefined;
  let localQuery = { q: "", mode: "fuzzy" as const, page: 1, pageSize: 20 };
  try { localQuery = { ...parseSearchQuery(new URLSearchParams({ q: effectiveGlobalFilter })), mode: "fuzzy" }; }
  catch (error) { searchError = error instanceof Error ? error.message : "无效搜索内容"; }

  // TanStack Table 当前返回的对象包含不适合 memoize 的内部函数，这里显式保留现状。
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: effectiveGlobalFilter,
      ...(pagination ? { pagination } : {}),
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
    onSortingChange: setSorting,
    ...(pagination ? { onPaginationChange, rowCount, manualPagination: true, manualFiltering: true, manualSorting: true, enableSorting: false } : {}),
    getRowId,
    onGlobalFilterChange: setInternalGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId) => {
      if (searchError) return false;
      if (!localQuery.q) return true;
      const value = row.getValue(columnId);
      return (typeof value === "string" || typeof value === "number") && matchSearchText(String(value), localQuery) > 0;
    },
  });

  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = Math.max(table.getPageCount(), 1);
  const totalRows = pagination ? rowCount : isExternalSearch
    ? data.length
    : table.getFilteredRowModel().rows.length;
  const pageItems = buildPageItems(pageCount, currentPage);

  return (
    <div className="space-y-4" aria-busy={loading}>
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 md:flex-row md:items-center md:justify-between">
        {hideSearch ? null : (
          <Input
            aria-label={searchPlaceholder}
            maxLength={256}
            value={effectiveSearchValue}
            disabled={Boolean(pagination) && !isExternalSearch}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (isExternalSearch) {
                onSearchChange(nextValue);
                return;
              }
              setInternalGlobalFilter(nextValue);
            }}
            placeholder={searchPlaceholder}
            className="md:max-w-sm"
          />
        )}
        {toolbar}
        <div role="status" className="text-sm text-muted-foreground">{searchError ?? (loading ? "加载中…" : error ? "加载失败" : `${totalRows} 条结果`)}</div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading || error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center">
                  {loading ? <LoadingStatus size={32}>正在加载…</LoadingStatus> : <div role="alert" className="space-y-2">
                    <p>{error}</p>
                    {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>重试</Button> : null}
                  </div>}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const expanded = Boolean(isRowExpanded?.(row.original));
                return (
                  <Fragment key={row.id}>
                    <TableRow>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expanded && renderExpandedRow ? (
                      <TableRow>
                        <TableCell className="bg-muted/30 p-0" colSpan={columns.length}>
                          {renderExpandedRow(row.original)}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {cursorPaging ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cursorPaging.onPrev}
            disabled={loading || Boolean(error) || !cursorPaging.hasPrev}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">第 {cursorPaging.pageNumber} 页</span>
          <Button
            variant="outline"
            size="sm"
            onClick={cursorPaging.onNext}
            disabled={loading || Boolean(error) || !cursorPaging.hasNext}
          >
            下一页
          </Button>
        </div>
      ) : (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          第 {currentPage} 页 / 共 {pageCount} 页
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button loading={loading}
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            aria-label="上一页"
            disabled={loading || Boolean(error) || !table.getCanPreviousPage()}
          >
            {"<"}
          </Button>
          <Button loading={loading}
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            aria-label="首页"
            disabled={loading || Boolean(error) || !table.getCanPreviousPage()}
          >
            {"<<"}
          </Button>
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button loading={loading}
                key={item}
                variant={item === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => table.setPageIndex(item - 1)}
                disabled={loading || Boolean(error)}
              >
                {item}
              </Button>
            ),
          )}
          <Button loading={loading}
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            aria-label="下一页"
            disabled={loading || Boolean(error) || !table.getCanNextPage()}
          >
            {">"}
          </Button>
          <Button loading={loading}
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            aria-label="末页"
            disabled={loading || Boolean(error) || !table.getCanNextPage()}
          >
            {">>"}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

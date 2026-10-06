"use client";

import { useState, type ReactNode } from "react";
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
    globalFilterFn: "includesString",
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
        <Input
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
        {toolbar}
        <div className="text-sm text-muted-foreground">{loading ? "加载中…" : error ? "加载失败" : `${totalRows} 条结果`}</div>
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
                  {loading ? <span role="status">正在加载…</span> : <div role="alert" className="space-y-2">
                    <p>{error}</p>
                    {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>重试</Button> : null}
                  </div>}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          第 {currentPage} 页 / 共 {pageCount} 页
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={loading || Boolean(error) || !table.getCanPreviousPage()}
          >
            {"<"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
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
              <Button
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={loading || Boolean(error) || !table.getCanNextPage()}
          >
            {">"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={loading || Boolean(error) || !table.getCanNextPage()}
          >
            {">>"}
          </Button>
        </div>
      </div>
    </div>
  );
}

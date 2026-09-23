"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { formatAmount, formatDateTime } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

function directionLabel(t, direction) {
  const key = `salesPage.directions.${direction}`;
  const out = t(key);
  return out !== key ? out : direction ?? "—";
}

function statusLabel(t, status) {
  const key = `salesPage.statuses.${status}`;
  const out = t(key);
  return out !== key ? out : status ?? "—";
}

function statusBadgeClass(status) {
  if (status === "approved") return "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-800";
  return "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800";
}

export function SalesTable() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["distributor", "sales", page],
    queryFn: async () => {
      const { data } = await api.get("/distributor/sales", { params: { page } });
      if (data?.success === false) throw new Error(data?.message || t("common.loadError"));
      return data?.data ?? {};
    },
  });

  const payload = query.data ?? {};
  const rows = Array.isArray(payload.sales) ? payload.sales : [];
  const meta = payload.meta ?? null;
  const currentPage = Number(meta?.current_page) || page;
  const lastPage = Math.max(1, Number(meta?.last_page) || 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("salesPage.title")}
          subtitle={t("salesPage.subtitle")}
          action={
            <Link href="/sales/new">
              <Button variant="primary" className="inline-flex items-center gap-2">
                <Plus className="size-4" aria-hidden />
                {t("salesPage.newBtn")}
              </Button>
            </Link>
          }
        />
        {query.isLoading ? (
          <p className="text-sm text-hadidi-subtle">{t("common.loading")}</p>
        ) : query.isError ? (
          <p className="text-sm text-red-700">{query.error?.message || t("common.loadError")}</p>
        ) : null}
      </Card>

      {!query.isLoading && !query.isError ? (
        <Card padding={false}>
          <div className="p-4 sm:p-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("salesPage.colRef")}</TableHead>
                  <TableHead>{t("salesPage.colTrader")}</TableHead>
                  <TableHead>{t("salesPage.colDirection")}</TableHead>
                  <TableHead>{t("salesPage.colTotal")}</TableHead>
                  <TableHead>{t("salesPage.colStatus")}</TableHead>
                  <TableHead>{t("salesPage.colDate")}</TableHead>
                  <TableHead align="end" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-hadidi-subtle">
                      {t("salesPage.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => router.push(`/sales/${s.id}`)}>
                      <TableCell className="font-medium text-hadidi-primary">{s.reference_no}</TableCell>
                      <TableCell className="text-hadidi-subtle">{s.merchant?.name || s.merchant_name || t("common.dash")}</TableCell>
                      <TableCell className="text-hadidi-subtle">{directionLabel(t, s.direction)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatAmount(s.final_total, locale)}</TableCell>
                      <TableCell>
                        <span className={statusBadgeClass(s.status)}>{statusLabel(t, s.status)}</span>
                      </TableCell>
                      <TableCell className="text-xs text-hadidi-subtle">{formatDateTime(s.created_at, locale)}</TableCell>
                      <TableCell className="text-end">
                        <Link
                          href={`/sales/${s.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-hadidi-accent hover:bg-hadidi-muted/60"
                        >
                          <Eye className="size-4" aria-hidden />
                          {t("common.view")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {lastPage > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
                <p className="text-xs text-hadidi-subtle">{t("common.pageOf", { current: currentPage, last: lastPage })}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage <= 1 || query.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t("common.prev")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={currentPage >= lastPage || query.isFetching}
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

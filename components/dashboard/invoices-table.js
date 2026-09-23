"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatAmount, formatDateTime } from "@/lib/format";
import { printInvoice } from "@/lib/invoice-pdf-markup";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

function typeLabel(t, type) {
  const key = `invoicesPage.types.${type}`;
  const out = t(key);
  return out !== key ? out : type ?? "—";
}

export function InvoicesTable() {
  const { t, locale } = useLocale();
  const { data: user } = useAuthUser();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["distributor", "invoices", page],
    queryFn: async () => {
      const { data } = await api.get("/distributor/invoices", { params: { page } });
      if (data?.success === false) throw new Error(data?.message || t("common.loadError"));
      return data?.data ?? {};
    },
  });

  const payload = query.data ?? {};
  const rows = Array.isArray(payload.invoices) ? payload.invoices : [];
  const meta = payload.meta ?? null;
  const currentPage = Number(meta?.current_page) || page;
  const lastPage = Math.max(1, Number(meta?.last_page) || 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("invoicesPage.title")} subtitle={t("invoicesPage.subtitle")} />
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
                  <TableHead>{t("invoicesPage.colNumber")}</TableHead>
                  <TableHead>{t("invoicesPage.colTrader")}</TableHead>
                  <TableHead>{t("invoicesPage.colType")}</TableHead>
                  <TableHead>{t("invoicesPage.colTotal")}</TableHead>
                  <TableHead>{t("invoicesPage.colDate")}</TableHead>
                  <TableHead align="end" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-hadidi-subtle">
                      {t("invoicesPage.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-hadidi-primary">{inv.invoice_no}</TableCell>
                      <TableCell className="text-hadidi-subtle">{inv.owner?.name || t("common.dash")}</TableCell>
                      <TableCell className="text-hadidi-subtle">{typeLabel(t, inv.type)}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{formatAmount(inv.total, locale)}</TableCell>
                      <TableCell className="text-xs text-hadidi-subtle">{formatDateTime(inv.issue_date, locale)}</TableCell>
                      <TableCell className="text-end">
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-hadidi-accent hover:bg-hadidi-muted/60"
                          onClick={() => printInvoice({ invoice: inv, locale, distributorName: user?.name, printedBy: user?.name })}
                        >
                          <Printer className="size-4" aria-hidden />
                          {t("invoicesPage.printBtn")}
                        </button>
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

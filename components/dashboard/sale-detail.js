"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Check, Pencil, Printer, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatAmount, formatDateTime, formatQty } from "@/lib/format";
import { itemLabelParts } from "@/lib/item-label";
import { printSaleInvoice, printSaleQuote } from "@/lib/sale-pdf-markup";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function directionLabel(t, direction) {
  const key = `salesPage.directions.${direction}`;
  const out = t(key);
  return out !== key ? out : direction ?? "—";
}

function statusBadgeClass(status) {
  if (status === "approved") return "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-800";
  return "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800";
}

export function SaleDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["distributor", "sales", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/distributor/sales/${id}`);
      if (data?.success === false) throw new Error(data?.message || t("saleDetailPage.loadError"));
      return data?.data?.sale ?? null;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/distributor/sales/${id}/approve`);
      if (data?.success === false) throw new Error(data?.message);
      return data?.data?.sale;
    },
    onSuccess: (updatedSale) => {
      // Write the approved sale straight into the cache so the
      // edit/delete/approve buttons disappear immediately (status is no
      // longer "draft") instead of waiting on a refetch round-trip.
      if (updatedSale) queryClient.setQueryData(["distributor", "sales", id], updatedSale);
      queryClient.invalidateQueries({ queryKey: ["distributor", "sales"] });
      queryClient.invalidateQueries({ queryKey: ["distributor", "traders"] });
      queryClient.invalidateQueries({ queryKey: ["distributor", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["distributor", "stock"] });
    },
    onError: (err) => {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err?.response?.data?.message || t("saleDetailPage.approveError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/distributor/sales/${id}`);
      if (data?.success === false) throw new Error(data?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor", "sales"] });
      router.push("/sales");
    },
  });

  const sale = query.data;
  const items = Array.isArray(sale?.items) ? sale.items : [];

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader title={t("saleDetailPage.title")} />
        <p className="text-sm text-hadidi-subtle">{t("common.loading")}</p>
      </Card>
    );
  }

  if (query.isError || !sale) {
    return (
      <Card>
        <CardHeader title={t("saleDetailPage.title")} />
        <p className="text-sm text-red-700">{query.error?.message || t("saleDetailPage.notFound")}</p>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-black/[0.06] pt-4">
          <Button variant="outline" onClick={() => router.push("/sales")} className="inline-flex items-center gap-2">
            <ArrowRight className="size-4 shrink-0" aria-hidden />
            {t("saleDetailPage.backBtn")}
          </Button>
        </div>
      </Card>
    );
  }

  const isDraft = sale.status === "draft";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={`${t("saleDetailPage.title")} — ${sale.reference_no}`}
          action={
            <div className="flex flex-wrap gap-2">
              {sale.status === "approved" ? (
                <Button
                  variant="outline"
                  onClick={() => printSaleInvoice({ sale, locale, distributorName: user?.name, printedBy: user?.name })}
                  className="inline-flex items-center gap-2"
                >
                  <Printer className="size-4 shrink-0" aria-hidden />
                  {t("saleDetailPage.printBtn")}
                </Button>
              ) : null}
              {isDraft ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => printSaleQuote({ sale, locale, distributorName: user?.name, printedBy: user?.name })}
                    className="inline-flex items-center gap-2"
                  >
                    <Printer className="size-4 shrink-0" aria-hidden />
                    {t("saleDetailPage.printQuoteBtn")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/sales/${sale.id}/edit`)}
                    className="inline-flex items-center gap-2"
                  >
                    <Pencil className="size-4 shrink-0" aria-hidden />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="primary"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate()}
                    className="inline-flex items-center gap-2"
                  >
                    <Check className="size-4 shrink-0" aria-hidden />
                    {approveMutation.isPending ? t("common.loading") : t("saleDetailPage.approveBtn")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    className="inline-flex items-center gap-2 text-red-700"
                  >
                    <Trash2 className="size-4 shrink-0" aria-hidden />
                    {t("saleDetailPage.deleteBtn")}
                  </Button>
                </>
              ) : null}
              <Button variant="outline" onClick={() => router.push("/sales")} className="inline-flex items-center gap-2">
                <ArrowRight className="size-4 shrink-0" aria-hidden />
                {t("saleDetailPage.backBtn")}
              </Button>
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-hadidi-subtle">{t("salesPage.colTrader")}</p>
            <p className="mt-1 font-bold text-hadidi-primary">{sale.merchant?.name || sale.merchant_name}</p>
          </div>
          <div>
            <p className="text-hadidi-subtle">{t("salesPage.colDirection")}</p>
            <p className="mt-1 font-bold text-hadidi-primary">{directionLabel(t, sale.direction)}</p>
          </div>
          <div>
            <p className="text-hadidi-subtle">{t("salesPage.colStatus")}</p>
            <p className="mt-1">
              <span className={statusBadgeClass(sale.status)}>{t(`salesPage.statuses.${sale.status}`)}</span>
            </p>
          </div>
          <div>
            <p className="text-hadidi-subtle">{t("salesPage.colDate")}</p>
            <p className="mt-1 font-bold text-hadidi-primary">{formatDateTime(sale.created_at, locale)}</p>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        {sale.notes ? (
          <div className="mt-4 rounded-2xl border border-black/[0.06] bg-hadidi-muted/30 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-hadidi-subtle">{t("salesPage.fieldNotes")}</p>
            <p className="mt-1 whitespace-pre-wrap text-hadidi-primary">{sale.notes}</p>
          </div>
        ) : null}
      </Card>

      <Card padding={false}>
        <div className="p-4 sm:p-6">
          <h3 className="mb-4 text-base font-bold text-hadidi-primary">{t("saleDetailPage.itemsTitle")}</h3>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24" />
                <TableHead>{t("salesPage.fieldItem")}</TableHead>
                <TableHead>{t("salesPage.colCategory")}</TableHead>
                <TableHead>{t("salesPage.colCatalogable")}</TableHead>
                <TableHead>{t("salesPage.colColor")}</TableHead>
                <TableHead>{t("salesPage.fieldQuantity")}</TableHead>
                <TableHead>{t("salesPage.fieldUnitPrice")}</TableHead>
                <TableHead>{t("salesPage.fieldDiscountPercent")}</TableHead>
                <TableHead>{t("salesPage.colTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-hadidi-subtle">
                    {t("common.dash")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const parts = itemLabelParts(row.inventory_item, t);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="p-1">
                        {row.inventory_item?.image_url ? (
                          <img src={row.inventory_item.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-black/[0.08] object-cover" />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-black/[0.1] bg-hadidi-muted/30" />
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-hadidi-primary">{parts.name}</TableCell>
                      <TableCell className="text-hadidi-subtle">{parts.category}</TableCell>
                      <TableCell className="text-hadidi-subtle">{parts.catalogable}</TableCell>
                      <TableCell className="text-hadidi-subtle">{parts.color}</TableCell>
                      <TableCell className="font-mono text-xs">{formatQty(row.quantity)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatAmount(row.unit_price, locale)}</TableCell>
                      <TableCell className="font-mono text-xs">{row.discount_percent ? `${formatQty(row.discount_percent)}%` : t("common.dash")}</TableCell>
                      <TableCell className="font-mono text-xs font-bold">{formatAmount(row.line_total, locale)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-black/[0.08] bg-hadidi-muted/20 p-4">
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between gap-6">
                <span className="text-hadidi-subtle">{t("requestDetailPage.subtotal")}</span>
                <span className="font-mono font-semibold text-hadidi-primary">{formatAmount(sale.subtotal, locale)}</span>
              </div>
              {Number(sale.discount_percent) > 0 ? (
                <div className="flex justify-between gap-6">
                  <span className="text-hadidi-subtle">{t("requestDetailPage.discount")} ({formatQty(sale.discount_percent)}%)</span>
                  <span className="font-mono font-semibold text-red-600">-{formatAmount(sale.discount_amount, locale)}</span>
                </div>
              ) : null}
              {Number(sale.tax_percent) > 0 ? (
                <div className="flex justify-between gap-6">
                  <span className="text-hadidi-subtle">{t("requestDetailPage.tax")} ({formatQty(sale.tax_percent)}%)</span>
                  <span className="font-mono font-semibold text-hadidi-primary">+{formatAmount(sale.tax_amount, locale)}</span>
                </div>
              ) : null}
              <div className="mt-1 flex justify-between gap-6 border-t border-black/[0.08] pt-1">
                <span className="font-bold text-hadidi-primary">{t("requestDetailPage.finalTotal")}</span>
                <span className="font-mono text-lg font-extrabold text-hadidi-primary">{formatAmount(sale.final_total, locale)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

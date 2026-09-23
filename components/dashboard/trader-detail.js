"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, FileText, Pencil, Plus, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatAmount, formatDateTime } from "@/lib/format";
import { printTraderStatement } from "@/lib/statement-pdf-markup";
import { printInvoice } from "@/lib/invoice-pdf-markup";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function directionLabel(t, direction) {
  const key = `salesPage.directions.${direction}`;
  const out = t(key);
  return out !== key ? out : direction ?? "—";
}

function statusBadgeClass(status) {
  if (status === "approved" || status === "paid") return "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-800";
  if (status === "partial") return "rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800";
  return "rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-semibold text-hadidi-subtle";
}

export function TraderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payError, setPayError] = useState("");
  const [showPayForm, setShowPayForm] = useState(false);
  const [editError, setEditError] = useState("");

  const query = useQuery({
    queryKey: ["distributor", "traders", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/distributor/traders/${id}`);
      if (data?.success === false) throw new Error(data?.message || t("traderDetailPage.loadError"));
      return data?.data?.trader ?? null;
    },
  });

  const trader = query.data;

  function startEditing() {
    setForm({
      name: trader.name || "",
      phone: trader.phone || "",
      company_name: trader.company_name || "",
      tax_number: trader.tax_number || "",
      address: trader.address || "",
      notes: trader.notes || "",
      is_active: !!trader.is_active,
    });
    setEditError("");
    setEditing(true);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/distributor/traders/${id}`, form);
      if (data?.success === false) throw new Error(data?.message);
      return data?.data?.trader;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor", "traders", id] });
      setEditing(false);
    },
    onError: (err) => {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setEditError(firstError || err?.response?.data?.message || err?.message || t("tradersPage.saveError"));
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/distributor/traders/${id}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
      });
      if (data?.success === false) throw new Error(data?.message || t("traderDetailPage.paymentError"));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor", "traders", id] });
      queryClient.invalidateQueries({ queryKey: ["distributor", "invoices"] });
      setPayAmount("");
      setShowPayForm(false);
      setPayError("");
    },
    onError: (err) => {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setPayError(firstError || err?.response?.data?.message || err?.message || t("traderDetailPage.paymentError"));
    },
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader title={t("traderDetailPage.title")} />
        <p className="text-sm text-hadidi-subtle">{t("common.loading")}</p>
      </Card>
    );
  }

  if (query.isError || !trader) {
    return (
      <Card>
        <CardHeader title={t("traderDetailPage.title")} />
        <p className="text-sm text-red-700">{query.error?.message || t("traderDetailPage.notFound")}</p>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-black/[0.06] pt-4">
          <Button variant="outline" onClick={() => router.push("/traders")} className="inline-flex items-center gap-2">
            <ArrowRight className="size-4 shrink-0" aria-hidden />
            {t("traderDetailPage.backBtn")}
          </Button>
        </div>
      </Card>
    );
  }

  const ledger = trader.ledger;
  const payments = Array.isArray(ledger?.payments) ? ledger.payments : [];
  const transactions = Array.isArray(trader.b2b_transactions) ? trader.b2b_transactions : [];
  const invoices = Array.isArray(trader.invoices) ? trader.invoices : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={trader.name}
          subtitle={t("traderDetailPage.subtitle")}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => printTraderStatement({ trader, locale, distributorName: user?.name, printedBy: user?.name })}
                className="inline-flex items-center gap-2"
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                {t("traderDetailPage.printStatementBtn")}
              </Button>
              {!editing ? (
                <Button variant="outline" onClick={startEditing} className="inline-flex items-center gap-2">
                  <Pencil className="size-4 shrink-0" aria-hidden />
                  {t("common.edit")}
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => router.push("/traders")} className="inline-flex items-center gap-2">
                <ArrowRight className="size-4 shrink-0" aria-hidden />
                {t("traderDetailPage.backBtn")}
              </Button>
            </div>
          }
        />

        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t("tradersPage.fieldName")} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label={t("tradersPage.fieldPhone")} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label={t("tradersPage.fieldCompany")} value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
            <Input label={t("tradersPage.fieldTaxNumber")} value={form.tax_number} onChange={(e) => setForm((f) => ({ ...f, tax_number: e.target.value }))} />
            <Select
              label={t("tradersPage.colStatus")}
              value={form.is_active ? "1" : "0"}
              onValueChange={(v) => setForm((f) => ({ ...f, is_active: v === "1" }))}
              options={[
                { value: "1", label: t("tradersPage.active") },
                { value: "0", label: t("tradersPage.inactive") },
              ]}
            />
            <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-hadidi-primary sm:col-span-2">
              <span>{t("tradersPage.fieldAddress")}</span>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-2.5 text-start text-hadidi-primary shadow-sm outline-none transition focus:border-hadidi-accent focus:ring-2 focus:ring-hadidi-accent/25"
              />
            </label>
            {editError ? <p className="sm:col-span-2 text-sm text-red-700">{editError}</p> : null}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button variant="primary" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                {updateMutation.isPending ? t("common.loading") : t("common.save")}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-hadidi-subtle">{t("tradersPage.colPhone")}</p>
              <p className="mt-1 font-bold text-hadidi-primary">{trader.phone || t("common.dash")}</p>
            </div>
            <div>
              <p className="text-hadidi-subtle">{t("tradersPage.colCompany")}</p>
              <p className="mt-1 font-bold text-hadidi-primary">{trader.company_name || t("common.dash")}</p>
            </div>
            <div>
              <p className="text-hadidi-subtle">{t("tradersPage.fieldTaxNumber")}</p>
              <p className="mt-1 font-bold text-hadidi-primary">{trader.tax_number || t("common.dash")}</p>
            </div>
            <div>
              <p className="text-hadidi-subtle">{t("tradersPage.colStatus")}</p>
              <p className="mt-1">
                <span className={statusBadgeClass(trader.is_active ? "approved" : "inactive")}>
                  {trader.is_active ? t("tradersPage.active") : t("tradersPage.inactive")}
                </span>
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("traderDetailPage.ledgerTitle")}
          action={
            <Button variant="outline" onClick={() => setShowPayForm((s) => !s)} className="inline-flex items-center gap-2">
              <Plus className="size-4 shrink-0" aria-hidden />
              {t("traderDetailPage.recordPaymentBtn")}
            </Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-hadidi-subtle">{t("traderDetailPage.totalOwed")}</p>
            <p className="mt-1 text-lg font-extrabold text-hadidi-primary">{formatAmount(ledger?.total_amount ?? 0, locale)}</p>
          </div>
          <div>
            <p className="text-hadidi-subtle">{t("traderDetailPage.totalPaid")}</p>
            <p className="mt-1 text-lg font-extrabold text-hadidi-primary">{formatAmount(ledger?.amount_paid ?? 0, locale)}</p>
          </div>
          <div>
            <p className="text-hadidi-subtle">{t("traderDetailPage.remaining")}</p>
            <p className="mt-1 text-lg font-extrabold text-hadidi-primary">{formatAmount(ledger?.remaining_balance ?? 0, locale)}</p>
          </div>
        </div>

        {showPayForm ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-black/[0.08] bg-hadidi-muted/25 p-4 sm:grid-cols-4 items-end">
            <Input
              label={t("traderDetailPage.paymentAmount")}
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) setPayAmount(v);
              }}
            />
            <Select
              label={t("traderDetailPage.paymentMethod")}
              value={payMethod}
              onValueChange={setPayMethod}
              options={["cash", "bank_transfer", "cheque", "instapay"].map((v) => ({ value: v, label: t(`traderDetailPage.methods.${v}`) }))}
            />
            <Button
              type="button"
              variant="primary"
              disabled={paymentMutation.isPending || !payAmount}
              onClick={() => paymentMutation.mutate()}
            >
              {paymentMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
            {payError ? <p className="sm:col-span-4 text-sm text-red-700">{payError}</p> : null}
          </div>
        ) : null}

        {payments.length > 0 ? (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("traderDetailPage.colDate")}</TableHead>
                  <TableHead>{t("traderDetailPage.colType")}</TableHead>
                  <TableHead>{t("traderDetailPage.colMethod")}</TableHead>
                  <TableHead>{t("traderDetailPage.colAmount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-hadidi-subtle">{formatDateTime(p.paid_at, locale)}</TableCell>
                    <TableCell>{p.type === "refund" ? t("traderDetailPage.refund") : t("traderDetailPage.payment")}</TableCell>
                    <TableCell className="text-hadidi-subtle">{t(`traderDetailPage.methods.${p.method}`) || p.method}</TableCell>
                    <TableCell className="font-mono text-xs font-bold">{formatAmount(p.amount, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </Card>

      <Card padding={false}>
        <div className="p-4 sm:p-6">
          <h3 className="mb-4 text-base font-bold text-hadidi-primary">{t("traderDetailPage.transactionsTitle")}</h3>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("salesPage.colRef")}</TableHead>
                <TableHead>{t("salesPage.colDirection")}</TableHead>
                <TableHead>{t("salesPage.colTotal")}</TableHead>
                <TableHead>{t("salesPage.colStatus")}</TableHead>
                <TableHead>{t("salesPage.colDate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-hadidi-subtle">
                    {t("common.dash")}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tr) => (
                  <TableRow key={tr.id} className="cursor-pointer" onClick={() => router.push(`/sales/${tr.id}`)}>
                    <TableCell className="font-medium text-hadidi-primary">{tr.reference_no}</TableCell>
                    <TableCell className="text-hadidi-subtle">{directionLabel(t, tr.direction)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatAmount(tr.final_total, locale)}</TableCell>
                    <TableCell>
                      <span className={statusBadgeClass(tr.status)}>{t(`salesPage.statuses.${tr.status}`)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-hadidi-subtle">{formatDateTime(tr.created_at, locale)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card padding={false}>
        <div className="p-4 sm:p-6">
          <h3 className="mb-4 text-base font-bold text-hadidi-primary">{t("traderDetailPage.invoicesTitle")}</h3>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("invoicesPage.colNumber")}</TableHead>
                <TableHead>{t("invoicesPage.colType")}</TableHead>
                <TableHead>{t("invoicesPage.colTotal")}</TableHead>
                <TableHead>{t("invoicesPage.colDate")}</TableHead>
                <TableHead align="end" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-hadidi-subtle">
                    {t("common.dash")}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-hadidi-primary">{inv.invoice_no}</TableCell>
                    <TableCell className="text-hadidi-subtle">{t(`invoicesPage.types.${inv.type}`) || inv.type}</TableCell>
                    <TableCell className="font-mono text-xs font-bold">{formatAmount(inv.total, locale)}</TableCell>
                    <TableCell className="text-xs text-hadidi-subtle">{formatDateTime(inv.issue_date, locale)}</TableCell>
                    <TableCell className="text-end">
                      <button
                        type="button"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-hadidi-accent hover:bg-hadidi-muted/60"
                        onClick={() => printInvoice({ invoice: { ...inv, owner: trader }, locale, distributorName: user?.name, printedBy: user?.name })}
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
        </div>
      </Card>
    </div>
  );
}

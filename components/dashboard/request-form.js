"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { useUnsavedChangesGuard } from "@/components/providers/navigation-guard-provider";
import { itemFullLabel, itemLabelParts } from "@/lib/item-label";
import { formatAmount, formatQty } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TYPES = ["purchase", "return"];
const ITEM_NONE = "__none__";

export function RequestForm() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState("purchase");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [formItemId, setFormItemId] = useState(ITEM_NONE);
  const [formQty, setFormQty] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [error, setError] = useState("");

  // "purchase" — pick from the full catalog (a brand-new distributor's own
  // stock starts empty, so it can't seed a first order). "return" — pick
  // only from items already sitting in this distributor's own warehouse.
  const pickerQuery = useQuery({
    queryKey: ["distributor", "request-item-picker", type],
    queryFn: async () => {
      if (type === "return") {
        const { data } = await api.get("/distributor/stock", { params: { per_page: 100 } });
        const rows = Array.isArray(data?.data?.stocks) ? data.data.stocks : [];
        return rows.map((s) => ({ id: s.inventory_item_id, item: s.item, available: s.quantity }));
      }
      const { data } = await api.get("/distributor/catalog-items");
      const rows = Array.isArray(data?.data?.items) ? data.data.items : [];
      return rows.map((it) => ({ id: it.id, item: it, available: it.retail_available_quantity ?? null }));
    },
  });

  const pickerRows = useMemo(() => (Array.isArray(pickerQuery.data) ? pickerQuery.data : []), [pickerQuery.data]);
  const itemOptions = useMemo(
    () => [
      { value: ITEM_NONE, label: t("requestsPage.selectItemPlaceholder") },
      ...pickerRows.map((row) => ({ value: String(row.id), label: itemFullLabel(row.item, t) })),
    ],
    [pickerRows, t]
  );

  function rowById(id) {
    return pickerRows.find((r) => String(r.id) === String(id));
  }

  // Price is never distributor-entered — always the item's fixed price,
  // shown read-only next to the quantity field. Prevents a distributor
  // from under/over-pricing their own order.
  const pickedRow = formItemId !== ITEM_NONE ? rowById(formItemId) : null;
  const pickedSellingPrice = pickedRow?.item?.price != null ? Number(pickedRow.item.price) : null;
  const isReturn = type === "return";

  function handleAddLine() {
    if (formItemId === ITEM_NONE) return;
    if (lines.some((row) => row.inventory_item_id === formItemId)) {
      setError(t("requestsPage.duplicateItem"));
      return;
    }
    const qty = Number(formQty);
    if (!formQty || Number.isNaN(qty) || qty <= 0) {
      setError(t("requestsPage.validationQuantity"));
      return;
    }
    // A return can never ask for more than what's actually sitting in the
    // distributor's own warehouse — pickedRow.available comes straight from
    // /distributor/stock for the "return" picker.
    if (isReturn && pickedRow?.available != null && qty > Number(pickedRow.available)) {
      setError(t("requestsPage.validationReturnQuantity"));
      return;
    }
    if (pickedSellingPrice == null) {
      setError(t("requestsPage.noSellingPrice"));
      return;
    }
    setError("");
    setLines((prev) => [
      ...prev,
      { inventory_item_id: formItemId, quantity: formQty, unit_price: pickedSellingPrice, discount_percent: formDiscount },
    ]);
    setFormItemId(ITEM_NONE);
    setFormQty("");
    setFormDiscount("");
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type,
        notes: notes.trim() || undefined,
        items: lines.map((row) => ({
          inventory_item_id: Number(row.inventory_item_id),
          quantity: Number(row.quantity),
          unit_price: Number(row.unit_price),
          discount_percent: row.discount_percent ? Number(row.discount_percent) : 0,
        })),
      };
      const { data } = await api.post("/distributor/requests", payload);
      if (data?.success === false) throw new Error(data?.message || t("requestsPage.saveError"));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributor", "requests"] });
      router.push("/requests");
    },
    onError: (err) => {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err?.response?.data?.message || err?.message || t("requestsPage.saveError"));
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (lines.length === 0) {
      setError(t("requestsPage.validationLines"));
      return;
    }
    setError("");
    createMutation.mutate();
  }

  const isDirty = lines.length > 0 || notes.trim() !== "" || (formItemId !== ITEM_NONE && formQty !== "");
  useUnsavedChangesGuard(!createMutation.isSuccess && isDirty);

  function lineTotal(row) {
    const subtotal = Number(row.quantity || 0) * Number(row.unit_price || 0);
    const discount = Number(row.discount_percent || 0);
    return subtotal * (1 - discount / 100);
  }

  const grandTotal = lines.reduce((acc, row) => acc + lineTotal(row), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("requestsPage.formTitle")} subtitle={t("requestsPage.formSubtitle")} />

        <form className="mt-4 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Select
            label={t("requestsPage.fieldType")}
            value={type}
            onValueChange={(v) => {
              setType(v);
              setLines([]);
              setFormItemId(ITEM_NONE);
            }}
            options={TYPES.map((v) => ({ value: v, label: t(`requestsPage.types.${v}`) }))}
          />

          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-hadidi-primary sm:col-span-2">
            <span>{t("requestsPage.fieldNotes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-2.5 text-start text-hadidi-primary shadow-sm outline-none transition focus:border-hadidi-accent focus:ring-2 focus:ring-hadidi-accent/25"
            />
          </label>

          <div className="sm:col-span-2 rounded-2xl border border-black/[0.08] bg-hadidi-muted/25 p-4">
            <p className="mb-3 text-sm font-bold text-hadidi-primary">{t("requestsPage.addLine")}</p>
            {pickerQuery.isLoading ? (
              <p className="text-sm text-hadidi-subtle">{t("common.loading")}</p>
            ) : pickerQuery.isError ? (
              <p className="text-sm text-red-700">{t("common.loadError")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-6 items-end">
                <div className="sm:col-span-2">
                  <Select
                    label={t("requestsPage.fieldItem")}
                    value={formItemId}
                    onValueChange={(v) => setFormItemId(v)}
                    options={itemOptions}
                  />
                </div>
                <Input
                  label={
                    pickedRow?.available != null
                      ? `${t("requestsPage.fieldQuantity")} (${formatQty(pickedRow.available)})`
                      : t("requestsPage.fieldQuantity")
                  }
                  inputMode="decimal"
                  value={formQty}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setFormQty(v);
                  }}
                />
                <div className="flex w-full flex-col gap-1.5 text-sm font-medium text-hadidi-primary">
                  <span>{t("requestsPage.sellingPriceHint")}</span>
                  <div className="flex h-[46px] w-full items-center rounded-2xl border border-black/[0.08] bg-hadidi-muted/40 px-4 text-hadidi-primary">
                    {pickedSellingPrice != null ? formatAmount(pickedSellingPrice, locale) : t("common.dash")}
                  </div>
                </div>
                <Input
                  label={t("requestsPage.fieldDiscountPercent")}
                  inputMode="decimal"
                  value={formDiscount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setFormDiscount(v);
                  }}
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddLine}
                  disabled={formItemId === ITEM_NONE}
                  className="inline-flex items-center gap-1"
                >
                  <Plus className="size-4" aria-hidden />
                  {t("requestsPage.addLine")}
                </Button>
              </div>
            )}
          </div>

          {lines.length > 0 ? (
            <div className="sm:col-span-2">
              <p className="mb-3 text-sm font-bold text-hadidi-primary">{t("requestsPage.linesTitle")}</p>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24" />
                    <TableHead>{t("requestsPage.fieldItem")}</TableHead>
                    <TableHead>{t("requestsPage.colCategory")}</TableHead>
                    <TableHead>{t("requestsPage.colCatalogable")}</TableHead>
                    <TableHead>{t("requestsPage.colColor")}</TableHead>
                    <TableHead className="w-24">{t("requestsPage.fieldQuantity")}</TableHead>
                    <TableHead className="w-28">{t("requestsPage.fieldUnitPrice")}</TableHead>
                    <TableHead className="w-24">{t("requestsPage.fieldDiscountPercent")}</TableHead>
                    <TableHead className="w-28">{t("requestsPage.colTotal")}</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((row, idx) => {
                    const item = rowById(row.inventory_item_id)?.item;
                    const parts = itemLabelParts(item, t);
                    return (
                    <TableRow key={row.inventory_item_id}>
                      <TableCell className="p-1">
                        {item?.image_url ? (
                          <img src={item.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-black/[0.08] object-cover" />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-black/[0.1] bg-hadidi-muted/30" />
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-hadidi-primary">{parts.name}</TableCell>
                      <TableCell className="text-hadidi-subtle">{parts.category}</TableCell>
                      <TableCell className="text-hadidi-subtle">{parts.catalogable}</TableCell>
                      <TableCell className="text-hadidi-subtle">{parts.color}</TableCell>
                      <TableCell className="font-mono text-xs">{formatQty(row.quantity)}</TableCell>
                      <TableCell>{formatAmount(row.unit_price, locale)}</TableCell>
                      <TableCell>{row.discount_percent ? `${formatQty(row.discount_percent)}%` : t("common.dash")}</TableCell>
                      <TableCell className="font-bold">{formatAmount(lineTotal(row), locale)}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="inline-flex cursor-pointer h-8 w-8 items-center justify-center rounded-lg text-red-700 transition hover:bg-red-50"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  <TableRow className="bg-hadidi-muted/20 hover:bg-hadidi-muted/20">
                    <TableCell colSpan={8} className="text-end font-bold text-hadidi-primary">
                      {t("requestsPage.colTotal")}
                    </TableCell>
                    <TableCell className="text-lg font-bold text-hadidi-primary">{formatAmount(grandTotal, locale)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : null}

          {error ? <p className="sm:col-span-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap gap-3 border-t border-black/[0.06] pt-4 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("common.loading") : t("requestsPage.submitBtn")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/requests")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

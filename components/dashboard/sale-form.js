"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { useUnsavedChangesGuard } from "@/components/providers/navigation-guard-provider";
import { itemFullLabel, itemLabelParts } from "@/lib/item-label";
import { cleanNumberInput, formatAmount, formatQty } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DIRECTIONS = ["sale", "purchase"];
const ITEM_NONE = "__none__";

/**
 * Outer component: resolves edit-mode data first (if any), and only mounts
 * the actual interactive form once that data is fully settled. This
 * deliberately avoids the "mount empty, then useEffect-sync state in" pattern
 * — waiting on an effect to push fetched data into an already-rendered
 * form's state is a common source of races (a re-render/remount slipping in
 * between the fetch resolving and the effect committing can leave the form
 * stuck on its initial empty values). Passing `key={editId}` below forces a
 * brand-new SaleFormInner instance per sale, so its useState calls compute
 * their initial values directly from `initialSale` on the very first render
 * — no effect, no race, no possibility of "empty until you happen to look
 * again".
 */
export function SaleForm() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useParams();
  const editId = params?.id ? String(params.id) : null;
  const isEditMode = !!editId;

  const existingSaleQuery = useQuery({
    queryKey: ["distributor", "sales", editId],
    enabled: isEditMode,
    queryFn: async () => {
      const { data } = await api.get(`/distributor/sales/${editId}`);
      if (data?.success === false) throw new Error(data?.message || t("saleDetailPage.loadError"));
      return data?.data?.sale ?? null;
    },
  });

  if (isEditMode && existingSaleQuery.isLoading) {
    return (
      <Card>
        <CardHeader title={t("salesPage.formTitleEdit")} />
        <p className="text-sm text-hadidi-subtle">{t("common.loading")}</p>
      </Card>
    );
  }

  if (isEditMode && (existingSaleQuery.isError || !existingSaleQuery.data)) {
    return (
      <Card>
        <CardHeader title={t("salesPage.formTitleEdit")} />
        <p className="text-sm text-red-700">{existingSaleQuery.error?.message || t("saleDetailPage.notFound")}</p>
      </Card>
    );
  }

  if (isEditMode && existingSaleQuery.data.status !== "draft") {
    return (
      <Card>
        <CardHeader title={t("salesPage.formTitleEdit")} />
        <p className="text-sm text-red-700">{t("salesPage.cannotEditApproved")}</p>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push(`/sales/${editId}`)}>
            {t("saleDetailPage.backBtn")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <SaleFormInner
      key={editId ?? "new"}
      isEditMode={isEditMode}
      editId={editId}
      initialSale={isEditMode ? existingSaleQuery.data : null}
    />
  );
}

function SaleFormInner({ isEditMode, editId, initialSale }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState(() => initialSale?.direction || "sale");
  const [merchantId, setMerchantId] = useState(() => (initialSale?.merchant_id != null ? String(initialSale.merchant_id) : ""));
  const [notes, setNotes] = useState(() => initialSale?.notes || "");
  const [headerDiscountPercent, setHeaderDiscountPercent] = useState(() =>
    Number(initialSale?.discount_percent) ? cleanNumberInput(initialSale.discount_percent) : ""
  );
  const [headerTaxPercent, setHeaderTaxPercent] = useState(() =>
    Number(initialSale?.tax_percent) ? cleanNumberInput(initialSale.tax_percent) : ""
  );
  const [settlementAmount, setSettlementAmount] = useState(() =>
    Number(initialSale?.settlement_amount) ? cleanNumberInput(initialSale.settlement_amount) : ""
  );
  const [lines, setLines] = useState(() =>
    (Array.isArray(initialSale?.items) ? initialSale.items : []).map((row) => ({
      inventory_item_id: String(row.inventory_item_id),
      quantity: cleanNumberInput(row.quantity),
      unit_price: cleanNumberInput(row.unit_price),
      discount_percent: row.discount_percent ? cleanNumberInput(row.discount_percent) : "",
    }))
  );
  // Items already on the sale being edited — kept alongside the picker's own
  // rows so a line's name/image still renders even if that item has since
  // dropped out of current stock/returnable-items (e.g. it was fully sold
  // since this draft was created).
  const [knownItemsById] = useState(() =>
    Object.fromEntries((Array.isArray(initialSale?.items) ? initialSale.items : []).map((row) => [String(row.inventory_item_id), row.inventory_item]))
  );
  const [formItemId, setFormItemId] = useState(ITEM_NONE);
  const [formQty, setFormQty] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [error, setError] = useState("");

  const isReturn = direction === "purchase";

  const tradersQuery = useQuery({
    queryKey: ["distributor", "traders-active"],
    queryFn: async () => {
      const { data } = await api.get("/distributor/traders/active");
      return Array.isArray(data?.data?.traders) ? data.data.traders : [];
    },
  });
  const traderOptions = useMemo(() => {
    const rows = Array.isArray(tradersQuery.data) ? tradersQuery.data : [];
    const options = rows.map((m) => ({ value: String(m.id), label: m.name }));
    // The sale being edited might reference a trader that's since been
    // deactivated — /traders/active wouldn't include them, which would
    // otherwise make the field render as if nothing were selected even
    // though merchantId is correctly set. Keep them selectable here too.
    const existingMerchant = initialSale?.merchant;
    if (existingMerchant && !options.some((o) => o.value === String(existingMerchant.id))) {
      options.push({ value: String(existingMerchant.id), label: existingMerchant.name });
    }
    return options;
  }, [tradersQuery.data, initialSale]);

  // "sale" — pick from what's currently sitting in the distributor's own
  // warehouse. "purchase" (= a return) — pick only from what this specific
  // trader currently holds, so a return can never exceed what they were sold.
  const pickerQuery = useQuery({
    queryKey: ["distributor", "sale-item-picker", direction, merchantId],
    enabled: !isReturn || !!merchantId,
    queryFn: async () => {
      if (isReturn) {
        const { data } = await api.get(`/distributor/traders/${merchantId}/returnable-items`);
        const rows = Array.isArray(data?.data?.items) ? data.data.items : [];
        return rows.map((row) => ({ id: row.inventory_item_id, item: row.item, available: row.quantity }));
      }
      const { data } = await api.get("/distributor/stock", { params: { per_page: 100 } });
      const rows = Array.isArray(data?.data?.stocks) ? data.data.stocks : [];
      return rows.map((s) => ({ id: s.inventory_item_id, item: s.item, available: s.quantity }));
    },
  });

  const pickerRows = useMemo(() => (Array.isArray(pickerQuery.data) ? pickerQuery.data : []), [pickerQuery.data]);
  const itemOptions = useMemo(
    () => [
      { value: ITEM_NONE, label: t("salesPage.selectItemPlaceholder") },
      ...pickerRows.map((row) => ({ value: String(row.id), label: itemFullLabel(row.item, t) })),
    ],
    [pickerRows, t]
  );

  function rowById(itemId) {
    return pickerRows.find((r) => String(r.id) === String(itemId)) || (knownItemsById[String(itemId)] ? { id: itemId, item: knownItemsById[String(itemId)], available: null } : null);
  }

  const pickedRow = formItemId !== ITEM_NONE ? rowById(formItemId) : null;

  function resetItemPicker() {
    setLines([]);
    setFormItemId(ITEM_NONE);
    setFormQty("");
    setFormPrice("");
    setFormDiscount("");
  }

  function handleAddLine() {
    if (formItemId === ITEM_NONE) return;
    if (lines.some((row) => row.inventory_item_id === formItemId)) {
      setError(t("salesPage.duplicateItem"));
      return;
    }
    const qty = Number(formQty);
    if (!formQty || Number.isNaN(qty) || qty <= 0) {
      setError(t("salesPage.validationQuantity"));
      return;
    }
    if (pickedRow?.available != null && qty > Number(pickedRow.available)) {
      setError(isReturn ? t("salesPage.validationReturnQuantity") : t("salesPage.validationStockQuantity"));
      return;
    }
    const price = Number(formPrice);
    if (!formPrice || Number.isNaN(price) || price < 0) {
      setError(t("salesPage.validationPrice"));
      return;
    }
    setError("");
    setLines((prev) => [
      ...prev,
      { inventory_item_id: formItemId, quantity: formQty, unit_price: formPrice, discount_percent: formDiscount },
    ]);
    setFormItemId(ITEM_NONE);
    setFormQty("");
    setFormPrice("");
    setFormDiscount("");
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        direction,
        merchant_id: Number(merchantId),
        notes: notes.trim() || undefined,
        discount_percent: headerDiscountPercent ? Number(headerDiscountPercent) : 0,
        tax_percent: headerTaxPercent ? Number(headerTaxPercent) : 0,
        settlement_amount: settlementAmount ? Number(settlementAmount) : 0,
        items: lines.map((row) => ({
          inventory_item_id: Number(row.inventory_item_id),
          quantity: Number(row.quantity),
          unit_price: Number(row.unit_price),
          discount_percent: row.discount_percent ? Number(row.discount_percent) : 0,
        })),
      };
      const { data } = isEditMode
        ? await api.put(`/distributor/sales/${editId}`, payload)
        : await api.post("/distributor/sales", payload);
      if (data?.success === false) throw new Error(data?.message || t("salesPage.saveError"));
      return data?.data?.sale;
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", "sales"] });
      router.push(sale?.id ? `/sales/${sale.id}` : "/sales");
    },
    onError: (err) => {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err?.response?.data?.message || err?.message || t("salesPage.saveError"));
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!merchantId) {
      setError(t("salesPage.validationTrader"));
      return;
    }
    if (lines.length === 0) {
      setError(t("salesPage.validationLines"));
      return;
    }
    setError("");
    saveMutation.mutate();
  }

  const isDirty = lines.length > 0 || notes.trim() !== "" || !!merchantId;
  useUnsavedChangesGuard(!saveMutation.isSuccess && isDirty);

  function lineTotal(row) {
    const subtotal = Number(row.quantity || 0) * Number(row.unit_price || 0);
    const discount = Number(row.discount_percent || 0);
    return subtotal * (1 - discount / 100);
  }

  const grandTotal = lines.reduce((acc, row) => acc + lineTotal(row), 0);
  const headerDiscountAmount = grandTotal * (Number(headerDiscountPercent || 0) / 100);
  const afterHeaderDiscount = grandTotal - headerDiscountAmount;
  const headerTaxAmount = afterHeaderDiscount * (Number(headerTaxPercent || 0) / 100);
  const finalTotal = afterHeaderDiscount + headerTaxAmount - Number(settlementAmount || 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={isEditMode ? t("salesPage.formTitleEdit") : t("salesPage.formTitle")}
          subtitle={t("salesPage.formSubtitle")}
        />

        <form className="mt-4 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Select
            label={t("salesPage.fieldDirection")}
            value={direction}
            onValueChange={(v) => {
              setDirection(v);
              resetItemPicker();
            }}
            options={DIRECTIONS.map((v) => ({ value: v, label: t(`salesPage.directions.${v}`) }))}
          />

          <Select
            label={t("salesPage.fieldTrader")}
            value={merchantId}
            onValueChange={(v) => {
              setMerchantId(v);
              resetItemPicker();
            }}
            placeholder={t("salesPage.selectTraderPlaceholder")}
            options={traderOptions}
          />

          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-hadidi-primary sm:col-span-2">
            <span>{t("salesPage.fieldNotes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-2.5 text-start text-hadidi-primary shadow-sm outline-none transition focus:border-hadidi-accent focus:ring-2 focus:ring-hadidi-accent/25"
            />
          </label>

          {isReturn && !merchantId ? (
            <p className="sm:col-span-2 text-sm text-hadidi-subtle">{t("salesPage.pickTraderFirst")}</p>
          ) : (
            <div className="sm:col-span-2 rounded-2xl border border-black/[0.08] bg-hadidi-muted/25 p-4">
              <p className="mb-3 text-sm font-bold text-hadidi-primary">{t("salesPage.addLine")}</p>
              {pickerQuery.isLoading ? (
                <p className="text-sm text-hadidi-subtle">{t("common.loading")}</p>
              ) : pickerQuery.isError ? (
                <p className="text-sm text-red-700">{t("common.loadError")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-6 items-end">
                  <div className="sm:col-span-2">
                    <Select
                      label={t("salesPage.fieldItem")}
                      value={formItemId}
                      onValueChange={(v) => {
                        setFormItemId(v);
                        const row = rowById(v);
                        setFormPrice(cleanNumberInput(row?.item?.price));
                      }}
                      options={itemOptions}
                    />
                  </div>
                  <Input
                    label={
                      pickedRow?.available != null
                        ? `${t("salesPage.fieldQuantity")} (${formatQty(pickedRow.available)})`
                        : t("salesPage.fieldQuantity")
                    }
                    inputMode="decimal"
                    value={formQty}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d*$/.test(v)) setFormQty(v);
                    }}
                  />
                  <Input
                    label={t("salesPage.fieldUnitPrice")}
                    inputMode="decimal"
                    value={formPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d*$/.test(v)) setFormPrice(v);
                    }}
                  />
                  <Input
                    label={t("salesPage.fieldDiscountPercent")}
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
                    {t("salesPage.addLine")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {lines.length > 0 ? (
            <div className="sm:col-span-2">
              <p className="mb-3 text-sm font-bold text-hadidi-primary">{t("salesPage.linesTitle")}</p>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24" />
                    <TableHead>{t("salesPage.fieldItem")}</TableHead>
                    <TableHead className="w-24">{t("salesPage.fieldQuantity")}</TableHead>
                    <TableHead className="w-28">{t("salesPage.fieldUnitPrice")}</TableHead>
                    <TableHead className="w-24">{t("salesPage.fieldDiscountPercent")}</TableHead>
                    <TableHead className="w-28">{t("salesPage.colTotal")}</TableHead>
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
                        <TableCell className="p-1">
                          <Input
                            inputMode="decimal"
                            value={row.quantity}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d*\.?\d*$/.test(v)) updateLine(idx, { quantity: v });
                            }}
                            className="min-w-0"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            inputMode="decimal"
                            value={row.unit_price}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d*\.?\d*$/.test(v)) updateLine(idx, { unit_price: v });
                            }}
                            className="min-w-0"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            inputMode="decimal"
                            value={row.discount_percent}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d*\.?\d*$/.test(v)) updateLine(idx, { discount_percent: v });
                            }}
                            className="min-w-0"
                          />
                        </TableCell>
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
                    <TableCell colSpan={4} />
                    <TableCell className="text-end text-xs font-bold text-hadidi-primary">
                      {t("requestDetailPage.subtotal")}
                    </TableCell>
                    <TableCell className="font-bold text-hadidi-primary">{formatAmount(grandTotal, locale)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} />
                    <TableCell colSpan={2} className="p-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="shrink-0 text-xs text-hadidi-subtle">{t("salesPage.fieldHeaderDiscountPercent")}</span>
                        <div className="shrink-0">
                          <Input
                            inputMode="decimal"
                            value={headerDiscountPercent}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d*\.?\d*$/.test(v)) setHeaderDiscountPercent(v);
                            }}
                            className="h-9 !w-[100px] px-3 text-center text-sm"
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-red-600">-{formatAmount(headerDiscountAmount, locale)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} />
                    <TableCell colSpan={2} className="p-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="shrink-0 text-xs text-hadidi-subtle">{t("salesPage.fieldHeaderTaxPercent")}</span>
                        <div className="shrink-0">
                          <Input
                            inputMode="decimal"
                            value={headerTaxPercent}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^\d*\.?\d*$/.test(v)) setHeaderTaxPercent(v);
                            }}
                            className="h-9 !w-[100px] px-3 text-center text-sm"
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-hadidi-primary">+{formatAmount(headerTaxAmount, locale)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} />
                    <TableCell colSpan={2} className="p-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="shrink-0 text-xs text-hadidi-subtle">{t("salesPage.fieldSettlementAmount")}</span>
                        <div className="shrink-0">
                          <Input
                            inputMode="decimal"
                            value={settlementAmount}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^-?\d*\.?\d*$/.test(v)) setSettlementAmount(v);
                            }}
                            className="h-9 !w-[100px] px-3 text-center text-sm"
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-hadidi-primary">{formatAmount(Number(settlementAmount || 0), locale)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow className="bg-hadidi-muted/20 hover:bg-hadidi-muted/20">
                    <TableCell colSpan={4} />
                    <TableCell className="text-end text-sm font-bold text-hadidi-primary">
                      {t("requestDetailPage.finalTotal")}
                    </TableCell>
                    <TableCell className="text-base font-extrabold text-hadidi-primary">{formatAmount(finalTotal, locale)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : null}

          {error ? <p className="sm:col-span-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap gap-3 border-t border-black/[0.06] pt-4 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t("common.loading") : isEditMode ? t("common.save") : t("salesPage.submitBtn")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(isEditMode ? `/sales/${editId}` : "/sales")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

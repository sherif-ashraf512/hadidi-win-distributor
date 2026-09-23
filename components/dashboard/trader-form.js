"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { useUnsavedChangesGuard } from "@/components/providers/navigation-guard-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TraderForm() {
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        company_name: companyName.trim() || undefined,
        tax_number: taxNumber.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const { data } = await api.post("/distributor/traders", payload);
      if (data?.success === false) throw new Error(data?.message || t("tradersPage.saveError"));
      return data?.data?.trader;
    },
    onSuccess: (trader) => {
      queryClient.invalidateQueries({ queryKey: ["distributor", "traders"] });
      router.push(trader?.id ? `/traders/${trader.id}` : "/traders");
    },
    onError: (err) => {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setError(firstError || err?.response?.data?.message || err?.message || t("tradersPage.saveError"));
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("tradersPage.validationName"));
      return;
    }
    setError("");
    createMutation.mutate();
  }

  const isDirty = [name, phone, companyName, taxNumber, address, notes].some((v) => v.trim() !== "");
  useUnsavedChangesGuard(!createMutation.isSuccess && isDirty);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t("tradersPage.formTitle")} subtitle={t("tradersPage.formSubtitle")} />

        <form className="mt-4 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Input label={t("tradersPage.fieldName")} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={t("tradersPage.fieldPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label={t("tradersPage.fieldCompany")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <Input label={t("tradersPage.fieldTaxNumber")} value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-hadidi-primary sm:col-span-2">
            <span>{t("tradersPage.fieldAddress")}</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-2.5 text-start text-hadidi-primary shadow-sm outline-none transition focus:border-hadidi-accent focus:ring-2 focus:ring-hadidi-accent/25"
            />
          </label>
          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-hadidi-primary sm:col-span-2">
            <span>{t("tradersPage.fieldNotes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-2.5 text-start text-hadidi-primary shadow-sm outline-none transition focus:border-hadidi-accent focus:ring-2 focus:ring-hadidi-accent/25"
            />
          </label>

          {error ? <p className="sm:col-span-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap gap-3 border-t border-black/[0.06] pt-4 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("common.loading") : t("tradersPage.submitBtn")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/traders")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

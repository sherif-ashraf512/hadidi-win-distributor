"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function TradersTable() {
  const { t } = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["distributor", "traders", page, search],
    queryFn: async () => {
      const { data } = await api.get("/distributor/traders", { params: { page, search: search || undefined } });
      if (data?.success === false) throw new Error(data?.message || t("common.loadError"));
      return data?.data ?? {};
    },
  });

  const payload = query.data ?? {};
  const rows = Array.isArray(payload.traders) ? payload.traders : [];
  const meta = payload.meta ?? null;
  const currentPage = Number(meta?.current_page) || page;
  const lastPage = Math.max(1, Number(meta?.last_page) || 1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("tradersPage.title")}
          subtitle={t("tradersPage.subtitle")}
          action={
            <Link href="/traders/new">
              <Button variant="primary" className="inline-flex items-center gap-2">
                <Plus className="size-4" aria-hidden />
                {t("tradersPage.newBtn")}
              </Button>
            </Link>
          }
        />
        <Input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder={t("tradersPage.searchPlaceholder")}
        />
        {query.isLoading ? (
          <p className="mt-4 text-sm text-hadidi-subtle">{t("common.loading")}</p>
        ) : query.isError ? (
          <p className="mt-4 text-sm text-red-700">{query.error?.message || t("common.loadError")}</p>
        ) : null}
      </Card>

      {!query.isLoading && !query.isError ? (
        <Card padding={false}>
          <div className="p-4 sm:p-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("tradersPage.colName")}</TableHead>
                  <TableHead>{t("tradersPage.colPhone")}</TableHead>
                  <TableHead>{t("tradersPage.colCompany")}</TableHead>
                  <TableHead>{t("tradersPage.colStatus")}</TableHead>
                  <TableHead align="end" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-hadidi-subtle">
                      {t("tradersPage.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((m) => (
                    <TableRow key={m.id} className="cursor-pointer" onClick={() => router.push(`/traders/${m.id}`)}>
                      <TableCell className="font-medium text-hadidi-primary">{m.name}</TableCell>
                      <TableCell className="text-hadidi-subtle">{m.phone || t("common.dash")}</TableCell>
                      <TableCell className="text-hadidi-subtle">{m.company_name || t("common.dash")}</TableCell>
                      <TableCell>
                        <span
                          className={
                            m.is_active
                              ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                              : "rounded-full bg-black/10 px-2.5 py-0.5 text-xs font-semibold text-hadidi-subtle"
                          }
                        >
                          {m.is_active ? t("tradersPage.active") : t("tradersPage.inactive")}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Link
                          href={`/traders/${m.id}`}
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

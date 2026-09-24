"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ClipboardList,
  FileClock,
  Landmark,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { useAuthUser } from "@/hooks/use-auth-user";
import { itemFullLabel } from "@/lib/item-label";
import { formatAmount, formatDateTime, formatQty } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Donut, HBars, TrendBars } from "@/components/dashboard/charts";

function KpiCard({ icon: Icon, label, value, hint, tone = "default", badge }) {
  const tones = {
    default: "bg-hadidi-primary/[0.06] text-hadidi-primary",
    accent: "bg-hadidi-accent/15 text-amber-700",
    good: "bg-emerald-500/15 text-emerald-700",
    bad: "bg-rose-500/15 text-rose-700",
  };
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex size-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        {badge}
      </div>
      <p className="mt-4 text-sm text-hadidi-subtle">{label}</p>
      <p className="mt-1 break-words text-2xl font-extrabold text-hadidi-primary">{value}</p>
      {hint ? <p className="mt-1 text-xs text-hadidi-subtle">{hint}</p> : null}
    </div>
  );
}

function ActionTile({ href, icon: Icon, count, label, tone }) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition hover:shadow-sm",
        active ? `${tone} ring-black/[0.05]` : "bg-white text-hadidi-subtle ring-black/[0.04]",
      ].join(" ")}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="text-2xl font-extrabold leading-none">{count}</span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function DeltaBadge({ current, previous, t }) {
  if (!previous && !current) return null;
  if (!previous) {
    return <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">{t("dashboardPage.newThisMonth")}</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        up ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"
      }`}
      dir="ltr"
    >
      <Icon className="size-3.5" aria-hidden />
      {formatQty(Math.abs(Math.round(pct * 10) / 10))}%
    </span>
  );
}

function EmptyNote({ children }) {
  return <p className="py-6 text-center text-sm text-hadidi-subtle">{children}</p>;
}

export function DashboardHome() {
  const { t, locale } = useLocale();
  const { data: user } = useAuthUser();

  const query = useQuery({
    queryKey: ["distributor", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/distributor/dashboard");
      if (data?.success === false) throw new Error(data?.message || t("common.loadError"));
      return data?.data ?? null;
    },
  });

  const d = query.data;
  const warehouseName = user?.warehouse ? (locale === "ar" ? user.warehouse.name_ar || user.warehouse.name_en : user.warehouse.name_en || user.warehouse.name_ar) : null;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-hadidi-primary">
          {t("dashboardPage.welcome")}
          {user?.name ? `، ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-hadidi-subtle">{t("dashboardPage.subtitle")}</p>
      </div>
      {warehouseName ? <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-hadidi-subtle ring-1 ring-black/[0.06]">{warehouseName}</span> : null}
    </div>
  );

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-sm text-hadidi-subtle">{t("common.loading")}</p>
      </div>
    );
  }

  if (query.isError || !d) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <p className="text-sm text-red-700">{query.error?.message || t("common.loadError")}</p>
        </Card>
      </div>
    );
  }

  const k = d.kpis;
  const categoryLabel = (cat) => {
    const key = `stockPage.categories.${cat}`;
    const out = t(key);
    return out !== key ? out : cat;
  };

  const donutSegments = d.stock_by_category
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((c) => ({ key: c.category, label: `${categoryLabel(c.category)} (${formatQty(c.items)})`, value: c.value }));

  const debtorRows = d.top_debtors.map((r) => ({
    key: r.id,
    label: r.name,
    value: r.remaining,
    valueLabel: formatAmount(r.remaining, locale),
  }));

  const topItemRows = d.top_items.map((r) => ({
    key: r.inventory_item_id,
    label: itemFullLabel(r.item, t),
    value: r.total,
    valueLabel: formatAmount(r.total, locale),
    sublabel: `${t("dashboardPage.soldQty")}: ${formatQty(r.quantity)}`,
  }));

  return (
    <div className="space-y-6">
      {header}

      {!d.has_warehouse ? (
        <Card>
          <p className="text-sm text-hadidi-subtle">{t("stockPage.noWarehouse")}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Package}
          label={t("dashboardPage.kpiStockValue")}
          value={formatAmount(k.stock_value, locale)}
          hint={`${formatQty(k.items_in_stock)} ${t("dashboardPage.itemsInStock")}`}
        />
        <KpiCard
          icon={TrendingUp}
          tone="good"
          label={t("dashboardPage.kpiMonthSales")}
          value={formatAmount(k.month_sales, locale)}
          hint={`${t("dashboardPage.prevMonth")}: ${formatAmount(k.prev_month_sales, locale)}`}
          badge={<DeltaBadge current={k.month_sales} previous={k.prev_month_sales} t={t} />}
        />
        <KpiCard
          icon={Wallet}
          tone={k.receivables_total > 0 ? "accent" : "default"}
          label={t("dashboardPage.kpiReceivables")}
          value={formatAmount(k.receivables_total, locale)}
          hint={`${formatQty(k.debtors_count)} ${t("dashboardPage.debtorsCount")}`}
        />
        <KpiCard
          icon={Banknote}
          tone="good"
          label={t("dashboardPage.kpiMonthCollections")}
          value={formatAmount(k.month_collections, locale)}
          hint={`${t("dashboardPage.monthReturns")}: ${formatAmount(k.month_returns, locale)}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ActionTile href="/sales" icon={FileClock} count={k.draft_sales_count} label={t("dashboardPage.draftSales")} tone="bg-amber-50 text-amber-800" />
        <ActionTile href="/requests" icon={ClipboardList} count={k.pending_requests_count} label={t("dashboardPage.pendingRequests")} tone="bg-sky-50 text-sky-800" />
        <ActionTile href="/stock" icon={AlertTriangle} count={k.low_stock_count} label={t("dashboardPage.lowStockItems")} tone="bg-rose-50 text-rose-800" />
        <ActionTile href="/traders" icon={Users} count={k.traders_count} label={t("dashboardPage.tradersCount")} tone="bg-white text-hadidi-primary" />
      </div>

      {k.owed_to_company > 0 ? (
        <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-l from-hadidi-secondary-from to-hadidi-secondary-to p-5 text-white shadow-sm">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Landmark className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-white/80">{t("dashboardPage.owedToCompany")}</p>
            <p className="text-2xl font-extrabold">{formatAmount(k.owed_to_company, locale)}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("dashboardPage.trendTitle")} subtitle={t("dashboardPage.trendSubtitle")} />
          <TrendBars
            data={d.trend}
            locale={locale}
            labels={{ sales: t("dashboardPage.seriesSales"), returns: t("dashboardPage.seriesReturns"), collections: t("dashboardPage.seriesCollections") }}
          />
        </Card>

        <Card>
          <CardHeader title={t("dashboardPage.categoryTitle")} subtitle={t("dashboardPage.categorySubtitle")} />
          {donutSegments.length === 0 ? (
            <EmptyNote>{t("stockPage.empty")}</EmptyNote>
          ) : (
            <Donut segments={donutSegments} locale={locale} centerLabel={t("dashboardPage.egp")} />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("dashboardPage.debtorsTitle")} subtitle={t("dashboardPage.debtorsSubtitle")} />
          {debtorRows.length === 0 ? <EmptyNote>{t("dashboardPage.noDebtors")}</EmptyNote> : <HBars rows={debtorRows} color="#ff9f1c" />}
        </Card>

        <Card>
          <CardHeader title={t("dashboardPage.topItemsTitle")} subtitle={t("dashboardPage.topItemsSubtitle")} />
          {topItemRows.length === 0 ? <EmptyNote>{t("dashboardPage.noSalesYet")}</EmptyNote> : <HBars rows={topItemRows} color="#3b59b3" />}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("dashboardPage.lowStockTitle")}
            action={
              <Link href="/stock" className="text-xs font-semibold text-hadidi-accent hover:underline">
                {t("dashboardPage.viewAll")}
              </Link>
            }
          />
          {d.low_stock.length === 0 ? (
            <EmptyNote>{t("dashboardPage.noLowStock")}</EmptyNote>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {d.low_stock.map((row) => (
                <li key={row.inventory_item_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-hadidi-primary">{itemFullLabel(row.item, t)}</span>
                  <span className="shrink-0 rounded-full bg-rose-500/15 px-2.5 py-0.5 font-mono text-xs font-bold text-rose-700">
                    {formatQty(row.quantity)} / {formatQty(row.reorder_threshold)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("dashboardPage.recentTitle")}
            action={
              <Link href="/sales" className="text-xs font-semibold text-hadidi-accent hover:underline">
                {t("dashboardPage.viewAll")}
              </Link>
            }
          />
          {d.recent_sales.length === 0 ? (
            <EmptyNote>{t("dashboardPage.noSalesYet")}</EmptyNote>
          ) : (
            <ul className="divide-y divide-black/[0.06]">
              {d.recent_sales.map((s) => (
                <li key={s.id}>
                  <Link href={`/sales/${s.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:opacity-80">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-hadidi-primary">{s.merchant?.name || t("common.dash")}</span>
                      <span className="block text-xs text-hadidi-subtle">
                        {s.reference_no} · {t(`salesPage.directions.${s.direction}`)} · {formatDateTime(s.created_at, locale)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-xs font-bold text-hadidi-primary">{formatAmount(s.final_total, locale)}</span>
                      <span
                        className={
                          s.status === "approved"
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                            : "rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                        }
                      >
                        {t(`salesPage.statuses.${s.status}`)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

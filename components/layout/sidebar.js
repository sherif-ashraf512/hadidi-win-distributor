"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, ChevronsLeft, ChevronsRight, ClipboardList, FileText, LayoutDashboard, LogOut, Package, Receipt, UserRound, Users, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useLocale } from "@/hooks/use-locale";
import { BrandLogoFull, BrandLogoMark } from "@/components/brand/brand-media";

/**
 * This portal has exactly one role, so unlike the staff dashboard's
 * desktop-nav-access.js there's no role/permission filtering here. Add
 * future distributor-portal pages by appending to this array; everything
 * else (collapse, mobile drawer, active highlighting) is already generic.
 * Notifications lives in the navbar bell (NotificationPopover), not here —
 * it doesn't need a permanent nav slot.
 */
const NAV_ITEMS = [
  { href: "/", labelKey: "portal.navDashboard", icon: LayoutDashboard },
  { href: "/stock", labelKey: "portal.navStock", icon: Package },
  { href: "/movements", labelKey: "portal.navMovements", icon: ArrowLeftRight },
  { href: "/requests", labelKey: "portal.navRequests", icon: ClipboardList },
  { href: "/traders", labelKey: "portal.navTraders", icon: Users },
  { href: "/sales", labelKey: "portal.navSales", icon: Receipt },
  { href: "/invoices", labelKey: "portal.navInvoices", icon: FileText },
];

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useLocale();
  const { data: user, mounted, hasToken } = useAuthUser();
  const isAr = locale === "ar";
  const ExpandIcon = isAr ? ChevronsLeft : ChevronsRight;
  const CollapseIcon = isAr ? ChevronsRight : ChevronsLeft;

  async function handleLogout() {
    try {
      await api.post("/distributor/auth/logout");
    } catch {
      /* best-effort — clear the local session regardless */
    } finally {
      clearToken();
      queryClient.clear();
      router.replace("/login");
    }
  }

  return (
    <aside
      data-app-sidebar
      className={[
        "flex min-h-0 shrink-0 flex-col bg-hadidi-primary text-white transition-[width,transform] duration-200 ease-out",
        "fixed inset-y-0 start-0 z-50 h-[100dvh] max-h-[100dvh] w-64 max-w-[min(100vw,18rem)] shadow-2xl",
        mobileOpen
          ? "translate-x-0 pointer-events-auto md:translate-x-0"
          : "max-md:ltr:-translate-x-full max-md:rtl:translate-x-full pointer-events-none md:pointer-events-auto md:translate-x-0",
        collapsed ? "md:w-[4.5rem] md:min-w-[4.5rem] md:max-w-[4.5rem]" : "md:w-64 md:min-w-64 md:max-w-none",
      ].join(" ")}
    >
      {collapsed ? (
        <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 px-2 py-3 md:items-center md:px-1 md:py-4">
          <div className="flex w-full items-center justify-between gap-2 md:hidden">
            <Link href="/" onClick={onCloseMobile} className="shrink-0" title={t("brand.logoAlt")}>
              <BrandLogoMark alt={t("brand.logoAlt")} className="size-10 object-contain" priority />
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
                aria-expanded={false}
                aria-label={t("sidebar.ariaExpand")}
              >
                <ExpandIcon className="size-5 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label={t("sidebar.ariaClose")}
                onClick={onCloseMobile}
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
          <div className="hidden w-full flex-col items-center gap-2.5 md:flex">
            <Link href="/" onClick={onCloseMobile} className="outline-none shrink-0" title={t("brand.logoAlt")}>
              <BrandLogoMark alt={t("brand.logoAlt")} className="size-9 object-contain" priority />
            </Link>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
              aria-expanded={false}
              aria-label={t("sidebar.ariaExpand")}
            >
              <ExpandIcon className="size-5 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-4 py-5 md:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link href="/" onClick={onCloseMobile} className="min-w-0 flex-1 outline-none" title={t("brand.logoAlt")}>
              <BrandLogoFull alt={t("brand.logoAlt")} className="h-10 w-auto max-w-full object-contain object-start" priority />
            </Link>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="mt-0.5 hidden size-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 md:inline-flex"
              aria-expanded
              aria-label={t("sidebar.ariaCollapse")}
            >
              <CollapseIcon className="size-5 shrink-0" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 md:hidden"
            aria-label={t("sidebar.ariaClose")}
            onClick={onCloseMobile}
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      <nav className="hide-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 md:p-3">
        {NAV_ITEMS.map((item) => {
          const label = t(item.labelKey);
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={label}
              onClick={onCloseMobile}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                collapsed ? "md:justify-center md:px-2" : "",
                active ? "bg-hadidi-accent text-hadidi-primary shadow-sm" : "text-white/90 hover:bg-white/10",
              ].join(" ")}
            >
              <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
              <span className={collapsed ? "md:sr-only" : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 p-2 md:p-3 space-y-1">
        {mounted && user ? (
          <div
            className={[
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/80",
              collapsed ? "md:justify-center md:px-2" : "",
            ].join(" ")}
          >
            <UserRound className="size-5 shrink-0 opacity-70" aria-hidden />
            <span className={collapsed ? "md:sr-only" : "truncate"}>{user.name}</span>
          </div>
        ) : null}
        {mounted && hasToken ? (
          <button
            type="button"
            onClick={handleLogout}
            aria-label={t("portal.logout")}
            className={[
              "flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/95 transition hover:bg-red-500/20 hover:text-white",
              collapsed ? "md:justify-center md:px-2" : "",
            ].join(" ")}
          >
            <LogOut className="size-5 shrink-0 text-red-300" aria-hidden />
            <span className={collapsed ? "md:sr-only" : ""}>{t("portal.logout")}</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}

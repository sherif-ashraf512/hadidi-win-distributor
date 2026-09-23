import { LOGO_FULL_PATHS } from "@/lib/logo-svg-paths";

/**
 * printTraderStatement — كشف حساب كامل لتاجر واحد (دفتره + عملياته
 * وفواتيره) — بيستخدم البيانات اللي أصلاً محملة في صفحة تفاصيل التاجر، من
 * غير أي طلب إضافي للسيرفر وقت الطباعة، زي كشف حساب التاجر في الداشبورد
 * الرئيسي.
 */
export function printTraderStatement({ trader, locale = "ar", distributorName, printedBy }) {
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const i18n = {
    ar: {
      title: "كشف حساب",
      printDate: "تاريخ الطباعة",
      printedBy: "طُبع بواسطة",
      infoTitle: "بيانات التاجر",
      name: "الاسم",
      phone: "التليفون",
      company: "الشركة",
      address: "العنوان",
      ledgerTitle: "الحساب",
      totalOwed: "إجمالي المستحق",
      totalPaid: "إجمالي المحصّل",
      remaining: "المتبقي",
      transactionsTitle: "عمليات البيع / المرتجع",
      colRef: "المرجع",
      colDirection: "النوع",
      colStatus: "الحالة",
      colTotal: "الإجمالي",
      colDate: "التاريخ",
      directions: { sale: "بيع", purchase: "مرتجع" },
      statuses: { draft: "مسودة", approved: "معتمد" },
      paymentsTitle: "التحصيلات",
      colMethod: "الطريقة",
      colAmount: "المبلغ",
      payment: "تحصيل",
      refund: "استرجاع",
      methods: { cash: "نقدي", bank_transfer: "تحويل بنكي", cheque: "شيك", instapay: "إنستاباي" },
      footerBrand: "Hadidi Win",
    },
    en: {
      title: "Account Statement",
      printDate: "Print Date",
      printedBy: "Printed by",
      infoTitle: "Trader Details",
      name: "Name",
      phone: "Phone",
      company: "Company",
      address: "Address",
      ledgerTitle: "Account",
      totalOwed: "Total Owed",
      totalPaid: "Total Collected",
      remaining: "Remaining",
      transactionsTitle: "Sales / Returns",
      colRef: "Reference",
      colDirection: "Type",
      colStatus: "Status",
      colTotal: "Total",
      colDate: "Date",
      directions: { sale: "Sale", purchase: "Return" },
      statuses: { draft: "Draft", approved: "Approved" },
      paymentsTitle: "Payments",
      colMethod: "Method",
      colAmount: "Amount",
      payment: "Payment",
      refund: "Refund",
      methods: { cash: "Cash", bank_transfer: "Bank transfer", cheque: "Cheque", instapay: "Instapay" },
      footerBrand: "Hadidi Win",
    },
  };

  const L = i18n[locale] ?? i18n.ar;

  const fmt = (v, dec = 2) => {
    if (v == null || Number.isNaN(Number(v))) return "—";
    const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(Number(v));
    return isRtl ? `${formatted} ج.م.` : `${formatted} EGP`;
  };

  const printDate = new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", {
    dateStyle: "long", timeStyle: "short", numberingSystem: "latn",
  }).format(new Date());

  const fmtDate = (iso, withTime = true) => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", {
      dateStyle: "medium", timeStyle: withTime ? "short" : undefined, numberingSystem: "latn",
    }).format(new Date(iso));
  };

  const ledger = trader?.ledger;
  const transactions = Array.isArray(trader?.b2b_transactions) ? trader.b2b_transactions : [];
  const payments = Array.isArray(ledger?.payments) ? ledger.payments : [];

  const transactionsRows = transactions.map((tr) => `
    <tr>
      <td style="font-weight:600;">${tr.reference_no || "—"}</td>
      <td>${L.directions[tr.direction] || tr.direction || "—"}</td>
      <td>${L.statuses[tr.status] || tr.status || "—"}</td>
      <td style="font-family:monospace;font-weight:700;">${fmt(tr.final_total)}</td>
      <td style="color:#64748b;">${fmtDate(tr.created_at)}</td>
    </tr>`).join("");

  const paymentsRows = payments.map((p) => `
    <tr>
      <td style="font-weight:600;">${p.type === "refund" ? L.refund : L.payment}</td>
      <td>${L.methods[p.method] || p.method || "—"}</td>
      <td style="font-family:monospace;font-weight:700;">${fmt(p.amount)}</td>
      <td style="color:#64748b;">${fmtDate(p.paid_at)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
  <meta charset="UTF-8"/>
  <title>${L.title} — ${trader?.name || ""}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#0f172a;font-size:13px;direction:${dir};padding:2.5cm 2cm;}
    @media print{body{padding:1.5cm 1.5cm !important;}@page{margin:0cm;size:A4 portrait}}
    table{border-collapse:collapse;width:100%}
    .box{border:1.5px solid #cbd5e1;border-radius:8px;padding:20px;}
    .lbl{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:6px;}
    .val{font-size:14px;font-weight:700;color:#0f172a;}
    .sec-title{font-size:13px;font-weight:800;color:#1a2340;margin:24px 0 10px;padding-bottom:6px;border-bottom:1.5px solid #e2e8f0;text-transform:uppercase;letter-spacing:.5px}
    th{padding:10px 12px;text-align:start;color:#1a2340;font-size:12px;font-weight:800;border-bottom:2px solid #1a2340;background:#f8fafc;}
    td{padding:10px 12px;font-size:12px;color:#334155;border-bottom:1px solid #e2e8f0;vertical-align:top;}
    tr:last-child td{border-bottom:none;}
    tr:nth-child(even) td{background:#f8fafc;}
  </style>
</head>
<body>
  <div style="text-align:center;padding-bottom:16px;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 722.63 200.15" style="height:48px;margin:0 auto;display:block;">${LOGO_FULL_PATHS}</svg>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1a2340;padding-bottom:20px;margin-bottom:32px;">
    <div style="font-size:20px;font-weight:800;color:#1a2340;letter-spacing:.5px;">${distributorName || (isRtl ? "الموزع" : "Distributor")}</div>
    <div style="text-align:${isRtl ? "left" : "right"}">
      <div style="color:#1a2340;font-size:22px;font-weight:800;letter-spacing:1px;">${L.title}</div>
      <div style="color:#64748b;font-size:13px;font-weight:600;margin-top:4px;">${L.printDate}: ${printDate}</div>
      ${printedBy ? `<div style="color:#94a3b8;font-size:12px;margin-top:2px;">${L.printedBy}: ${printedBy}</div>` : ""}
    </div>
  </div>

  <div class="box" style="margin-bottom:28px;">
    <div style="font-size:12px;font-weight:800;color:#1a2340;margin-bottom:16px;border-bottom:1.5px solid #e2e8f0;padding-bottom:8px;text-transform:uppercase;">${L.infoTitle}</div>
    <div style="display:flex;flex-wrap:wrap;gap:32px;">
      <div><div class="lbl">${L.name}</div><div class="val">${trader?.name || "—"}</div></div>
      ${trader?.phone ? `<div><div class="lbl">${L.phone}</div><div class="val">${trader.phone}</div></div>` : ""}
      ${trader?.company_name ? `<div><div class="lbl">${L.company}</div><div class="val">${trader.company_name}</div></div>` : ""}
      ${trader?.address ? `<div><div class="lbl">${L.address}</div><div class="val">${trader.address}</div></div>` : ""}
    </div>
  </div>

  <div class="box" style="margin-bottom:28px;">
    <div style="font-size:12px;font-weight:800;color:#1a2340;margin-bottom:16px;border-bottom:1.5px solid #e2e8f0;padding-bottom:8px;text-transform:uppercase;">${L.ledgerTitle}</div>
    <div style="display:flex;flex-wrap:wrap;gap:32px;">
      <div><div class="lbl">${L.totalOwed}</div><div class="val">${fmt(ledger?.total_amount ?? 0)}</div></div>
      <div><div class="lbl">${L.totalPaid}</div><div class="val">${fmt(ledger?.amount_paid ?? 0)}</div></div>
      <div><div class="lbl">${L.remaining}</div><div class="val" style="color:${Number(ledger?.remaining_balance || 0) > 0.01 ? "#dc2626" : "#16a34a"};">${fmt(ledger?.remaining_balance ?? 0)}</div></div>
    </div>
  </div>

  ${transactions.length > 0 ? `
  <div class="sec-title">${L.transactionsTitle}</div>
  <table>
    <thead><tr>
      <th style="width:22%">${L.colRef}</th>
      <th style="width:16%">${L.colDirection}</th>
      <th style="width:16%">${L.colStatus}</th>
      <th style="width:22%">${L.colTotal}</th>
      <th style="width:24%">${L.colDate}</th>
    </tr></thead>
    <tbody>${transactionsRows}</tbody>
  </table>` : ""}

  ${payments.length > 0 ? `
  <div class="sec-title">${L.paymentsTitle}</div>
  <table>
    <thead><tr>
      <th style="width:25%">${L.colDirection}</th>
      <th style="width:25%">${L.colMethod}</th>
      <th style="width:25%">${L.colAmount}</th>
      <th style="width:25%">${L.colDate}</th>
    </tr></thead>
    <tbody>${paymentsRows}</tbody>
  </table>` : ""}

  <div style="text-align:center;margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
    ${L.footerBrand} &nbsp;·&nbsp; ${L.title} — ${trader?.name || ""}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=720");
  if (!win) {
    alert(isRtl ? "يرجى السماح للموقع بفتح نوافذ منبثقة لتتمكن من الطباعة." : "Please allow popups for this site to enable printing.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onafterprint = () => win.close();
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => win.close(), 1000);
  }, 400);
}

import { LOGO_FULL_PATHS } from "@/lib/logo-svg-paths";

/**
 * printInvoice — طباعة فاتورة واحدة (مُصدرة تلقائيًا عند اعتماد عملية بيع/
 * مرتجع أو تسجيل تحصيل)، مع لقطة من حساب التاجر وقت الإصدار (اللي عليه،
 * اللي دفعه، والمتبقي) — مأخوذة من نفس الحقول المخزنة على الفاتورة نفسها،
 * مفيش أي حاجة بتتحسب من جديد وقت الطباعة. اللوجو في النص فوق (بعكس فاتورة/
 * عرض السعر بتاعة العملية اللي اللوجو فيها على الجنب) بناءً على طلب صريح.
 */
export function printInvoice({ invoice, locale = "ar", distributorName, printedBy }) {
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const i18n = {
    ar: {
      title: "فاتورة",
      printDate: "تاريخ الطباعة",
      printedBy: "طُبع بواسطة",
      infoTitle: "بيانات الفاتورة",
      reference: "رقم الفاتورة",
      trader: "التاجر",
      type: "النوع",
      issueDate: "تاريخ الإصدار",
      types: { b2b_sale: "فاتورة بيع", b2b_return: "فاتورة مرتجع", receipt: "إيصال تحصيل", refund: "إيصال استرجاع" },
      itemsTitle: "الأصناف",
      colDescription: "البيان",
      colQty: "الكمية",
      colPrice: "السعر",
      colTotal: "الإجمالي",
      summarySubtotal: "الإجمالي الفرعي",
      summaryDiscount: "الخصم",
      summaryTax: "الضريبة",
      summaryFinal: "الإجمالي",
      snapshotTitle: "حساب التاجر وقت الإصدار",
      snapshotTotal: "إجمالي المستحق",
      snapshotPaid: "المحصّل",
      snapshotRemaining: "المتبقي",
      footerBrand: "Hadidi Win",
    },
    en: {
      title: "Invoice",
      printDate: "Print Date",
      printedBy: "Printed by",
      infoTitle: "Invoice Details",
      reference: "Invoice No.",
      trader: "Trader",
      type: "Type",
      issueDate: "Issue Date",
      types: { b2b_sale: "Sale Invoice", b2b_return: "Return Invoice", receipt: "Payment Receipt", refund: "Refund Receipt" },
      itemsTitle: "Items",
      colDescription: "Description",
      colQty: "Quantity",
      colPrice: "Price",
      colTotal: "Total",
      summarySubtotal: "Subtotal",
      summaryDiscount: "Discount",
      summaryTax: "Tax",
      summaryFinal: "Total",
      snapshotTitle: "Trader's Account at Issue Time",
      snapshotTotal: "Total Owed",
      snapshotPaid: "Collected",
      snapshotRemaining: "Remaining",
      footerBrand: "Hadidi Win",
    },
  };

  const L = i18n[locale] ?? i18n.ar;

  const fmt = (v, dec = 6) => {
    if (v == null || Number.isNaN(Number(v))) return "—";
    const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(Number(v));
    return isRtl ? `${formatted} ج.م.` : `${formatted} EGP`;
  };
  const fmtQty = (v) => {
    if (v == null || Number.isNaN(Number(v))) return "—";
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(Number(v));
  };

  const printDate = new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", {
    dateStyle: "long", timeStyle: "short", numberingSystem: "latn",
  }).format(new Date());

  const issueDate = invoice?.issue_date
    ? new Intl.DateTimeFormat(isRtl ? "ar-EG" : "en-US", { dateStyle: "long", numberingSystem: "latn" }).format(new Date(invoice.issue_date))
    : "—";

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const rowsHtml = items.map((row) => {
    const lineTotal = row.subtotal != null ? Number(row.subtotal) : Number(row.quantity || 0) * Number(row.unit_price || 0);
    return `
      <tr>
        <td style="font-weight:600;">${row.description || "—"}</td>
        <td style="font-family:monospace;">${fmtQty(row.quantity)}</td>
        <td style="font-family:monospace;">${fmt(row.unit_price)}</td>
        <td style="font-family:monospace;font-weight:700;">${fmt(lineTotal)}</td>
      </tr>`;
  }).join("");

  const hasSnapshot = invoice?.ledger_remaining_balance != null;
  const remaining = Number(invoice?.ledger_remaining_balance || 0);

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
  <meta charset="UTF-8"/>
  <title>${L.title} — ${invoice?.invoice_no || ""}</title>
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 722.63 200.15" style="height:52px;margin:0 auto;display:block;">${LOGO_FULL_PATHS}</svg>
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
      <div><div class="lbl">${L.reference}</div><div class="val">${invoice?.invoice_no || "—"}</div></div>
      <div><div class="lbl">${L.trader}</div><div class="val">${invoice?.owner?.name || "—"}</div></div>
      <div><div class="lbl">${L.type}</div><div class="val">${L.types[invoice?.type] || invoice?.type || "—"}</div></div>
      <div><div class="lbl">${L.issueDate}</div><div class="val">${issueDate}</div></div>
    </div>
  </div>

  ${items.length > 0 ? `
  <div class="sec-title">${L.itemsTitle}</div>
  <table>
    <thead><tr>
      <th style="width:46%">${L.colDescription}</th>
      <th style="width:18%">${L.colQty}</th>
      <th style="width:18%">${L.colPrice}</th>
      <th style="width:18%">${L.colTotal}</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>` : ""}

  <div style="display:flex;justify-content:flex-end;margin-top:20px;">
    <div class="box" style="min-width:320px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">${L.summarySubtotal}</span>
        <span style="font-weight:700;color:#334155;font-family:monospace;">${fmt(invoice?.subtotal)}</span>
      </div>
      ${Number(invoice?.discount_amount) > 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">${L.summaryDiscount}</span>
        <span style="font-weight:700;color:#dc2626;font-family:monospace;">-${fmt(invoice.discount_amount)}</span>
      </div>` : ""}
      ${Number(invoice?.tax_amount) > 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">${L.summaryTax}</span>
        <span style="font-weight:700;color:#334155;font-family:monospace;">+${fmt(invoice.tax_amount)}</span>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:24px;border-top:1.5px solid #cbd5e1;padding-top:12px;">
        <span style="color:#1a2340;font-size:15px;font-weight:800;">${L.summaryFinal}</span>
        <span style="font-weight:800;font-family:monospace;font-size:20px;color:#1a2340;">${fmt(invoice?.total)}</span>
      </div>
    </div>
  </div>

  ${hasSnapshot ? `
  <div class="box" style="margin-top:20px;">
    <div style="font-size:12px;font-weight:800;color:#1a2340;margin-bottom:16px;border-bottom:1.5px solid #e2e8f0;padding-bottom:8px;text-transform:uppercase;">${L.snapshotTitle}</div>
    <div style="display:flex;flex-wrap:wrap;gap:32px;">
      <div><div class="lbl">${L.snapshotTotal}</div><div class="val">${fmt(invoice.ledger_total_amount)}</div></div>
      <div><div class="lbl">${L.snapshotPaid}</div><div class="val">${fmt(invoice.ledger_paid_amount)}</div></div>
      <div><div class="lbl">${L.snapshotRemaining}</div><div class="val" style="color:${remaining > 0.01 ? "#dc2626" : "#16a34a"};">${fmt(invoice.ledger_remaining_balance)}</div></div>
    </div>
  </div>` : ""}

  <div style="text-align:center;margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
    ${L.footerBrand} &nbsp;·&nbsp; ${L.title} — ${invoice?.invoice_no || ""}
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

import { LOGO_FULL_PATHS } from "@/lib/logo-svg-paths";

/* printRequestQuote — نافذة طباعة منفصلة لعرض سعر طلب واحد بس (بدون بيانات صرف داخلية). */
export function printRequestQuote({ request, locale = "ar", printedBy }) {
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const i18n = {
    ar: {
      title: "عرض سعر — طلب",
      printDate: "تاريخ الطباعة",
      printedBy: "طُبع بواسطة",
      infoTitle: "بيانات الطلب",
      reference: "المرجع",
      type: "النوع",
      typePurchase: "شراء",
      typeReturn: "مرتجع",
      itemsTitle: "الأصناف",
      colItem: "الصنف",
      colCategory: "الفئة",
      colCatalogable: "نوع القطاع",
      colColor: "اللون",
      colQty: "الكمية",
      colPrice: "السعر",
      colDiscount: "الخصم %",
      colTotal: "الإجمالي",
      summarySubtotal: "الإجمالي الفرعي",
      summaryDiscount: "الخصم",
      summaryTax: "الضريبة",
      summarySettlement: "التسوية",
      summaryFinal: "الإجمالي النهائي",
      footerBrand: "Hadidi Win",
    },
    en: {
      title: "Price Quote — Request",
      printDate: "Print Date",
      printedBy: "Printed by",
      infoTitle: "Request Details",
      reference: "Reference",
      type: "Type",
      typePurchase: "Purchase",
      typeReturn: "Return",
      itemsTitle: "Items",
      colItem: "Item",
      colCategory: "Category",
      colCatalogable: "Section Type",
      colColor: "Color",
      colQty: "Quantity",
      colPrice: "Price",
      colDiscount: "Discount %",
      colTotal: "Total",
      summarySubtotal: "Subtotal",
      summaryDiscount: "Discount",
      summaryTax: "Tax",
      summarySettlement: "Settlement",
      summaryFinal: "Final Total",
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

  const CATEGORY_LABELS = {
    ar: { profile: "قطاع", accessory: "إكسسوار", glass: "زجاج", seal: "سلك", rebar: "حديد", general: "فئة عامة" },
    en: { profile: "Profile", accessory: "Accessory", glass: "Glass", seal: "Seal", rebar: "Rebar", general: "General" },
  };
  const categoryLabel = (category) => (CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.ar)[category] ?? category ?? "—";

  const items = Array.isArray(request?.items) ? request.items : [];

  const itemName = (item) => item?.display_name || item?.catalogable?.display_name || `#${item?.id ?? ""}`;

  const rowsHtml = items.map((row) => {
    const item = row.inventory_item;
    return `
      <tr>
        <td style="font-weight:600;">${itemName(item)}</td>
        <td style="color:#64748b;">${categoryLabel(item?.category)}</td>
        <td style="color:#64748b;">${item?.catalogable?.display_name || "—"}</td>
        <td style="color:#64748b;">${item?.color?.display_name || "—"}</td>
        <td style="font-family:monospace;">${fmtQty(row.quantity)}</td>
        <td style="font-family:monospace;">${fmt(row.unit_price)}</td>
        <td style="font-family:monospace;">${row.discount_percent ? `${fmtQty(row.discount_percent)}%` : "—"}</td>
        <td style="font-family:monospace;font-weight:700;">${fmt(row.line_total)}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head>
  <meta charset="UTF-8"/>
  <title>${L.title} — ${request?.reference_no || ""}</title>
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
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1a2340;padding-bottom:20px;margin-bottom:32px;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 722.63 200.15" style="height:48px;flex-shrink:0;">${LOGO_FULL_PATHS}</svg>
    <div style="text-align:${isRtl ? "left" : "right"}">
      <div style="color:#1a2340;font-size:22px;font-weight:800;letter-spacing:1px;">${L.title}</div>
      <div style="color:#64748b;font-size:13px;font-weight:600;margin-top:4px;">${L.printDate}: ${printDate}</div>
      ${printedBy ? `<div style="color:#94a3b8;font-size:12px;margin-top:2px;">${L.printedBy}: ${printedBy}</div>` : ""}
    </div>
  </div>

  <div class="box" style="margin-bottom:28px;">
    <div style="font-size:12px;font-weight:800;color:#1a2340;margin-bottom:16px;border-bottom:1.5px solid #e2e8f0;padding-bottom:8px;text-transform:uppercase;">${L.infoTitle}</div>
    <div style="display:flex;flex-wrap:wrap;gap:32px;">
      <div><div class="lbl">${L.reference}</div><div class="val">${request?.reference_no || "—"}</div></div>
      <div><div class="lbl">${L.type}</div><div class="val">${request?.type === "return" ? L.typeReturn : L.typePurchase}</div></div>
    </div>
  </div>

  <div class="sec-title">${L.itemsTitle}</div>
  <table>
    <thead><tr>
      <th style="width:20%">${L.colItem}</th>
      <th style="width:14%">${L.colCategory}</th>
      <th style="width:14%">${L.colCatalogable}</th>
      <th style="width:12%">${L.colColor}</th>
      <th style="width:10%">${L.colQty}</th>
      <th style="width:10%">${L.colPrice}</th>
      <th style="width:8%">${L.colDiscount}</th>
      <th style="width:12%">${L.colTotal}</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-top:20px;">
    <div class="box" style="min-width:320px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">${L.summarySubtotal}</span>
        <span style="font-weight:700;color:#334155;font-family:monospace;">${fmt(request?.total_amount)}</span>
      </div>
      ${Number(request?.discount_percent) > 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">${L.summaryDiscount} (${fmtQty(request.discount_percent)}%)</span>
        <span style="font-weight:700;color:#dc2626;font-family:monospace;">-${fmt(request.discount_amount)}</span>
      </div>` : ""}
      ${Number(request?.tax_percent) > 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">${L.summaryTax} (${fmtQty(request.tax_percent)}%)</span>
        <span style="font-weight:700;color:#334155;font-family:monospace;">+${fmt(request.tax_amount)}</span>
      </div>` : ""}
      ${Number(request?.settlement_amount) !== 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:24px;">
        <span style="color:#475569;font-size:13px;font-weight:600;">${L.summarySettlement}</span>
        <span style="font-weight:700;color:#334155;font-family:monospace;">${fmt(request.settlement_amount)}</span>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:24px;border-top:1.5px solid #cbd5e1;padding-top:12px;">
        <span style="color:#1a2340;font-size:15px;font-weight:800;">${L.summaryFinal}</span>
        <span style="font-weight:800;font-family:monospace;font-size:20px;color:#1a2340;">${fmt(request?.final_total)}</span>
      </div>
    </div>
  </div>

  <div style="text-align:center;margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
    ${L.footerBrand} &nbsp;·&nbsp; ${L.title} — ${request?.reference_no || ""}
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

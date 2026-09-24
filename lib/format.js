/** Quantities always render in Western digits (0-9), regardless of UI language. */
export function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(n);
}

/** Short form for chart axes/centres (12.4K, 1.2M) — Western digits always. */
export function formatCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Dates keep Arabic month/weekday names in ar locale, but digits stay Latin. */
export function formatDateTime(iso, locale) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const loc = locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.DateTimeFormat(loc, { dateStyle: "short", timeStyle: "short", numberingSystem: "latn" }).format(d);
}

/** Money amounts — same convention as the staff dashboard's formatAccountingEgp(): Western digits, EGP/ج.م. suffix. */
export function formatAmount(value, locale, fractionDigits = 6) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const formattedNumber = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(n);
  const suffix = locale === "ar" ? " ج.م.‏" : " EGP";
  return `${formattedNumber}${suffix}`;
}

/**
 * Cleans a raw numeric value (often a fixed-decimal string straight from a
 * Laravel `decimal:N` cast, e.g. "3.000" or "200.00") into a plain string
 * suitable for an editable number <Input> — no trailing zeros, no forced
 * decimal point when the value is a whole number. Returns "" for
 * null/undefined/non-numeric so an empty optional field stays empty rather
 * than showing "0".
 */
export function cleanNumberInput(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

export function warehouseLabel(w, locale) {
  if (!w) return "—";
  return locale === "ar" ? w.name_ar || w.name_en : w.name_en || w.name_ar;
}

function parsePrice(price) {
  if (typeof price === "number") {
    return Number.isFinite(price) ? price : 0;
  }

  if (typeof price !== "string") return 0;

  const normalized = price.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(price) {
  const normalizedPrice = parsePrice(price);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(normalizedPrice);
}

export { formatPrice, parsePrice };

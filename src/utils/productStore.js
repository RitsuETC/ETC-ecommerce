import defaultProducts from "../data/products";

const PRODUCT_STORAGE_KEY = "etc_store_products";
const defaultProductLookup = new Map(
  defaultProducts.flatMap((product) => {
    const entries = [[String(product.id || ""), Number(product.dbId) || null]];

    if (product.name) {
      entries.push([String(product.name).trim().toLowerCase(), Number(product.dbId) || null]);
    }

    if (product.image) {
      entries.push([String(product.image).trim(), Number(product.dbId) || null]);
    }

    return entries;
  })
);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProduct(product, fallbackIndex = 0) {
  const name = String(product?.name || "").trim();
  const category = String(product?.category || "").trim() || "Lainnya";
  const description = String(product?.description || "").trim();
  const image = String(product?.image || "").trim();
  const price = String(product?.price || "").trim();
  const rawContents = Array.isArray(product?.contents)
    ? product.contents
    : String(product?.contents || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

  const contents = rawContents.map((item) => String(item).trim()).filter(Boolean);
  const id =
    String(product?.id || "").trim() || slugify(name) || `product-${fallbackIndex + 1}`;
  const dbId =
    Number(product?.dbId) ||
    defaultProductLookup.get(id) ||
    defaultProductLookup.get(name.toLowerCase()) ||
    defaultProductLookup.get(image) ||
    null;

  return {
    dbId,
    id,
    category,
    name,
    price,
    image,
    description,
    contents,
  };
}

function normalizeProducts(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((product, index) => normalizeProduct(product, index))
    .filter((product) => product.name && product.price);
}

function getProducts() {
  try {
    const raw = localStorage.getItem(PRODUCT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const normalized = normalizeProducts(parsed);

    if (normalized.length > 0) return normalized;
  } catch {
    // fall back to defaults
  }

  return normalizeProducts(defaultProducts);
}

function saveProducts(products) {
  const normalized = normalizeProducts(products);
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

const ProductStore = {
  getProducts,
  normalizeProduct,
  saveProducts,
  slugify,
};

export default ProductStore;

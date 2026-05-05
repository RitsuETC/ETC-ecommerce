const CART_STORAGE_KEY = "etc_store_cart";

function getCartStorageKey(userEmail) {
  if (!userEmail) return `${CART_STORAGE_KEY}_guest`;

  return `${CART_STORAGE_KEY}_${String(userEmail).trim().toLowerCase()}`;
}

function normalizeCart(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      id: String(item.id || ""),
      dbId: Number(item.dbId) || null,
      qty: Number(item.qty) || 0,
    }))
    .filter((item) => item.id && item.qty > 0);
}

function getCart(userEmail) {
  try {
    const raw = localStorage.getItem(getCartStorageKey(userEmail));
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeCart(parsed);
  } catch {
    return [];
  }
}

function saveCart(userEmail, cart) {
  const normalized = normalizeCart(cart);
  localStorage.setItem(getCartStorageKey(userEmail), JSON.stringify(normalized));
}

function addToCart(cart, productId, quantity, productDbId = null) {
  const qtyToAdd = Number(quantity);
  if (!productId || Number.isNaN(qtyToAdd) || qtyToAdd <= 0) return normalizeCart(cart);

  const nextCart = normalizeCart(cart);
  const existing = nextCart.find((item) => item.id === productId);

  if (existing) {
    existing.qty += qtyToAdd;
  } else {
    nextCart.push({
      id: String(productId || ""),
      dbId: Number(productDbId) || null,
      qty: qtyToAdd,
    });
  }

  return normalizeCart(nextCart);
}

function updateCartQuantity(cart, productId, quantity) {
  const nextQty = Number(quantity);
  if (!productId || Number.isNaN(nextQty)) return normalizeCart(cart);

  if (nextQty <= 0) {
    return removeFromCart(cart, productId);
  }

  return normalizeCart(
    normalizeCart(cart).map((item) =>
      item.id === productId ? { ...item, qty: nextQty } : item
    )
  );
}

function removeFromCart(cart, productId) {
  return normalizeCart(cart).filter((item) => item.id !== productId);
}

const CartStore = {
  addToCart,
  getCart,
  getCartStorageKey,
  removeFromCart,
  saveCart,
  updateCartQuantity,
};

export default CartStore;

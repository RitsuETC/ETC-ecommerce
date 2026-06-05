import { useState, useCallback } from 'react';

const USER_API_URL = import.meta.env.VITE_USER_API_URL || "/api/user.php";

export function useCart(user, productList, normalizeBackendCartItems) {
  const [cart, setCart] = useState([]);
  const [cartFeedback, setCartFeedback] = useState("");

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart([]);
      return;
    }
    try {
      const response = await fetch(`${USER_API_URL}?action=cart`, { credentials: "include" });
      const result = await response.json();
      if (response.ok && result.success) {
        setCart(normalizeBackendCartItems(result.data?.items, productList));
      }
    } catch (error) {
      console.error("Failed to sync cart", error);
    }
  }, [user, productList, normalizeBackendCartItems]);

  const addToCart = async (productId, qty) => {
    if (!user) return false;
    
    const product = productList.find((entry) => entry.id === productId);
    const productDbId = Number(product?.dbId) || 0;

    try {
      const response = await fetch(`${USER_API_URL}?action=cart_add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productDbId, qty }),
      });
      const result = await response.json();
      if (result.success) {
        setCart(normalizeBackendCartItems(result.data?.items, productList));
        return true;
      }
    } catch (e) {
      return false;
    }
  };

  const removeCartItem = async (productId) => {
    const cartItem = cart.find((item) => item.id === productId);
    const productDbId = Number(cartItem?.dbId) || 0;

    try {
      const response = await fetch(`${USER_API_URL}?action=cart_remove`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productDbId }),
      });
      const result = await response.json();
      if (result.success) {
        setCart(normalizeBackendCartItems(result.data?.items, productList));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return {
    cart,
    setCart,
    cartFeedback,
    setCartFeedback,
    fetchCart,
    addToCart,
    removeCartItem
  };
}
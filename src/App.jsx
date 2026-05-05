import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import CartStore from "./utils/cartStore";
import { parsePrice } from "./utils/price";
import ProductStore from "./utils/productStore";
import CatalogPage from "./pages/CatalogPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import PaymentPage from "./pages/PaymentPage";
import AdminPage from "./pages/AdminPage";
import UserTransactionsPage from "./pages/UserTransactionsPage";

const USER_STORAGE_KEY = "etc_store_user";
const SEARCH_HISTORY_KEY = "etc_store_recent_searches";
const LOGIN_EMAIL_HISTORY_KEY = "etc_store_login_emails";
const USER_API_URL = import.meta.env.VITE_USER_API_URL || "/api/user.php";

function getCurrentPage() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");

  if (page === "cart" || page === "payment" || page === "admin" || page === "orders") return page;

  return "products";
}

function getSelectedProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function getSavedUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!parsed?.email) return null;

    return {
      name: String(parsed.name || deriveDisplayName(String(parsed.email))),
      email: String(parsed.email),
      status: String(parsed.status || "Member aktif"),
      role: String(parsed.role || "user"),
    };
  } catch {
    return null;
  }
}

function deriveDisplayName(email) {
  const localPart = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!localPart) return "User ETC";

  return localPart.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeBackendUser(userData) {
  if (!userData?.email) return null;

  const email = String(userData.email);
  return {
    name: deriveDisplayName(email),
    email,
    status: Number(userData.verified) === 1 ? "Member aktif" : "Belum diverifikasi",
    role: String(userData.role || "user"),
  };
}

function normalizeBackendCartItems(items, products) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const dbId = Number(item?.productId || item?.dbId || 0);
      const qty = Number(item?.qty) || 0;
      const product = products.find((entry) => Number(entry.dbId) === dbId);

      if (!product || qty <= 0) {
        return null;
      }

      return {
        id: product.id,
        dbId,
        qty,
      };
    })
    .filter(Boolean);
}

async function fetchProductsFromBackend() {
  const response = await fetch(`${USER_API_URL}?action=products`, {
    credentials: "include",
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Gagal mengambil produk.");
  }

  return Array.isArray(result.data?.items) ? result.data.items : [];
}

async function fetchTransactionsFromBackend() {
  const response = await fetch(`${USER_API_URL}?action=transactions`, {
    credentials: "include",
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Gagal mengambil transaksi.");
  }

  return Array.isArray(result.data?.items) ? result.data.items : [];
}

async function fetchCommentsFromBackend() {
  const response = await fetch(`${USER_API_URL}?action=comments`, {
    credentials: "include",
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Gagal mengambil komentar.");
  }

  return Array.isArray(result.data?.items) ? result.data.items : [];
}

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function getLoginEmailHistory() {
  try {
    const raw = localStorage.getItem(LOGIN_EMAIL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function updateBrowserState({ page, productId, replace = false }) {
  const params = new URLSearchParams();

  if (page === "cart" || page === "payment" || page === "admin" || page === "orders") {
    params.set("page", page);
  }

  if (productId) {
    params.set("id", productId);
  }

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  const historyMethod = replace ? "replaceState" : "pushState";
  window.history[historyMethod]({}, "", nextUrl);
}

function App() {
  const [selectedProductId, setSelectedProductId] = useState(getSelectedProductId);
  const [currentPage, setCurrentPage] = useState(getCurrentPage);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);
  const searchFormRef = useRef(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(getSavedUser);
  const [productList, setProductList] = useState(() => ProductStore.getProducts());
  const [comments, setComments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCartIds, setSelectedCartIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [cartFeedback, setCartFeedback] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [paymentItems, setPaymentItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [recentLoginEmails, setRecentLoginEmails] = useState(getLoginEmailHistory);
  const [loginMessage, setLoginMessage] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);

  const categories = useMemo(
    () => ["Semua", ...new Set(productList.map((product) => product.category))],
    [productList]
  );

  const selectedProduct = useMemo(
    () => productList.find((product) => product.id === selectedProductId) || null,
    [productList, selectedProductId]
  );
  const selectedProductComments = useMemo(
    () => {
      const selectedDbId = Number(selectedProduct?.dbId) || 0;

      return comments
        .filter((comment) => Number(comment.productId) === selectedDbId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    [comments, selectedProduct]
  );

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return productList.filter((product) => {
      const matchesCategory =
        activeCategory === "Semua" ? true : product.category === activeCategory;
      const matchesKeyword = keyword ? product.name.toLowerCase().includes(keyword) : true;

      return matchesCategory && matchesKeyword;
    });
  }, [activeCategory, productList, searchTerm]);

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.qty, 0),
    [cart]
  );

  const cartItems = useMemo(
    () =>
      cart
        .map((item) => {
          const product = productList.find((entry) => entry.id === item.id);
          return product ? { ...product, qty: item.qty } : null;
        })
        .filter(Boolean),
    [cart, productList]
  );

  const selectedCartItems = useMemo(
    () => cartItems.filter((item) => selectedCartIds.includes(item.id)),
    [cartItems, selectedCartIds]
  );

  const selectedCartCount = useMemo(
    () => selectedCartItems.reduce((total, item) => total + item.qty, 0),
    [selectedCartItems]
  );

  const selectedCartTotalPrice = useMemo(
    () => selectedCartItems.reduce((total, item) => total + item.qty * parsePrice(item.price), 0),
    [selectedCartItems]
  );

  const paymentTotalPrice = useMemo(
    () => paymentItems.reduce((total, item) => total + item.qty * parsePrice(item.price), 0),
    [paymentItems]
  );
  const userTransactions = useMemo(
    () =>
      user?.email
        ? transactions.filter(
            (transaction) => transaction.customerEmail.toLowerCase() === user.email.toLowerCase()
          )
        : [],
    [transactions, user]
  );

  const allCartSelected = cartItems.length > 0 && selectedCartIds.length === cartItems.length;

  useEffect(() => {
    function handlePopState() {
      setSelectedProductId(getSelectedProductId());
      setCurrentPage(getCurrentPage());
      setCartFeedback("");
      setQuantity(1);
    }

    function handleStorage() {
      const storedUser = getSavedUser();
      setUser(storedUser);
      setProductList(ProductStore.getProducts());
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncProducts() {
      try {
        const nextProducts = await fetchProductsFromBackend();
        if (cancelled) return;
        setProductList(ProductStore.saveProducts(nextProducts));
      } catch {
        if (cancelled) return;
        setProductList(ProductStore.getProducts());
      }
    }

    async function syncSessionOnLoad() {
      try {
        const response = await fetch(`${USER_API_URL}?action=session`, {
          credentials: "include",
        });
        const result = await response.json();

        if (cancelled) return;
        if (!response.ok || !result.success) {
          setUser(null);
          setCart([]);
          return;
        }

        setUser(normalizeBackendUser(result.data?.user));
      } catch {
        if (cancelled) return;
        setUser(getSavedUser());
      }
    }

    syncProducts();
    syncSessionOnLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(recentSearches.slice(0, 5)));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem(LOGIN_EMAIL_HISTORY_KEY, JSON.stringify(recentLoginEmails.slice(0, 5)));
  }, [recentLoginEmails]);

  useEffect(() => {
    let cancelled = false;

    async function syncCart() {
      if (!user) {
        setCart([]);
        return;
      }

      try {
        const response = await fetch(`${USER_API_URL}?action=cart`, {
          credentials: "include",
        });
        const result = await response.json();

        if (cancelled) return;
        if (!response.ok || !result.success) {
          setCart([]);
          return;
        }

        setCart(normalizeBackendCartItems(result.data?.items, productList));
      } catch {
        if (cancelled) return;
        setCart([]);
      }
    }

    syncCart();

    return () => {
      cancelled = true;
    };
  }, [user, productList]);

  useEffect(() => {
    let cancelled = false;

    async function syncComments() {
      try {
        const nextComments = await fetchCommentsFromBackend();
        if (cancelled) return;
        setComments(nextComments);
      } catch {
        if (cancelled) return;
        setComments([]);
      }
    }

    syncComments();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncTransactions() {
      if (!user) {
        setTransactions([]);
        return;
      }

      try {
        const nextTransactions = await fetchTransactionsFromBackend();
        if (cancelled) return;
        setTransactions(nextTransactions);
      } catch {
        if (cancelled) return;
        setTransactions([]);
      }
    }

    syncTransactions();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedProductId) return;
    if (selectedProduct) return;

    setSelectedProductId("");
    setCurrentPage("products");
    updateBrowserState({ page: "products", replace: true });
  }, [selectedProduct, selectedProductId]);

  useEffect(() => {
    if (currentPage === "products") return;

    let cancelled = false;

    async function validateCurrentPageAccess() {
      try {
        const response = await fetch(
          `${USER_API_URL}?action=guard&page=${encodeURIComponent(currentPage)}`,
          {
            credentials: "include",
          }
        );
        const result = await response.json();

        if (cancelled) return;

        setUser(normalizeBackendUser(result.data?.user));

        if (response.ok && result.success) return;

        updateBrowserState({ page: "products", replace: true });
        setCurrentPage("products");
        setLoginMessage(result.message || "Akses halaman ditolak.");
        setMenuOpen(true);
      } catch {
        if (cancelled) return;

        updateBrowserState({ page: "products", replace: true });
        setCurrentPage("products");
        setLoginMessage("Koneksi backend gagal. Jalankan `npm run dev:php` lalu `npm run dev`.");
        setMenuOpen(true);
      }
    }

    validateCurrentPageAccess();

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  useEffect(() => {
    setSelectedCartIds((prev) => prev.filter((id) => cartItems.some((item) => item.id === id)));
  }, [cartItems]);

  useEffect(() => {
    setQuantity(1);
    setCartFeedback("");
  }, [selectedProductId]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!searchFormRef.current) return;
      if (searchFormRef.current.contains(event.target)) return;

      setSearchTerm("");
      setSearchExpanded(false);
      setSearchHistoryOpen(false);
    }

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (paymentProofPreview) {
        URL.revokeObjectURL(paymentProofPreview);
      }
    };
  }, [paymentProofPreview]);

  function openProduct(productId) {
    updateBrowserState({ page: "products", productId });
    setSelectedProductId(productId);
    setCurrentPage("products");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeProduct() {
    updateBrowserState({ page: "products" });
    setSelectedProductId("");
    setCurrentPage("products");
    setCartFeedback("");
    setQuantity(1);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCartPage() {
    ensurePageAccess("cart", "Login dulu untuk membuka keranjang.").then((allowed) => {
      if (!allowed) return;

      setSearchTerm("");
      setSearchExpanded(false);
      setSearchHistoryOpen(false);
      updateBrowserState({ page: "cart" });
      setSelectedProductId("");
      setCurrentPage("cart");
      setMenuOpen(false);
      setCartFeedback("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleCartButtonMouseDown(event) {
    event.preventDefault();
    openCartPage();
  }

  function openPaymentPage() {
    ensurePageAccess("payment", "Login dulu untuk membuka halaman pembayaran.").then((allowed) => {
      if (!allowed) return;

      updateBrowserState({ page: "payment" });
      setSelectedProductId("");
      setCurrentPage("payment");
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function openOrdersPage() {
    ensurePageAccess("orders", "Login dulu untuk melihat status transaksi.").then((allowed) => {
      if (!allowed) return;

      setSearchTerm("");
      setSearchExpanded(false);
      setSearchHistoryOpen(false);
      updateBrowserState({ page: "orders" });
      setSelectedProductId("");
      setCurrentPage("orders");
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function goToAdminPage() {
    setSearchTerm("");
    setSearchExpanded(false);
    setSearchHistoryOpen(false);
    updateBrowserState({ page: "admin" });
    setSelectedProductId("");
    setCurrentPage("admin");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAdminPage() {
    ensurePageAccess(
      "admin",
      "Akses admin hanya untuk akun yang login dan punya role admin."
    ).then((allowed) => {
      if (!allowed) return;
      goToAdminPage();
    });
  }

  async function ensurePageAccess(page, fallbackMessage) {
    try {
      const response = await fetch(
        `${USER_API_URL}?action=guard&page=${encodeURIComponent(page)}`,
        {
          credentials: "include",
        }
      );
      const result = await response.json();
      const sessionUser = normalizeBackendUser(result.data?.user);
      setUser(sessionUser);

      if (response.ok && result.success) return true;

      if (currentPage === page) {
        updateBrowserState({ page: "products", replace: true });
        setCurrentPage("products");
      }

      setLoginMessage(result.message || fallbackMessage);
      setMenuOpen(true);
      return false;
    } catch {
      setLoginMessage("Koneksi backend gagal. Jalankan `npm run dev:php` lalu `npm run dev`.");
      setMenuOpen(true);
      return false;
    }
  }

  function goToProductsPage() {
    updateBrowserState({ page: "products" });
    setSelectedProductId("");
    setCurrentPage("products");
    setCartFeedback("");
    setQuantity(1);
    setMenuOpen(false);
  }

  function toggleSearch(event) {
    event.preventDefault();

    if (searchExpanded) {
      setSearchTerm("");
      setSearchExpanded(false);
      setSearchHistoryOpen(false);
      return;
    }

    setSearchExpanded(true);
    setSearchHistoryOpen(true);
  }

  function saveRecentSearch(keyword) {
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) return;

    setRecentSearches((prev) => [
      trimmedKeyword,
      ...prev.filter((item) => item.toLowerCase() !== trimmedKeyword.toLowerCase()),
    ].slice(0, 5));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setSearchExpanded(true);
    saveRecentSearch(searchTerm);
    setSearchHistoryOpen(true);
  }

  function applyRecentSearch(keyword) {
    setSearchTerm(keyword);
    setSearchExpanded(true);
    setSearchHistoryOpen(true);
    saveRecentSearch(keyword);
  }

  function removeRecentSearch(keywordToRemove) {
    setRecentSearches((prev) => prev.filter((keyword) => keyword !== keywordToRemove));
  }

  function saveRecentLoginEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return;

    setRecentLoginEmails((prev) => [
      normalizedEmail,
      ...prev.filter((item) => item !== normalizedEmail),
    ].slice(0, 5));
  }

  function removeRecentLoginEmail(emailToRemove) {
    setRecentLoginEmails((prev) => prev.filter((email) => email !== emailToRemove));
  }

  async function addToCart(productId, qty) {
    if (!user) {
      setCartFeedback("Login dulu untuk menambahkan barang ke keranjang.");
      setMenuOpen(true);
      return false;
    }

    const product = productList.find((entry) => entry.id === productId) || null;
    const productDbId = Number(product?.dbId) || 0;

    if (!productDbId) {
      setCartFeedback("Produk ini belum terhubung ke database.");
      return false;
    }

    try {
      const response = await fetch(`${USER_API_URL}?action=cart_add`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productDbId,
          qty,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setCartFeedback(result.message || "Gagal menambahkan produk ke keranjang.");
        return false;
      }

      setCart(normalizeBackendCartItems(result.data?.items, productList));
      return true;
    } catch {
      setCartFeedback("Koneksi backend keranjang gagal.");
      return false;
    }
  }

  async function changeCartItemQuantity(productId, nextQty) {
    if (!user) return;

    const cartItem = cart.find((item) => item.id === productId) || null;
    const productDbId = Number(cartItem?.dbId) || 0;
    if (!productDbId) return;

    try {
      const response = await fetch(`${USER_API_URL}?action=cart_update`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productDbId,
          qty: nextQty,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setPurchaseMessage(result.message || "Gagal mengubah jumlah produk.");
        return;
      }

      setCart(normalizeBackendCartItems(result.data?.items, productList));
      setPurchaseMessage("");
    } catch {
      setPurchaseMessage("Koneksi backend keranjang gagal.");
    }
  }

  async function removeCartItem(productId) {
    if (!user) return;

    const cartItem = cart.find((item) => item.id === productId) || null;
    const productDbId = Number(cartItem?.dbId) || 0;
    if (!productDbId) return;

    try {
      const response = await fetch(`${USER_API_URL}?action=cart_remove`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productDbId,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setPurchaseMessage(result.message || "Gagal menghapus produk.");
        return;
      }

      setCart(normalizeBackendCartItems(result.data?.items, productList));
      setPurchaseMessage("");
    } catch {
      setPurchaseMessage("Koneksi backend keranjang gagal.");
    }
  }

  async function handleAddCurrentProduct() {
    if (!selectedProduct) return;

    const added = await addToCart(selectedProduct.id, quantity);
    if (!added) return;

    setCartFeedback(`${selectedProduct.name} berhasil ditambahkan (${quantity}).`);
  }

  function toggleCartSelection(productId) {
    setSelectedCartIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
    setPurchaseMessage("");
  }

  function toggleSelectAllCartItems() {
    setSelectedCartIds(allCartSelected ? [] : cartItems.map((item) => item.id));
    setPurchaseMessage("");
  }

  function handlePurchaseSelectedItems() {
    if (selectedCartItems.length === 0) {
      setPurchaseMessage("Pilih dulu barang yang mau dibeli.");
      return;
    }

    setPaymentItems(selectedCartItems);
    setPaymentMethod("");
    setPurchaseMessage("");
    openPaymentPage();
  }

  function handlePaymentProofChange(event) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) return;

    if (!nextFile.type.startsWith("image/")) {
      window.alert("Bukti pembayaran harus berupa gambar.");
      event.target.value = "";
      return;
    }

    if (paymentProofPreview) {
      URL.revokeObjectURL(paymentProofPreview);
    }

    setPaymentProofFile(nextFile);
    setPaymentProofPreview(URL.createObjectURL(nextFile));
  }

  async function handleSendPaymentProof() {
    if (paymentItems.length === 0) {
      window.alert("Belum ada produk yang masuk ke halaman pembayaran.");
      return;
    }

    if (!paymentProofFile) {
      window.alert("Upload bukti pembayaran dulu sebelum mengirim.");
      return;
    }

    if (!paymentMethod) {
      window.alert("Pilih metode pembayaran dulu.");
      return;
    }

    try {
      const response = await fetch(`${USER_API_URL}?action=transaction_create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: user?.name || "",
          customerEmail: user?.email || "",
          paymentMethod,
          paymentProof: paymentProofPreview,
          items: paymentItems,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        window.alert(result.message || "Transaksi gagal dikirim.");
        return;
      }

      const nextTransactions = Array.isArray(result.data?.items) ? result.data.items : transactions;
      setTransactions(nextTransactions);
    } catch {
      window.alert("Koneksi backend transaksi gagal.");
      return;
    }

    const paymentIds = paymentItems.map((item) => item.id);
    const paymentDbIds = paymentItems
      .map((item) => Number(item.dbId) || 0)
      .filter((item) => item > 0);

    if (paymentDbIds.length > 0) {
      try {
        const response = await fetch(`${USER_API_URL}?action=cart_bulk_remove`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_ids: paymentDbIds,
          }),
        });
        const result = await response.json();

        if (response.ok && result.success) {
          setCart(normalizeBackendCartItems(result.data?.items, productList));
        }
      } catch {
        // transaksi lokal tetap disimpan walau sinkron cart gagal
      }
    }

    setSelectedCartIds((prev) => prev.filter((id) => !paymentIds.includes(id)));
    setPaymentItems([]);
    setPaymentMethod("");
    setPaymentProofFile(null);

    if (paymentProofPreview) {
      URL.revokeObjectURL(paymentProofPreview);
      setPaymentProofPreview("");
    }

    openOrdersPage();
  }

  async function handleUpdateTransactionStatus(transactionId, status) {
    try {
      const response = await fetch(`${USER_API_URL}?action=transaction_update_status`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          status,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        return;
      }

      const nextTransactions = Array.isArray(result.data?.items) ? result.data.items : transactions;
      setTransactions(nextTransactions);
    } catch {
      // biarkan UI tetap di state sebelumnya jika request gagal
    }
  }

  async function handleSaveProduct(productInput) {
    const existingProduct =
      productList.find((product) => product.id === String(productInput?.id || "").trim()) || null;
    const normalizedProduct = ProductStore.normalizeProduct(
      {
        ...productInput,
        dbId: productInput?.dbId ?? existingProduct?.dbId ?? null,
      },
      productList.length
    );
    const response = await fetch(`${USER_API_URL}?action=product_save`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(normalizedProduct),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Produk gagal disimpan.");
    }

    const nextProducts = Array.isArray(result.data?.items) ? result.data.items : productList;
    const savedProducts = ProductStore.saveProducts(nextProducts);
    setProductList(savedProducts);

    return result.data?.item || null;
  }

  async function handleDeleteProduct(productId) {
    const normalizedId = String(productId || "").trim();
    if (!normalizedId) {
      return {
        ok: false,
        message: "ID produk tidak valid.",
      };
    }

    const targetProduct = productList.find((product) => product.id === normalizedId);
    if (!targetProduct) {
      return {
        ok: false,
        message: "Produk tidak ditemukan.",
      };
    }

    if (!targetProduct.dbId) {
      return {
        ok: false,
        message: "Produk ini belum punya ID database.",
      };
    }

    const response = await fetch(`${USER_API_URL}?action=product_delete`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dbId: targetProduct.dbId,
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        ok: false,
        message: result.message || "Produk gagal dihapus.",
      };
    }

    const nextProducts = Array.isArray(result.data?.items) ? result.data.items : [];
    const savedProducts = ProductStore.saveProducts(nextProducts);
    setProductList(savedProducts);

    const nextComments = comments.filter(
      (comment) => Number(comment.productId) !== Number(targetProduct.dbId)
    );
    setComments(nextComments);

    setCart((prev) => CartStore.removeFromCart(prev, normalizedId));
    setSelectedCartIds((prev) => prev.filter((id) => id !== normalizedId));
    setPaymentItems((prev) => prev.filter((item) => item.id !== normalizedId));

    if (selectedProductId === normalizedId) {
      updateBrowserState({ page: "products", replace: true });
      setSelectedProductId("");
      setCurrentPage("products");
      setCartFeedback("");
      setQuantity(1);
    }

    return {
      ok: true,
      message: `${targetProduct.name} berhasil dihapus.`,
    };
  }

  async function handleAddProductComment(productId, message) {
    const trimmedMessage = message.trim();

    if (!user) {
      setLoginMessage("Login dulu untuk memberi komentar pada produk.");
      setMenuOpen(true);
      return {
        ok: false,
        message: "Login dulu untuk menulis komentar.",
      };
    }

    if (!trimmedMessage) {
      return {
        ok: false,
        message: "Komentar tidak boleh kosong.",
      };
    }

    const product = productList.find((item) => item.id === productId) || null;
    const productDbId = Number(product?.dbId) || 0;

    if (!productDbId) {
      return {
        ok: false,
        message: "Produk ini belum terhubung ke database.",
      };
    }

    try {
      const response = await fetch(`${USER_API_URL}?action=comment_add`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: productDbId,
          userEmail: user.email,
          message: trimmedMessage,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          ok: false,
          message: result.message || "Komentar gagal dikirim.",
        };
      }

      setComments(Array.isArray(result.data?.items) ? result.data.items : comments);
      return {
        ok: true,
        message: "Komentar berhasil dikirim.",
      };
    } catch {
      return {
        ok: false,
        message: "Koneksi backend komentar gagal.",
      };
    }
  }

  async function handleDeleteProductComment(commentId) {
    try {
      const response = await fetch(`${USER_API_URL}?action=comment_delete`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        return;
      }

      setComments(Array.isArray(result.data?.items) ? result.data.items : comments);
    } catch {
      // abaikan kegagalan hapus komentar agar UI tetap stabil
    }
  }

  function goHome() {
    goToProductsPage();
    setSearchTerm("");
    setActiveCategory("Semua");
    setCategoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToCatalog() {
    goToProductsPage();
    setTimeout(() => {
      const kategoriSection = document.getElementById("kategori");
      if (kategoriSection) {
        kategoriSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }

  function toggleCategoryMenu(event) {
    event.preventDefault();
    setCategoryOpen((prev) => !prev);
  }

  function selectCategory(category) {
    setActiveCategory(category);
    setCategoryOpen(false);
    goToProductsPage();
    setTimeout(() => {
      const kategoriSection = document.getElementById("kategori");
      if (kategoriSection) {
        kategoriSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    const trimmedEmail = loginEmail.trim().toLowerCase();
    const trimmedPassword = loginPassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setLoginMessage("Email dan password harus diisi.");
      return;
    }

    setAuthLoading(true);
    setLoginMessage("");

    try {
      if (authMode === "register") {
        const registerResponse = await fetch(`${USER_API_URL}?action=register`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
            verified: 1,
          }),
        });
        const registerResult = await registerResponse.json();

        if (!registerResponse.ok || !registerResult.success) {
          setLoginMessage(registerResult.message || "Registrasi gagal.");
          return;
        }

        setAuthMode("login");
        saveRecentLoginEmail(trimmedEmail);
        setLoginMessage("Registrasi berhasil. Silakan login dengan akun baru.");
        return;
      }

      const response = await fetch(`${USER_API_URL}?action=login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setLoginMessage(result.message || "Login gagal.");
        return;
      }

      const nextUser = normalizeBackendUser(result.data?.user);
      if (!nextUser) {
        setLoginMessage("Data login dari server tidak valid.");
        return;
      }

      setUser(nextUser);
      saveRecentLoginEmail(nextUser.email);
      setLoginEmail("");
      setLoginPassword("");
      setLoginMessage("");
      setMenuOpen(false);
    } catch {
      setLoginMessage(
        "Koneksi ke backend login gagal. Jalankan `npm run dev:php` lalu `npm run dev`."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${USER_API_URL}?action=logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Tetap lanjut clear state lokal walau request logout gagal.
    }

    setUser(null);
    setCart([]);
    setSelectedCartIds([]);
    setPurchaseMessage("");
    setPaymentItems([]);
    setPaymentMethod("");
    setPaymentProofFile(null);
    setLoginPassword("");
    if (paymentProofPreview) {
      URL.revokeObjectURL(paymentProofPreview);
    }
    setPaymentProofPreview("");
    setCurrentPage("products");
    setSelectedProductId("");
    setMenuOpen(false);
    updateBrowserState({ page: "products" });
    setLoginMessage("Kamu sudah logout. Login lagi untuk memakai keranjang.");
  }

  const showProductDetail = currentPage === "products" && Boolean(selectedProduct);
  const showCartPage = currentPage === "cart";
  const showPaymentPage = currentPage === "payment";
  const showAdminPage = currentPage === "admin";
  const showOrdersPage = currentPage === "orders";

  return (
    <div className="app-shell">
      {menuOpen && <button className="page-overlay" type="button" onClick={() => setMenuOpen(false)} />}

      <header className="topbar">
        <button
          className={`menu ${menuOpen ? "is-active" : ""}`.trim()}
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <section className="icons">
          <form
            ref={searchFormRef}
            className={`search-form ${searchExpanded ? "" : "collapsed"}`.trim()}
            role="search"
            onSubmit={handleSearchSubmit}
          >
            <div className="search-input-wrap">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onFocus={() => setSearchHistoryOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (!searchTerm.trim()) {
                      setSearchExpanded(false);
                    }
                    setSearchHistoryOpen(false);
                  }, 120);
                }}
                placeholder="Cari nama barang..."
                aria-label="Cari nama barang"
              />

              {searchExpanded && searchHistoryOpen && recentSearches.length > 0 ? (
                <div className="search-history-panel">
                  <p>5 pencarian sebelumnya</p>
                  <div className="search-history-list">
                    {recentSearches.map((keyword) => (
                      <div key={keyword} className="search-history-row">
                        <button
                          className="search-history-item"
                          type="button"
                          onClick={() => applyRecentSearch(keyword)}
                        >
                          {keyword}
                        </button>
                        <button
                          className="search-history-remove"
                          type="button"
                          aria-label={`Hapus pencarian ${keyword}`}
                          onClick={() => removeRecentSearch(keyword)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button type="submit" aria-label="Cari" onClick={toggleSearch}>
              <img src="/gambar/search.png" className="icon icon-small" alt="Search" />
            </button>
          </form>

          <div className="cart-wrap">
            <button
              className="cart-button"
              type="button"
              aria-label="Buka troli"
              onMouseDown={handleCartButtonMouseDown}
            >
              <img src="/gambar/troli.png" className="icon" alt="Troli" />
              <span className="cart-count">{cartCount}</span>
            </button>
          </div>
        </section>
      </header>

      <aside className={`side-menu ${menuOpen ? "is-open" : ""}`.trim()} aria-hidden={!menuOpen}>
        <div className="side-menu-header">
          <div>
            <p className="side-menu-label">ETC Store</p>
            <h2>{user ? "Akun & Keranjang" : "Login User"}</h2>
          </div>
          <button className="side-menu-close" type="button" onClick={() => setMenuOpen(false)}>
            ×
          </button>
        </div>

        {user ? (
          <>
            <section className="user-card">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <span>{user.status}</span>
              </div>
            </section>

            <button className="logout-button" type="button" onClick={handleLogout}>
              Logout
            </button>

            <section className="menu-summary-grid">
              <article className="summary-card">
                <p>Total item</p>
                <strong>{cartCount}</strong>
              </article>
              <article className="summary-card">
                <p>Produk di cart</p>
                <strong>{cartItems.length}</strong>
              </article>
            </section>

            <nav className="side-menu-links">
              <button type="button" onClick={goHome}>
                Home
              </button>
              <button type="button" onClick={goToCatalog}>
                Lihat katalog
              </button>
              <button type="button" onClick={openCartPage}>
                Buka halaman cart
              </button>
              <button type="button" onClick={openOrdersPage}>
                Status transaksi
              </button>
              <button type="button" onClick={openAdminPage}>
                Admin
              </button>
            </nav>
          </>
        ) : (
          <section className="login-card">
            <div className="auth-switch">
              <button
                type="button"
                className={authMode === "login" ? "is-active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setLoginMessage("");
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "register" ? "is-active" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setLoginMessage("");
                }}
              >
                Register
              </button>
            </div>

            <form className="login-form" onSubmit={handleLoginSubmit}>
              <label>
                Email
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="Masukkan email"
                  list="recent-login-emails"
                />
                <datalist id="recent-login-emails">
                  {recentLoginEmails.map((email) => (
                    <option key={email} value={email} />
                  ))}
                </datalist>
              </label>

              {recentLoginEmails.length > 0 ? (
                <div className="login-email-history">
                  <div className="login-email-history-list">
                    {recentLoginEmails.map((email) => (
                      <div key={email} className="login-email-history-row">
                        <button
                          type="button"
                          className="login-email-chip"
                          onClick={() => setLoginEmail(email)}
                        >
                          {email}
                        </button>
                        <button
                          type="button"
                          className="login-email-remove"
                          aria-label={`Hapus email ${email}`}
                          onClick={() => removeRecentLoginEmail(email)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <label>
                Password akun
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Masukkan password"
                />
              </label>

              <button className="login-submit" type="submit" disabled={authLoading}>
                {authLoading ? "Memproses..." : authMode === "login" ? "Login" : "Register"}
              </button>
            </form>

            {loginMessage ? <p className="login-message">{loginMessage}</p> : null}

            <nav className="side-menu-links">
              <button type="button" onClick={goHome}>
                Home
              </button>
              <button type="button" onClick={goToCatalog}>
                Lihat katalog
              </button>
              <button type="button" onClick={openOrdersPage}>
                Status transaksi
              </button>
            </nav>
          </section>
        )}
      </aside>

      {showProductDetail ? (
        <ProductDetailPage
          selectedProduct={selectedProduct}
          quantity={quantity}
          setQuantity={setQuantity}
          handleAddCurrentProduct={handleAddCurrentProduct}
          cartFeedback={cartFeedback}
          user={user}
          productComments={selectedProductComments}
          onAddComment={handleAddProductComment}
          closeProduct={closeProduct}
        />
      ) : showPaymentPage ? (
        <PaymentPage
          user={user}
          paymentItems={paymentItems}
          openCartPage={openCartPage}
          paymentTotalPrice={paymentTotalPrice}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentProofPreview={paymentProofPreview}
          paymentProofFile={paymentProofFile}
          handlePaymentProofChange={handlePaymentProofChange}
          handleSendPaymentProof={handleSendPaymentProof}
          setMenuOpen={setMenuOpen}
        />
      ) : showOrdersPage ? (
        <UserTransactionsPage
          user={user}
          userTransactions={userTransactions}
          setMenuOpen={setMenuOpen}
          goToCatalog={goToCatalog}
        />
      ) : showAdminPage ? (
        <AdminPage
          products={productList}
          comments={comments}
          transactions={transactions}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onDeleteComment={handleDeleteProductComment}
          onUpdateTransactionStatus={handleUpdateTransactionStatus}
        />
      ) : showCartPage ? (
        <CartPage
          user={user}
          cartCount={cartCount}
          cartItems={cartItems}
          allCartSelected={allCartSelected}
          toggleSelectAllCartItems={toggleSelectAllCartItems}
          goToCatalog={goToCatalog}
          selectedCartIds={selectedCartIds}
          toggleCartSelection={toggleCartSelection}
          openProduct={openProduct}
          changeCartItemQuantity={changeCartItemQuantity}
          removeCartItem={removeCartItem}
          selectedCartCount={selectedCartCount}
          selectedCartItems={selectedCartItems}
          selectedCartTotalPrice={selectedCartTotalPrice}
          purchaseMessage={purchaseMessage}
          handlePurchaseSelectedItems={handlePurchaseSelectedItems}
          setMenuOpen={setMenuOpen}
        />
      ) : (
        <CatalogPage
          goHome={goHome}
          categoryOpen={categoryOpen}
          toggleCategoryMenu={toggleCategoryMenu}
          categories={categories}
          activeCategory={activeCategory}
          selectCategory={selectCategory}
          filteredProducts={filteredProducts}
          openProduct={openProduct}
        />
      )}
    </div>
  );
}

export default App;

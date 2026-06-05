import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, parsePrice } from "../utils/price";
import ProductStore from "../utils/productStore";

const adminMenu = ["PRODUK", "USER", "TRANSAKSI"];

const EMPTY_FORM = {
  id: "",
  category: "",
  name: "",
  price: "",
  image: "",
  description: "",
  contents: "",
};

function mapProductToForm(product) {
  if (!product) return EMPTY_FORM;

  return {
    id: product.id,
    category: product.category,
    name: product.name,
    price: product.price,
    image: product.image,
    description: product.description,
    contents: Array.isArray(product.contents) ? product.contents.join("\n") : "",
  };
}

function AdminPage({
  products,
  comments,
  transactions,
  onSaveProduct,
  onDeleteProduct,
  onDeleteComment,
  onUpdateTransactionStatus,
}) {
  const [activeSection, setActiveSection] = useState("PRODUK");
  const [editingProductId, setEditingProductId] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const fileInputRef = useRef(null);
  const productSliderRef = useRef(null);

  const categoryOptions = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const buyerUsers = useMemo(() => {
    const usersMap = new Map();

    const deriveName = (email) => {
      const localPart = String(email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
      return localPart ? localPart.replace(/\b\w/g, (char) => char.toUpperCase()) : "User ETC";
    };

    
    transactions.forEach((t) => {
      const email = (t.customerEmail || "").trim().toLowerCase();
      if (!email) return;
      
      const current = usersMap.get(email);
      const spent = parseFloat(t.totalPrice || 0);
      
      if (!current) {
        usersMap.set(email, {
          id: email,
          name: t.customerName || deriveName(email),
          email: email,
          status: t.status,
          totalPrice: spent,
          createdAt: t.createdAt,
        });
      } else {
        current.totalPrice += spent;
        if (new Date(t.createdAt) > new Date(current.createdAt)) {
          current.createdAt = t.createdAt;
          current.status = t.status;
        }
      }
    });

    
    comments.forEach((c) => {
      const email = (c.userEmail || "").trim().toLowerCase();
      if (!email) return;
      
      if (!usersMap.has(email)) {
        usersMap.set(email, {
          id: email,
          name: c.userName || deriveName(email),
          email: email,
          status: "active",
          totalPrice: 0,
          createdAt: c.createdAt,
        });
      } else {
        const u = usersMap.get(email);
        if (new Date(c.createdAt) > new Date(u.createdAt)) {
          u.createdAt = c.createdAt;
        }
      }
    });

    return Array.from(usersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [transactions, comments]);

  const buyerUsersWithComments = useMemo(
    () =>
      buyerUsers.map((buyer) => {
        const userComments = [...comments]
          .filter(
            (comment) => comment.userEmail.trim().toLowerCase() === buyer.email.trim().toLowerCase()
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
          ...buyer,
          allComments: userComments,
        };
      }),
    [buyerUsers, comments]
  );

  useEffect(() => {
    const editingProduct = products.find((product) => product.id === editingProductId) || null;
    setFormData(mapProductToForm(editingProduct));
  }, [editingProductId, products]);

  function handleEditProduct(product) {
    setEditingProductId(product.id);
    setActiveSection("PRODUK");
    setFormMessage("");
  }

  function handleCreateProduct() {
    setEditingProductId("");
    setActiveSection("PRODUK");
    setFormData(EMPTY_FORM);
    setFormMessage("");
  }

  function handleFormChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleCategoryPick(category) {
    setFormData((prev) => ({ ...prev, category }));
  }

  function readImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setFormMessage("File gambar harus berupa image.");
      return;
    }

    const MAX_SIZE = 2 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      setFormMessage("Ukuran gambar terlalu besar. Maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, image: String(reader.result || "") }));
      setFormMessage("");
    };
    reader.readAsDataURL(file);
  }

  function handleImageFileChange(event) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    readImageFile(nextFile);
  }

  function handleImageDrop(event) {
    event.preventDefault();
    setIsImageDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (!nextFile) return;
    readImageFile(nextFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedCategory = formData.category.trim();
    const trimmedPrice = formData.price.trim();
    const trimmedImage = formData.image.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedName || !trimmedCategory || !trimmedPrice || !trimmedImage) {
      setFormMessage("Nama, kategori, harga, dan gambar wajib diisi.");
      return;
    }

    const normalizedId =
      editingProductId || ProductStore.slugify(trimmedName) || `product-${products.length + 1}`;

    try {
      setIsSubmitting(true);
      const savedProduct = await onSaveProduct({
        ...formData,
        id: normalizedId,
        category: trimmedCategory,
        name: trimmedName,
        price: trimmedPrice,
        image: trimmedImage,
        description: trimmedDescription,
        contents: formData.contents
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });

      setEditingProductId(savedProduct?.id || normalizedId);
      setFormMessage(
        editingProductId
          ? `${trimmedName} berhasil diperbarui.`
          : `${trimmedName} berhasil ditambahkan.`
      );
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Produk gagal disimpan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteProductFromAdmin(product) {
    if (!product?.id) return;

    const confirmed = window.confirm(`Hapus produk "${product.name}"?`);
    if (!confirmed) return;

    const result = await onDeleteProduct(product.id);
    if (!result?.ok) {
      setFormMessage(result?.message || "Produk gagal dihapus.");
      return;
    }

    if (editingProductId === product.id) {
      setEditingProductId("");
      setFormData(EMPTY_FORM);
    }

    setFormMessage(result.message || `${product.name} berhasil dihapus.`);
  }

  function scrollProductSlider(direction) {
    if (!productSliderRef.current) return;

    productSliderRef.current.scrollBy({
      left: direction * (productSliderRef.current.clientWidth * 0.92),
      behavior: "smooth",
    });
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-topbar" aria-label="Admin ETC">
          <div className="admin-brand">
            <img src="/gambar/P/Logo%20ETC%20clear.png" alt="ETC Logo" className="admin-brand-logo" />
          </div>
        </header>

        <nav className="admin-nav" aria-label="Admin Menu">
          {adminMenu.map((item) => (
            <button
              key={item}
              type="button"
              className={`admin-nav-item ${activeSection === item ? "is-active" : ""}`.trim()}
              onClick={() => setActiveSection(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {activeSection === "PRODUK" ? (
          <>
            <section className="admin-slider-section">
              <div className="admin-slider-head">
                <div>
                  <p className="side-menu-label">Daftar Produk</p>
                  <h2>Geser produk admin</h2>
                </div>
                <div className="admin-slider-actions">
                  <button
                    type="button"
                    className="admin-slider-button"
                    onClick={() => scrollProductSlider(-1)}
                    aria-label="Geser produk ke kiri"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="admin-slider-button"
                    onClick={() => scrollProductSlider(1)}
                    aria-label="Geser produk ke kanan"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="admin-product-slider" ref={productSliderRef}>
                {products.map((product) => (
                  <article className="admin-card" key={product.id}>
                    <div className="admin-card-preview">
                      <img src={product.image} alt={product.name} />
                    </div>
                    <div className="admin-card-meta">
                      <strong>{product.name}</strong>
                      <span>{formatPrice(product.price)}</span>
                    </div>
                    <button
                      type="button"
                      className="admin-edit-button"
                      onClick={() => handleEditProduct(product)}
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      className="admin-delete-button"
                      onClick={() => handleDeleteProductFromAdmin(product)}
                    >
                      HAPUS
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-editor">
              <div className="admin-editor-head">
                <div>
                  <p className="side-menu-label">Editor Produk</p>
                  <h2>{editingProductId ? "Ubah produk" : "Tambah produk baru"}</h2>
                </div>
                <div className="admin-editor-actions">
                  {editingProductId ? (
                    <button
                      type="button"
                      className="admin-inline-delete-button"
                      onClick={() =>
                        handleDeleteProductFromAdmin(
                          products.find((product) => product.id === editingProductId) || null
                        )
                      }
                    >
                      Hapus produk ini
                    </button>
                  ) : null}
                  <button type="button" className="cart-secondary-button" onClick={handleCreateProduct}>
                    Produk baru
                  </button>
                </div>
              </div>

              <form className="admin-form" onSubmit={handleSubmit}>
                <label>
                  Nama produk
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => handleFormChange("name", event.target.value)}
                    placeholder="Masukkan nama produk"
                  />
                </label>

                <label className="admin-form-full">
                  Kategori
                  <div className="admin-category-slider" aria-label="Pilih kategori">
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`admin-category-chip ${formData.category === category ? "is-active" : ""}`.trim()}
                        onClick={() => handleCategoryPick(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(event) => handleFormChange("category", event.target.value)}
                    placeholder="Pilih dari slide atau isi kategori baru"
                  />
                </label>

                <label>
                  Harga
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(event) => handleFormChange("price", event.target.value)}
                    placeholder="Contoh: 1.500.000,00"
                  />
                </label>

                <label className="admin-form-full">
                  Gambar
                  <div
                    className={`admin-image-dropzone ${isImageDragging ? "is-dragging" : ""}`.trim()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsImageDragging(true);
                    }}
                    onDragLeave={() => setIsImageDragging(false)}
                    onDrop={handleImageDrop}
                  >
                    <p>Tarik gambar ke sini atau pilih file</p>
                    <button
                      type="button"
                      className="cart-secondary-button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Pilih gambar
                    </button>
                    <input
                      ref={fileInputRef}
                      className="admin-hidden-file"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                    />
                  </div>
                  {formData.image ? (
                    <div className="admin-image-preview">
                      <img src={formData.image} alt={formData.name || "Preview gambar produk"} />
                    </div>
                  ) : null}
                </label>

                <label className="admin-form-full">
                  Deskripsi
                  <textarea
                    value={formData.description}
                    onChange={(event) => handleFormChange("description", event.target.value)}
                    placeholder="Tulis deskripsi produk"
                    rows="4"
                  />
                </label>

                <label className="admin-form-full">
                  Detail produk
                  <textarea
                    value={formData.contents}
                    onChange={(event) => handleFormChange("contents", event.target.value)}
                    placeholder={"Satu detail per baris\nContoh: Layar 14 inch"}
                    rows="5"
                  />
                </label>

                {formMessage ? <p className="admin-form-message">{formMessage}</p> : null}

                <button type="submit" className="admin-save-button" disabled={isSubmitting}>
                  {isSubmitting ? "Sedang memproses..." : (editingProductId ? "Simpan perubahan" : "Tambah produk")}
                </button>
              </form>
            </section>

            <button type="button" className="admin-add-button" aria-label="Tambah produk" onClick={handleCreateProduct}>
              +
            </button>
          </>
        ) : activeSection === "USER" ? (
          <section className="admin-placeholder">
            <div className="admin-editor-head">
              <div>
                <p className="side-menu-label">User</p>
                <h2>Daftar Aktivitas User</h2>
              </div>
            </div>

            {buyerUsersWithComments.length === 0 ? (
              <p>Belum ada user yang berinteraksi (beli atau komentar).</p>
            ) : (
              <div className="admin-user-list">
                {buyerUsersWithComments.map((user) => (
                  <article className="admin-user-card" key={user.id}>
                    <div className="admin-user-avatar" aria-hidden="true">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="admin-user-meta">
                      <strong>{user.name}</strong>
                      <p>{user.email}</p>
                      <span>
                        Aktivitas terakhir{" "}
                        {new Date(user.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      
                      {user.allComments && user.allComments.length > 0 ? (
                        <div className="admin-user-comments-list" style={{ marginTop: '10px' }}>
                          {user.allComments.map((comment) => {
                            const product = products.find((p) => Number(p.dbId) === Number(comment.productId));
                            return (
                              <div className="admin-user-comment" key={comment.id}>
                                <strong>Komentar di {product?.name || "produk"}</strong>
                                <p>{comment.message}</p>
                                <div className="admin-comment-footer">
                                  <span>
                                    {new Date(comment.createdAt).toLocaleString("id-ID", {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                  <button type="button" onClick={() => onDeleteComment(comment.id)}>
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="admin-user-comment is-empty">
                          <strong>Belum ada komentar</strong>
                          <p>User ini belum memberi komentar pada produk.</p>
                        </div>
                      )}
                    </div>
                    <div className="admin-user-side">
                      <span className={`admin-status-badge is-${user.status}`.trim()}>{user.status}</span>
                      <strong>{formatPrice(user.totalPrice)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : activeSection === "TRANSAKSI" ? (
          <section className="admin-placeholder">
            <div className="admin-editor-head">
              <div>
                <p className="side-menu-label">Transaksi</p>
                <h2>Riwayat pembayaran user</h2>
              </div>
            </div>

            {transactions.length === 0 ? (
              <p>Belum ada transaksi dari user.</p>
            ) : (
              <div className="admin-transaction-list">
                {transactions.map((transaction) => (
                  <article className="admin-transaction-card" key={transaction.id}>
                    <div className="admin-transaction-banner" />

                    <div className="admin-transaction-body">
                      <div className="admin-transaction-head">
                        <div>
                          <strong>{transaction.customerName || "User ETC"}</strong>
                          <p>{transaction.customerEmail || "-"}</p>
                        </div>
                        <div className="admin-transaction-summary">
                          <span>{formatPrice(transaction.totalPrice)}</span>
                          <span className={`admin-status-badge is-${transaction.status}`.trim()}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>

                      <div className="admin-transaction-info">
                        <p>Metode: {transaction.paymentMethod}</p>
                        <p>
                          Waktu:{" "}
                          {new Date(transaction.createdAt).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      <div className="admin-transaction-items">
                        {transaction.items.map((item) => (
                          <div className="admin-transaction-item" key={`${transaction.id}-${item.id}`}>
                            <img src={item.image} alt={item.name} />
                            <div>
                              <strong>{item.name}</strong>
                              <p>
                                Qty: {item.qty} • {formatPrice(parsePrice(item.price) * item.qty)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {transaction.paymentProof ? (
                      <div className="admin-transaction-proof">
                        <p>Bukti pembayaran</p>
                        <img src={transaction.paymentProof} alt={`Bukti ${transaction.id}`} />
                      </div>
                    ) : null}

                    {transaction.status === "pending" ? (
                      <div className="admin-transaction-actions">
                        <button
                          type="button"
                          className="admin-action-button is-accept"
                          onClick={() => onUpdateTransactionStatus(transaction.id, "paid")}
                        >
                          Terima
                        </button>
                        <button
                          type="button"
                          className="admin-action-button is-reject"
                          onClick={() => onUpdateTransactionStatus(transaction.id, "failed")}
                        >
                          Tolak
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="admin-placeholder">
            <h2>Menu {activeSection}</h2>
            <p>Bagian ini masih placeholder. Fokus utama sekarang ada di editor produk.</p>
          </section>
        )}
      </section>
    </main>
  );
}

export default AdminPage;

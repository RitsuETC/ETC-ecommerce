import { formatPrice } from "../utils/price";

function CartPage({
  user,
  cartCount,
  cartItems,
  allCartSelected,
  toggleSelectAllCartItems,
  goToCatalog,
  selectedCartIds,
  toggleCartSelection,
  openProduct,
  changeCartItemQuantity,
  removeCartItem,
  selectedCartCount,
  selectedCartItems,
  selectedCartTotalPrice,
  purchaseMessage,
  handlePurchaseSelectedItems,
  setMenuOpen,
}) {
  return (
    <main className="cart-page">
      {user ? (
        <section className="cart-page-grid">
          <div className="cart-page-list">
            <div className="cart-page-list-head">
              <h2>Daftar produk di cart</h2>
              <span>{cartCount} item</span>
            </div>

            <button className="cart-secondary-button" type="button" onClick={goToCatalog}>
              Kembali ke produk
            </button>

            {cartItems.length > 0 ? (
              <label className="cart-check-toggle">
                <input
                  type="checkbox"
                  checked={allCartSelected}
                  onChange={toggleSelectAllCartItems}
                />
                <span>Pilih semua barang</span>
              </label>
            ) : null}

            {cartItems.length === 0 ? (
              <div className="cart-empty-state">
                <h3>Keranjang masih kosong</h3>
                <p>Pilih produk dari katalog lalu tambahkan ke cart.</p>
                <button className="cart-primary-button" type="button" onClick={goToCatalog}>
                  Lihat produk
                </button>
              </div>
            ) : (
              <div className="cart-page-items">
                {cartItems.map((item) => (
                  <article className="cart-page-item" key={item.id}>
                    <label className="cart-item-check">
                      <input
                        type="checkbox"
                        checked={selectedCartIds.includes(item.id)}
                        onChange={() => toggleCartSelection(item.id)}
                      />
                    </label>
                    <img src={item.image} alt={item.name} />
                    <div className="cart-page-item-body">
                      <button
                        type="button"
                        className="cart-page-item-link"
                        onClick={() => openProduct(item.id)}
                      >
                        {item.name}
                      </button>
                      <p>{item.category}</p>
                      <strong>{formatPrice(item.price)}</strong>
                    </div>
                    <div className="cart-page-item-tools">
                      <div className="cart-item-actions">
                        <button
                          type="button"
                          onClick={() => changeCartItemQuantity(item.id, item.qty - 1)}
                        >
                          -
                        </button>
                        <span>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => changeCartItemQuantity(item.id, item.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="cart-remove-button"
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="cart-summary-panel">
            <h2>Ringkasan belanja</h2>
            <div className="cart-summary-row">
              <span>Item dipilih</span>
              <strong>{selectedCartCount}</strong>
            </div>
            <div className="cart-summary-row">
              <span>Produk dipilih</span>
              <strong>{selectedCartItems.length}</strong>
            </div>
            <div className="cart-summary-row cart-summary-total">
              <span>Total harga</span>
              <strong>{formatPrice(selectedCartTotalPrice)}</strong>
            </div>
            {purchaseMessage ? <p className="purchase-message">{purchaseMessage}</p> : null}
            <button className="cart-primary-button" type="button" onClick={handlePurchaseSelectedItems}>
              Beli barang terpilih
            </button>
          </aside>
        </section>
      ) : (
        <section className="cart-login-state">
          <h2>Keranjang butuh login</h2>
          <p>Silakan login dari menu samping dulu, lalu buka halaman cart lagi.</p>
          <button className="cart-primary-button" type="button" onClick={() => setMenuOpen(true)}>
            Buka login
          </button>
        </section>
      )}
    </main>
  );
}

export default CartPage;

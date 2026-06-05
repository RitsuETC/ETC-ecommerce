import { formatPrice, parsePrice } from "../utils/price";

function PaymentPage({
  user,
  paymentItems,
  openCartPage,
  paymentTotalPrice,
  paymentMethod,
  setPaymentMethod,
  paymentProofPreview,
  paymentProofFile,
  handlePaymentProofChange,
  handleSendPaymentProof,
  setMenuOpen,
}) {
  return (
    <main className="payment-page">
      {user ? (
        paymentItems.length > 0 ? (
          <section className="payment-layout">
            <div className="payment-card">
              <div className="payment-head">
                <div>
                  <p className="side-menu-label">Pembayaran</p>
                  <h2>Selesaikan pembayaran pesananmu</h2>
                </div>
                <button className="cart-secondary-button" type="button" onClick={openCartPage}>
                  Kembali ke cart
                </button>
              </div>

              <div className="payment-product-list">
                {paymentItems.map((item) => (
                  <article className="payment-product-item" key={item.id}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        Qty: {item.qty} • {item.category}
                      </p>
                      <strong>{formatPrice(parsePrice(item.price) * item.qty)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="payment-card payment-summary-card">
              <h2>Ringkasan pembayaran</h2>
              <div className="cart-summary-row">
                <span>Total produk</span>
                <strong>{paymentItems.length}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Total item</span>
                <strong>{paymentItems.reduce((total, item) => total + item.qty, 0)}</strong>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>Total harga</span>
                <strong>{formatPrice(paymentTotalPrice)}</strong>
              </div>
              <div className="nomor">
                <span>Nomor Pembayaran </span>
                <strong>"085713910078"</strong>
              </div>
              <div className="payment-method-box">
                <label className="payment-upload-label" htmlFor="payment-method">
                  Pilih metode pembayaran
                </label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="">Pilih metode pembayaran</option>
                  <option value="DANA">DANA</option>
                  <option value="OVO">OVO</option>
                  <option value="GoPay">GoPay</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="ShopeePay">ShopeePay</option>
                  <option value="Lainnya">DLL</option>
                </select>
              </div>

              <div className="payment-proof-box">
                <label className="payment-upload-label" htmlFor="payment-proof">
                  Upload bukti pembayaran
                </label>
                <input
                  id="payment-proof"
                  type="file"
                  accept="image/*"
                  onChange={handlePaymentProofChange}
                />

                {paymentProofPreview ? (
                  <div className="payment-proof-preview">
                    <img src={paymentProofPreview} alt="Bukti pembayaran" />
                    <p>{paymentProofFile?.name}</p>
                  </div>
                ) : (
                  <p className="payment-proof-note">
                    Kirim gambar screenshot atau foto bukti transfer pembayaran.
                  </p>
                )}
              </div>

              <button className="cart-primary-button" type="button" onClick={handleSendPaymentProof}>
                Kirim bukti pembayaran
              </button>
            </aside>
          </section>
        ) : (
          <section className="cart-login-state">
            <h2>Belum ada pesanan untuk dibayar</h2>
            <p>Pilih barang dari cart dulu, lalu lanjutkan ke halaman pembayaran.</p>
            <button className="cart-primary-button" type="button" onClick={openCartPage}>
              Kembali ke cart
            </button>
          </section>
        )
      ) : (
        <section className="cart-login-state">
          <h2>Pembayaran butuh login</h2>
          <p>Login dulu untuk mengakses halaman pembayaran.</p>
          <button className="cart-primary-button" type="button" onClick={() => setMenuOpen(true)}>
            Buka login
          </button>
        </section>
      )}
    </main>
  );
}

export default PaymentPage;

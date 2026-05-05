import { formatPrice, parsePrice } from "../utils/price";

function UserTransactionsPage({ user, userTransactions, setMenuOpen, goToCatalog }) {
  return (
    <main className="payment-page">
      {user ? (
        <section className="admin-placeholder">
          <div className="admin-editor-head">
            <div>
              <p className="side-menu-label">Status Transaksi</p>
              <h2>Riwayat pembayaran kamu</h2>
            </div>
            <button className="cart-secondary-button" type="button" onClick={goToCatalog}>
              Kembali ke produk
            </button>
          </div>

          {userTransactions.length === 0 ? (
            <p>Belum ada transaksi dari akun ini.</p>
          ) : (
            <div className="admin-transaction-list">
              {userTransactions.map((transaction) => (
                <article className="admin-transaction-card" key={transaction.id}>
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
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="cart-login-state">
          <h2>Status transaksi butuh login</h2>
          <p>Login dulu untuk melihat pending, diterima, atau ditolak.</p>
          <button className="cart-primary-button" type="button" onClick={() => setMenuOpen(true)}>
            Buka login
          </button>
        </section>
      )}
    </main>
  );
}

export default UserTransactionsPage;

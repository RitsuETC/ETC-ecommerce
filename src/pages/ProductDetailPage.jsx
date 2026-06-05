import { useEffect, useState } from "react";
import { formatPrice } from "../utils/price";

function ProductDetailPage({
  selectedProduct,
  quantity,
  setQuantity,
  handleAddCurrentProduct,
  cartFeedback,
  user,
  productComments,
  onAddComment,
  closeProduct,
}) {
  const [commentInput, setCommentInput] = useState("");
  const [commentMessage, setCommentMessage] = useState("");

  useEffect(() => {
    setCommentInput("");
    setCommentMessage("");
  }, [selectedProduct.id]);

  function handleCommentSubmit(event) {
    event.preventDefault();

    if (!commentInput.trim()) {
      setCommentMessage("Komentar tidak boleh kosong.");
      return;
    }

    const result = onAddComment(selectedProduct.id, commentInput);
    setCommentMessage(result.message);

    if (result.ok) {
      setCommentInput("");
    }
  }

  return (
    <main className="detail-page">
      <button className="back-link" type="button" onClick={closeProduct}>
        Kembali ke katalog
      </button>

      <section className="detail-wrapper">
        <div className="detail-top">
          <div className="detail-left">
            <img src={selectedProduct.image} alt={selectedProduct.name} />
          </div>

          <div className="detail-right">
            <h1>{selectedProduct.name}</h1>
            <span className="divider"></span>
            <p className="price">{formatPrice(selectedProduct.price)}</p>
            <p className="shipping-note">Shipping calculated at checkout</p>

            <div className="qty-box">
              <p>Quantity</p>
              <div className="qty-control">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <input type="text" value={quantity} readOnly />
                <button type="button" onClick={() => setQuantity((prev) => prev + 1)}>
                  +
                </button>
              </div>
            </div>

            <button className="cart-btn" type="button" onClick={handleAddCurrentProduct}>
              Add to cart
            </button>
            <p className="cart-feedback" aria-live="polite">
              {cartFeedback}
            </p>
          </div>
        </div>

        <div className="detail-bottom">
          <div className="description detail-description-card">
            <h2>Description:</h2>
            <p>{selectedProduct.description}</p>
            <h3>Detail Product:</h3>
            <ul>
              {selectedProduct.contents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <section className="detail-comments-card">
            <div className="detail-comments-head">
              <div>
                <h2>Komentar Produk</h2>
                <p>{user ? `Komentar sebagai ${user.name}` : "Login untuk menulis komentar."}</p>
              </div>
              <span>{productComments.length} komentar</span>
            </div>

            <form className="detail-comment-form" onSubmit={handleCommentSubmit}>
              <textarea
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="Tulis komentar kamu tentang produk ini"
                rows="4"
              />
              <button type="submit" disabled={!user || !commentInput.trim()}>Kirim komentar</button>
            </form>

            {commentMessage ? (
              <p className="detail-comment-message" aria-live="polite">
                {commentMessage}
              </p>
            ) : null}

            {productComments.length === 0 ? (
              <p className="detail-comment-empty">Belum ada komentar untuk produk ini.</p>
            ) : (
              <div className="detail-comment-list">
                {productComments.map((comment) => (
                  <article className="detail-comment-item" key={comment.id}>
                    <div className="detail-comment-top">
                      <strong>{comment.userName}</strong>
                      <span>
                        {new Date(comment.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p>{comment.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default ProductDetailPage;

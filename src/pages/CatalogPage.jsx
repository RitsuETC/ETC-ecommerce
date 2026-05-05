import { useEffect, useState } from "react";
import { formatPrice } from "../utils/price";

function CatalogPage({
  goHome,
  categoryOpen,
  toggleCategoryMenu,
  categories,
  activeCategory,
  selectCategory,
  filteredProducts,
  openProduct,
}) {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    setActiveBannerIndex(0);
  }, [filteredProducts]);

  useEffect(() => {
    if (filteredProducts.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % filteredProducts.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [filteredProducts]);

  const activeBannerProduct = filteredProducts[activeBannerIndex] || null;

  return (
    <main>
      <section className="logo">
        <img src="/gambar/Logo.png" alt="ETC Logo" />
      </section>

      <div className="catalog-head">
        <nav className="nav">
          <button className="nav-link-button" type="button" onClick={goHome}>
            Home
          </button>
          <button
            className={`nav-link-button ${categoryOpen ? "is-active" : ""}`.trim()}
            type="button"
            onClick={toggleCategoryMenu}
          >
            Kategori
          </button>
        </nav>

        {activeBannerProduct ? (
          <button
            className="banner banner-image-only"
            type="button"
            onClick={() => openProduct(activeBannerProduct.id)}
            aria-label={`Lihat banner produk ${activeBannerProduct.name}`}
          >
            <img src={activeBannerProduct.image} alt={activeBannerProduct.name} />
          </button>
        ) : null}

        {categoryOpen && (
          <section className="category-panel" id="kategori">
            <div className="category-panel-header">
              <h3>Kategori Barang</h3>
              <span>{activeCategory}</span>
            </div>

            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category-chip ${activeCategory === category ? "is-active" : ""}`.trim()}
                  type="button"
                  onClick={() => selectCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="products" id="kategori">
        {filteredProducts.length === 0 ? (
          <p className="search-empty">Produk tidak ditemukan.</p>
        ) : (
          filteredProducts.map((product) => (
            <article className="card" key={product.id}>
              <button
                className="card-link-image"
                type="button"
                onClick={() => openProduct(product.id)}
                aria-label={`Lihat produk ${product.name}`}
              >
                <div className="card-image">
                  <img src={product.image} alt={product.name} />
                </div>
              </button>

              <div className="card-info">
                <span className="card-category">{product.category}</span>
                <h3>{product.name}</h3>
                <p>
                  <button
                    className="price-link"
                    type="button"
                    onClick={() => openProduct(product.id)}
                  >
                    {formatPrice(product.price)}
                  </button>
                </p>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default CatalogPage;

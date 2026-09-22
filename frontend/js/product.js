document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id");
  const container = document.getElementById("productDetails");

  if (!id) {
    container.innerHTML = `<div class="empty">Product ID is missing.</div>`;
    return;
  }

  const res = await fetch(`/api/products/${id}`);

  if (!res.ok) {
    container.innerHTML = `<div class="empty">Product not found.</div>`;
    return;
  }

  const p = await res.json();

  container.innerHTML = `
    <div class="product-detail">
      <img src="${p.image}" alt="${escapeHtml(p.name)}">
      <div>
        <span class="category">${escapeHtml(p.category)}</span>
        <h1>${escapeHtml(p.name)}</h1>
        <div class="detail-price">${money(p.price)}</div>
        <p class="detail-description">${escapeHtml(p.description)}</p>
        <p><strong>Available:</strong> ${p.stock} item(s)</p>
        <button class="btn primary" onclick="addToCart(${p.id})" ${p.stock < 1 ? "disabled" : ""}>
          Add to Cart
        </button>
        <a class="btn secondary" href="/cart.html">Go to Cart</a>
      </div>
    </div>
  `;
});
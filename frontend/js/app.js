const API = "/api";

function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  const el = document.getElementById("cartCount");
  if (el) el.textContent = count;
}

async function getCurrentUser() {
  const res = await fetch(`${API}/me`);
  return res.json();
}

async function updateAuthArea() {
  const area = document.getElementById("authArea");
  if (!area) return;

  const data = await getCurrentUser();

  if (data.user) {
    area.innerHTML = `
      <span class="welcome">Hi, ${escapeHtml(data.user.name)}</span>
      ${data.user.role === "admin" ? '<a href="/admin/index.html">Admin Panel</a>' : ""}
      <a href="#" id="logoutBtn">Logout</a>
    `;

    document.getElementById("logoutBtn").addEventListener("click", async (e) => {
      e.preventDefault();
      await fetch(`${API}/logout`, { method: "POST" });
      location.href = "/";
    });
  } else {
    area.innerHTML = `<a href="/login.html">Login</a>`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

async function addToCart(productId) {
  const res = await fetch(`${API}/products/${productId}`);
  const product = await res.json();

  if (product.stock < 1) {
    alert("This product is out of stock.");
    return;
  }

  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    if (existing.quantity >= product.stock) {
      alert("You cannot add more than available stock.");
      return;
    }
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
  }

  saveCart(cart);
  alert("Product added to cart.");
}

function productCard(product) {
  return `
    <article class="card">
      <a href="/product.html?id=${product.id}">
        <img class="product-image" src="${product.image}" alt="${escapeHtml(product.name)}">
      </a>
      <div class="card-body">
        <span class="category">${escapeHtml(product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="price">${money(product.price)}</div>
        <div class="stock">${product.stock > 0 ? `${product.stock} available` : "Out of stock"}</div>
        <button class="btn primary" ${product.stock < 1 ? "disabled" : ""} onclick="addToCart(${product.id})">
          Add to Cart
        </button>
      </div>
    </article>
  `;
}

async function loadProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const search = document.getElementById("search").value;
  const category = document.getElementById("category").value;

  grid.innerHTML = "<p>Loading products...</p>";

  const res = await fetch(`${API}/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`);
  const products = await res.json();

  grid.innerHTML = products.length
    ? products.map(productCard).join("")
    : `<div class="empty">No products found.</div>`;
}

async function loadCategories() {
  const select = document.getElementById("category");
  if (!select) return;

  const res = await fetch(`${API}/categories`);
  const categories = await res.json();

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();
  await updateAuthArea();
  await loadCategories();

  const search = document.getElementById("search");
  const category = document.getElementById("category");

  if (search && category) {
    search.addEventListener("input", loadProducts);
    category.addEventListener("change", loadProducts);
    loadProducts();
  }
});
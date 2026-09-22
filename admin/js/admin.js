const adminApi = path => `/api/admin${path}`;
const adminMoney = value => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const adminEscape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

async function adminFetch(path, options) {
  const response = await fetch(adminApi(path), options);
  if (response.status === 403) { location.href = "/admin/login.html"; throw new Error("Admin access required"); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function guardAdmin() {
  try { return await adminFetch("/me"); } catch { return null; }
}

function adminShell(active, title, subtitle) {
  const links = [["index.html", "Dashboard"], ["products.html", "Products"], ["orders.html", "Orders"], ["users.html", "Users"], ["categories.html", "Categories"], ["settings.html", "Settings"]];
  document.body.innerHTML = `<div class="admin-shell"><aside class="admin-sidebar"><a class="logo" href="/admin/index.html">NexCart Admin</a><nav class="admin-nav">${links.map(([href, label]) => `<a class="${active === href ? "active" : ""}" href="/admin/${href}">${label}</a>`).join("")}<a href="/">View Store</a><button id="adminLogout">Logout</button></nav></aside><main class="admin-main"><header class="admin-header"><div><h1>${title}</h1><p>${subtitle}</p></div></header><div id="adminContent"></div></main></div>`;
  document.getElementById("adminLogout").onclick = async () => { await fetch("/api/admin/logout", { method: "POST" }); location.href = "/admin/login.html"; };
}

async function loadDashboard() {
  const stats = await adminFetch("/stats");
  const content = document.getElementById("adminContent");
  const cards = [["Total Products", stats.totalProducts], ["Total Users", stats.totalUsers], ["Total Orders", stats.totalOrders], ["Total Revenue", adminMoney(stats.totalRevenue)], ["Pending Orders", stats.pendingOrders], ["Completed Orders", stats.completedOrders]];
  const max = Math.max(...stats.sales.map(item => item.total), 1);
  content.innerHTML = `<div class="admin-grid">${cards.map(([label, value]) => `<section class="admin-stat"><span>${label}</span><strong>${value}</strong></section>`).join("")}</div><section class="admin-panel"><h2>Sales overview</h2><div class="chart">${stats.sales.length ? stats.sales.map(item => `<div class="chart-bar" style="height:${Math.max(8, item.total / max * 145)}px" title="${adminMoney(item.total)}"><span>${adminEscape(item.label.slice(5))}</span></div>`).join("") : "<p>No sales data yet.</p>"}</div></section>`;
}

async function loadProducts() {
  const products = await adminFetch("/products");
  document.getElementById("adminContent").innerHTML = `<section class="admin-panel"><h2>Product catalogue</h2><form id="productForm" class="admin-form"><input type="hidden" name="id"><label>Name<input name="name" required></label><label>Category<select name="category" id="productCategory" required></select></label><label>Description<textarea name="description" required></textarea></label><label>Image URL<input name="image" type="url" required></label><label>Price<input name="price" type="number" min="0" step="0.01" required></label><label>Stock<input name="stock" type="number" min="0" step="1" required></label><label>Status<select name="status"><option>Active</option><option>Inactive</option></select></label><div class="admin-actions full"><button class="btn primary" type="submit">Save product</button><button class="btn secondary" id="cancelProduct" type="button">Clear</button></div></form></section><section class="admin-panel"><table class="admin-table"><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${products.map(product => `<tr><td><img src="${adminEscape(product.image)}" alt=""></td><td>${adminEscape(product.name)}</td><td>${adminEscape(product.category)}</td><td>${adminMoney(product.price)}</td><td>${product.stock}</td><td>${adminEscape(product.status || "Active")}</td><td class="admin-actions"><button class="btn secondary" data-edit="${product.id}">Edit</button><button class="btn danger" data-delete="${product.id}">Delete</button></td></tr>`).join("")}</tbody></table></section>`;
  const form = document.getElementById("productForm");
  const categories = await adminFetch("/categories");
  document.getElementById("productCategory").innerHTML = categories.map(category => `<option>${adminEscape(category.name)}</option>`).join("");
  document.getElementById("cancelProduct").onclick = () => form.reset();
  form.onsubmit = async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); const id = data.id; delete data.id; try { await adminFetch(id ? `/products/${id}` : "/products", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); loadProducts(); } catch (error) { alert(error.message); } };
  document.querySelectorAll("[data-edit]").forEach(button => button.onclick = () => { const product = products.find(item => item.id == button.dataset.edit); Object.entries(product).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; }); window.scrollTo({ top: 0, behavior: "smooth" }); });
  document.querySelectorAll("[data-delete]").forEach(button => button.onclick = async () => { if (confirm("Delete this product?")) { await adminFetch(`/products/${button.dataset.delete}`, { method: "DELETE" }); loadProducts(); } });
}

async function loadOrders() {
  const orders = await adminFetch("/orders");
  document.getElementById("adminContent").innerHTML = `<section class="admin-panel"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Products</th><th>Total</th><th>Date</th><th>Status</th></tr></thead><tbody>${orders.map(order => `<tr><td><a href="/admin/order-details.html?id=${order.id}"><strong>#${order.id}</strong></a></td><td><a href="/admin/user-details.html?id=${order.user_id}">${adminEscape(order.customer_name)}</a><br><small>${adminEscape(order.customer_email)}</small></td><td>${order.items.map(item => `${adminEscape(item.name)} × ${item.quantity}`).join(", ")}</td><td>${adminMoney(order.total)}</td><td>${new Date(order.created_at + "Z").toLocaleDateString()}</td><td><select data-status="${order.id}">${["Placed", "Pending", "Processing", "Shipped", "Delivered", "Completed", "Cancelled"].map(status => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></section>`;
  document.querySelectorAll("[data-status]").forEach(select => select.onchange = async () => { await adminFetch(`/orders/${select.dataset.status}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: select.value }) }); });
}

async function loadUsers() {
  const users = await adminFetch("/users");
  document.getElementById("adminContent").innerHTML = `<section class="admin-panel"><table class="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Registered</th><th>Status</th><th>Actions</th></tr></thead><tbody>${users.map(user => `<tr><td>${user.id}</td><td><a href="/admin/user-details.html?id=${user.id}">${adminEscape(user.name)}</a></td><td>${adminEscape(user.email)}</td><td><select data-role="${user.id}"><option ${user.role === "user" ? "selected" : ""}>user</option><option ${user.role === "admin" ? "selected" : ""}>admin</option></select></td><td>${new Date(user.created_at + "Z").toLocaleDateString()}</td><td><span class="admin-pill ${user.is_active ? "" : "off"}">${user.is_active ? "Active" : "Inactive"}</span></td><td><button class="btn secondary" data-toggle="${user.id}">${user.is_active ? "Deactivate" : "Activate"}</button></td></tr>`).join("")}</tbody></table></section>`;
  document.querySelectorAll("[data-role]").forEach(select => select.onchange = async () => { try { await adminFetch(`/users/${select.dataset.role}/role`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: select.value }) }); } catch (error) { alert(error.message); loadUsers(); } });
  document.querySelectorAll("[data-toggle]").forEach(button => button.onclick = async () => { const user = users.find(item => item.id == button.dataset.toggle); try { await adminFetch(`/users/${user.id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !user.is_active }) }); loadUsers(); } catch (error) { alert(error.message); } });
}

async function loadCategories() {
  const categories = await adminFetch("/categories");
  document.getElementById("adminContent").innerHTML = `<section class="admin-panel"><form id="categoryForm" class="admin-form"><label>Category name<input name="name" required></label><div><button class="btn primary" type="submit">Add category</button></div></form></section><section class="admin-panel"><table class="admin-table"><thead><tr><th>Name</th><th>Actions</th></tr></thead><tbody>${categories.map(category => `<tr><td>${adminEscape(category.name)}</td><td class="admin-actions"><button class="btn secondary" data-category-edit="${category.id}">Edit</button><button class="btn danger" data-category-delete="${category.id}">Delete</button></td></tr>`).join("")}</tbody></table></section>`;
  document.getElementById("categoryForm").onsubmit = async event => { event.preventDefault(); try { await adminFetch("/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); loadCategories(); } catch (error) { alert(error.message); } };
  document.querySelectorAll("[data-category-edit]").forEach(button => button.onclick = async () => { const name = prompt("New category name:", categories.find(item => item.id == button.dataset.categoryEdit).name); if (name) { try { await adminFetch(`/categories/${button.dataset.categoryEdit}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); loadCategories(); } catch (error) { alert(error.message); } } });
  document.querySelectorAll("[data-category-delete]").forEach(button => button.onclick = async () => { try { await adminFetch(`/categories/${button.dataset.categoryDelete}`, { method: "DELETE" }); loadCategories(); } catch (error) { alert(error.message); } });
}

async function loadSettings() {
  document.getElementById("adminContent").innerHTML = `<section class="admin-panel"><h2>Administrator account</h2><p>Admin access is managed through the Users section. Store credentials use bcrypt hashing and session authentication.</p></section>`;
}

async function loadOrderDetails() {
  const order = await adminFetch(`/orders/${new URLSearchParams(location.search).get("id")}`);
  document.getElementById("adminContent").innerHTML = `<section class="admin-panel"><h2>Order #${order.id}</h2><p><strong>Customer:</strong> ${adminEscape(order.customer_name)} (${adminEscape(order.customer_email)})</p><p><strong>Shipping address:</strong> ${adminEscape(order.address)}</p><p><strong>Order date:</strong> ${new Date(order.created_at + "Z").toLocaleString()}</p><p><strong>Status:</strong> ${adminEscape(order.status)}</p><table class="admin-table"><thead><tr><th>Product</th><th>Quantity</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>${order.items.map(item => `<tr><td>${adminEscape(item.name)}</td><td>${item.quantity}</td><td>${adminMoney(item.price)}</td><td>${adminMoney(item.price * item.quantity)}</td></tr>`).join("")}</tbody></table><p><strong>Total amount: ${adminMoney(order.total)}</strong></p></section>`;
}

async function loadUserDetails() {
  const user = await adminFetch(`/users/${new URLSearchParams(location.search).get("id")}`);
  document.getElementById("adminContent").innerHTML = `<section class="admin-panel"><h2>${adminEscape(user.name)}</h2><p><strong>Email:</strong> ${adminEscape(user.email)}</p><p><strong>Role:</strong> ${adminEscape(user.role)}</p><p><strong>Account status:</strong> ${user.is_active ? "Active" : "Inactive"}</p><p><strong>Registration date:</strong> ${new Date(user.created_at + "Z").toLocaleString()}</p></section><section class="admin-panel"><h2>Order history</h2><table class="admin-table"><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>${user.orders.map(order => `<tr><td><a href="/admin/order-details.html?id=${order.id}">#${order.id}</a></td><td>${new Date(order.created_at + "Z").toLocaleDateString()}</td><td>${adminMoney(order.total)}</td><td>${adminEscape(order.status)}</td></tr>`).join("") || "<tr><td colspan=4>No orders yet.</td></tr>"}</tbody></table></section>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!await guardAdmin()) return;
  const page = location.pathname.split("/").pop();
  const config = { "index.html": ["index.html", "Dashboard", "A quick view of store performance.", loadDashboard], "products.html": ["products.html", "Products", "Manage catalogue, pricing and inventory.", loadProducts], "orders.html": ["orders.html", "Orders", "Review customer purchases and fulfilment status.", loadOrders], "users.html": ["users.html", "Users", "Manage accounts and administrator access.", loadUsers], "categories.html": ["categories.html", "Categories", "Keep product browsing organized.", loadCategories], "settings.html": ["settings.html", "Settings", "Store administration settings.", loadSettings], "order-details.html": ["orders.html", "Order details", "Inspect a customer order.", loadOrderDetails], "user-details.html": ["users.html", "User details", "Inspect account and order history.", loadUserDetails] }[page] || ["index.html", "Dashboard", "A quick view of store performance.", loadDashboard];
  adminShell(config[0], config[1], config[2]);
  try { await config[3](); } catch (error) { document.getElementById("adminContent").innerHTML = `<p class="message">${adminEscape(error.message)}</p>`; }
});

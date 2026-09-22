document.addEventListener("DOMContentLoaded", loadOrders);

async function loadOrders() {
  const container = document.getElementById("ordersList");
  const me = await getCurrentUser();

  if (!me.user) {
    container.innerHTML = `
      <div class="empty">
        <h2>Please login</h2>
        <a class="btn primary" href="/login.html">Login</a>
      </div>
    `;
    return;
  }

  const res = await fetch("/api/orders");

  if (!res.ok) {
    container.innerHTML = `<div class="empty">Could not load orders.</div>`;
    return;
  }

  const orders = await res.json();

  if (!orders.length) {
    container.innerHTML = `
      <div class="empty">
        <h2>No orders yet.</h2>
        <a class="btn primary" href="/">Start Shopping</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => `
    <article class="order-card">
      <div class="order-top">
        <div>
          <h2>Order #${order.id}</h2>
          <p>${new Date(order.created_at + "Z").toLocaleString()}</p>
        </div>
        <div>
          <div class="status">${escapeHtml(order.status)}</div>
          <strong>${money(order.total)}</strong>
        </div>
      </div>
      <p><strong>Delivery:</strong> ${escapeHtml(order.address)}</p>
      <div class="order-items">
        ${order.items.map(item => `
          <div class="summary-row">
            <span>${escapeHtml(item.name)} × ${item.quantity}</span>
            <strong>${money(item.price * item.quantity)}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}
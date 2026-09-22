async function renderCart() {
  const container = document.getElementById("cartContent");
  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty">
        <h2>Your cart is empty.</h2>
        <p>Add some products before checking out.</p>
        <a class="btn primary" href="/">Continue Shopping</a>
      </div>
    `;
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  container.innerHTML = `
    <div class="cart-layout">
      <section>
        ${cart.map((item, index) => `
          <div class="cart-item">
            <img src="${item.image}" alt="${escapeHtml(item.name)}">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${money(item.price)} each</p>
              <div class="qty">
                <button onclick="changeQty(${index}, -1)">−</button>
                <strong>${item.quantity}</strong>
                <button onclick="changeQty(${index}, 1)">+</button>
                <button class="btn danger" onclick="removeItem(${index})">Remove</button>
              </div>
            </div>
            <strong>${money(item.price * item.quantity)}</strong>
          </div>
        `).join("")}
      </section>

      <aside class="summary">
        <h2>Order Summary</h2>
        <div class="summary-row"><span>Subtotal</span><strong>${money(total)}</strong></div>
        <div class="summary-row"><span>Delivery</span><strong>FREE</strong></div>
        <div class="summary-row total"><span>Total</span><strong>${money(total)}</strong></div>

        <form id="checkoutForm" class="checkout-form">
          <label>Delivery Address</label>
          <textarea name="address" placeholder="Enter complete delivery address" required></textarea>
          <button class="btn primary" type="submit" style="width:100%">Place Order</button>
        </form>
        <p id="checkoutMessage" class="message"></p>
      </aside>
    </div>
  `;

  document.getElementById("checkoutForm").addEventListener("submit", checkout);
}

function changeQty(index, amount) {
  const cart = getCart();
  cart[index].quantity += amount;

  if (cart[index].quantity <= 0) cart.splice(index, 1);

  saveCart(cart);
  renderCart();
}

function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

async function checkout(e) {
  e.preventDefault();

  const data = await getCurrentUser();
  const msg = document.getElementById("checkoutMessage");

  if (!data.user) {
    location.href = "/login.html";
    return;
  }

  const address = new FormData(e.target).get("address");

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: getCart(), address })
  });

  const result = await res.json();

  if (!res.ok) {
    msg.textContent = result.message;
    return;
  }

  localStorage.removeItem("cart");
  updateCartCount();

  msg.style.color = "var(--success)";
  msg.textContent = `Order #${result.orderId} placed successfully.`;
  setTimeout(() => location.href = "/orders.html", 1000);
}

document.addEventListener("DOMContentLoaded", renderCart);
const cartKey = "cms_cart_v1";

function rupees(value) {
  return `₹${Number(value).toFixed(2)}`;
}

function getMenu() {
  const node = document.getElementById("menu-data");
  if (!node) return [];
  try {
    return JSON.parse(node.textContent || "[]");
  } catch {
    return [];
  }
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(cartKey) || "{}");
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
}

function setQty(cart, itemId, qty) {
  const safeQty = Math.max(0, Math.min(50, Number(qty) || 0));
  if (safeQty <= 0) delete cart[itemId];
  else cart[itemId] = safeQty;
}

function cartToItems(cart) {
  return Object.entries(cart)
    .map(([itemId, quantity]) => ({ itemId: Number(itemId), quantity: Number(quantity) }))
    .filter((x) => Number.isFinite(x.itemId) && Number.isFinite(x.quantity) && x.quantity > 0);
}

function hydrateMenuButtons(menu, cart) {
  for (const item of menu) {
    const btn = document.querySelector(`[data-add-item="${item.id}"]`);
    if (!btn) continue;

    btn.addEventListener("click", () => {
      setQty(cart, item.id, (cart[item.id] || 0) + 1);
      saveCart(cart);
      renderCart(menu, cart);
    });
  }
}

function renderCart(menu, cart) {
  const lines = cartToItems(cart)
    .map((x) => {
      const item = menu.find((m) => m.id === x.itemId);
      if (!item) return null;
      return { item, quantity: x.quantity };
    })
    .filter(Boolean);

  const list = document.getElementById("cart-lines");
  const empty = document.getElementById("cart-empty");
  const totalNode = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const clearBtn = document.getElementById("clear-cart-btn");

  if (!list || !empty || !totalNode || !checkoutBtn || !clearBtn) return;

  list.innerHTML = "";

  if (lines.length === 0) {
    empty.hidden = false;
    checkoutBtn.disabled = true;
    clearBtn.disabled = true;
    totalNode.textContent = rupees(0);
    return;
  }

  empty.hidden = true;
  checkoutBtn.disabled = false;
  clearBtn.disabled = false;

  let total = 0;

  for (const line of lines) {
    const lineTotal = line.quantity * line.item.price;
    total += lineTotal;

    const wrapper = document.createElement("div");
    wrapper.className = "cart-line";
    wrapper.innerHTML = `
      <div>
        <div class="name"></div>
        <div class="meta"></div>
      </div>
      <div class="qty">
        <button class="btn small" data-dec="${line.item.id}" aria-label="Decrease">−</button>
        <span class="mono" data-qty="${line.item.id}"></span>
        <button class="btn small" data-inc="${line.item.id}" aria-label="Increase">+</button>
      </div>
    `;

    wrapper.querySelector(".name").textContent = line.item.name;
    wrapper.querySelector(".meta").textContent = `${rupees(line.item.price)} each · ${rupees(lineTotal)}`;
    wrapper.querySelector(`[data-qty="${line.item.id}"]`).textContent = String(line.quantity);

    wrapper.querySelector(`[data-dec="${line.item.id}"]`).addEventListener("click", () => {
      setQty(cart, line.item.id, (cart[line.item.id] || 0) - 1);
      saveCart(cart);
      renderCart(menu, cart);
    });

    wrapper.querySelector(`[data-inc="${line.item.id}"]`).addEventListener("click", () => {
      setQty(cart, line.item.id, (cart[line.item.id] || 0) + 1);
      saveCart(cart);
      renderCart(menu, cart);
    });

    list.appendChild(wrapper);
  }

  totalNode.textContent = rupees(total);
}

async function checkout(menu, cart) {
  const paymentMethod = document.getElementById("payment-method")?.value || "CASH";
  const notes = (document.getElementById("order-notes")?.value || "").trim().slice(0, 240);

  const items = cartToItems(cart);
  if (items.length === 0) return;

  const btn = document.getElementById("checkout-btn");
  if (btn) btn.disabled = true;

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items, paymentMethod, notes })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Checkout failed.");
      return;
    }

    for (const key of Object.keys(cart)) delete cart[key];
    saveCart(cart);
    renderCart(menu, cart);

    const msg = data?.orderId ? `Order placed! Your order ID is #${data.orderId}.` : "Order placed!";
    alert(msg);
    window.location.href = "/orders";
  } finally {
    if (btn) btn.disabled = false;
  }
}

function wireActions(menu, cart) {
  document.getElementById("clear-cart-btn")?.addEventListener("click", () => {
    for (const key of Object.keys(cart)) delete cart[key];
    saveCart(cart);
    renderCart(menu, cart);
  });

  document.getElementById("checkout-btn")?.addEventListener("click", () => checkout(menu, cart));
}

(() => {
  const menu = getMenu();
  const cart = loadCart();

  hydrateMenuButtons(menu, cart);
  wireActions(menu, cart);
  renderCart(menu, cart);
})();


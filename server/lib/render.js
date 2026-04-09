function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonForScriptTag(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function layout({ title, navRightHtml = "", bodyHtml, scripts = [] }) {
  const scriptTags = scripts
    .map((src) => `<script src="${src}" defer></script>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/static/app.css" />
  </head>
  <body>
    <div class="container">
      <div class="nav">
        <a class="brand" href="/">
          <span>Canteen Manager</span>
          <small class="muted">MVP</small>
        </a>
        <div class="nav-links">
          <a class="pill" href="/">Menu</a>
          <a class="pill" href="/orders">Orders</a>
          ${navRightHtml}
        </div>
      </div>
      ${bodyHtml}
      <div class="footer">
        Local demo app · Data stored in <span class="mono">data/db.json</span>
      </div>
    </div>
    ${scriptTags}
  </body>
</html>`;
}

export function renderCustomerHome({ menuItems }) {
  const available = menuItems.filter((m) => m.available);
  const unavailable = menuItems.filter((m) => !m.available);

  const rows = (items) =>
    items
      .map((m) => {
        return `<tr>
  <td>
    <div style="font-weight: 700;">${escapeHtml(m.name)}</div>
    <div class="muted" style="font-size: 12px;">${escapeHtml(m.category || "General")}</div>
  </td>
  <td class="price">${escapeHtml(Number(m.price).toFixed(2))}</td>
  <td>
    <button class="btn small primary" data-add-item="${m.id}">Add</button>
  </td>
</tr>`;
      })
      .join("\n");

  const menuData = jsonForScriptTag(menuItems);

  return layout({
    title: "Menu · Canteen Manager",
    navRightHtml: `<a class="pill" href="/admin">Admin</a>`,
    bodyHtml: `
      <div class="grid">
        <div class="card">
          <div class="card-header">
            <h2>Today’s Menu</h2>
            <span class="badge ok">${available.length} available</span>
          </div>
          <div class="card-body">
            ${
              available.length
                ? `<table class="table">
                    <thead>
                      <tr><th>Item</th><th>Price (₹)</th><th></th></tr>
                    </thead>
                    <tbody>
                      ${rows(available)}
                    </tbody>
                  </table>`
                : `<div class="notice warn">No items are available. Ask admin to add menu items.</div>`
            }
            ${
              unavailable.length
                ? `<div style="margin-top: 14px;" class="muted">Unavailable items: ${unavailable
                    .map((x) => escapeHtml(x.name))
                    .join(", ")}</div>`
                : ""
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Your Cart</h2>
            <span class="badge">Local</span>
          </div>
          <div class="card-body">
            <div id="cart-empty" class="notice">Add items to start an order.</div>
            <div id="cart-lines" class="stack" style="margin-top: 10px;"></div>

            <div class="cart-total">
              <div>
                <div class="muted" style="font-size: 12px;">Total</div>
                <div class="mono" style="font-size: 20px;" id="cart-total">₹0.00</div>
              </div>
              <div class="row" style="justify-content: end;">
                <button class="btn" id="clear-cart-btn" disabled>Clear</button>
                <button class="btn primary" id="checkout-btn" disabled>Checkout</button>
              </div>
            </div>

            <div style="margin-top: 12px;" class="split">
              <div class="field">
                <label for="payment-method">Payment method</label>
                <select id="payment-method">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div class="field">
                <label for="order-notes">Notes (optional)</label>
                <input id="order-notes" type="text" maxlength="240" placeholder="e.g., no onions" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <script type="application/json" id="menu-data">${menuData}</script>
    `,
    scripts: ["/static/customer.js"]
  });
}

export function renderCustomerOrders({ orders }) {
  const rows = orders
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((o) => {
      const statusClass =
        o.status === "COMPLETED"
          ? "ok"
          : o.status === "CANCELLED"
            ? "danger"
            : "warn";
      const itemSummary = (o.items || [])
        .map((i) => `${escapeHtml(i.name)} × ${escapeHtml(i.quantity)}`)
        .join(", ");
      return `<tr>
  <td class="mono">#${escapeHtml(o.id)}</td>
  <td>${escapeHtml(itemSummary || "—")}</td>
  <td class="mono">${escapeHtml(Number(o.total || 0).toFixed(2))}</td>
  <td><span class="badge ${statusClass}">${escapeHtml(o.status)}</span></td>
  <td>${o.paid ? '<span class="badge ok">Paid</span>' : '<span class="badge warn">Unpaid</span>'}</td>
  <td class="muted" style="font-size: 12px;">${escapeHtml(new Date(o.createdAt).toLocaleString())}</td>
</tr>`;
    })
    .join("\n");

  return layout({
    title: "Orders · Canteen Manager",
    navRightHtml: `<a class="pill" href="/admin">Admin</a>`,
    bodyHtml: `
      <div class="card" style="margin-top: 18px;">
        <div class="card-header">
          <h2>Recent Orders</h2>
          <a class="pill" href="/orders">Refresh</a>
        </div>
        <div class="card-body">
          ${
            orders.length
              ? `<table class="table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Items</th><th>Total (₹)</th><th>Status</th><th>Payment</th><th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows}
                  </tbody>
                </table>`
              : `<div class="notice">No orders yet.</div>`
          }
        </div>
      </div>
    `
  });
}

export function renderAdminLogin({ error }) {
  return layout({
    title: "Admin Login · Canteen Manager",
    navRightHtml: `<a class="pill" href="/">Back</a>`,
    bodyHtml: `
      <div class="card" style="margin-top: 18px; max-width: 520px;">
        <div class="card-header">
          <h2>Admin Login</h2>
          <span class="badge">Local</span>
        </div>
        <div class="card-body">
          ${
            error
              ? `<div class="notice danger" style="margin-bottom: 12px;">${escapeHtml(error)}</div>`
              : `<div class="notice" style="margin-bottom: 12px;">Use your admin credentials to manage menu and orders.</div>`
          }

          <form method="post" action="/admin/login">
            <div class="field">
              <label for="username">Username</label>
              <input id="username" name="username" type="text" autocomplete="username" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required />
            </div>
            <div class="row" style="justify-content: end;">
              <button class="btn primary" type="submit">Sign in</button>
            </div>
          </form>
        </div>
      </div>
    `
  });
}

function renderMenuAdminTable(menuItems) {
  const rows = menuItems
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((m) => {
      return `<tr>
  <td class="mono">#${escapeHtml(m.id)}</td>
  <td>
    <div style="font-weight: 700;">${escapeHtml(m.name)}</div>
    <div class="muted" style="font-size: 12px;">${escapeHtml(m.category || "General")}</div>
  </td>
  <td class="mono">${escapeHtml(Number(m.price).toFixed(2))}</td>
  <td>${m.available ? '<span class="badge ok">Available</span>' : '<span class="badge danger">Hidden</span>'}</td>
  <td>
    <div class="row" style="justify-content: end;">
      <form method="post" action="/admin/menu/${escapeHtml(m.id)}/toggle">
        <button class="btn small" type="submit">${m.available ? "Hide" : "Show"}</button>
      </form>
      <form method="post" action="/admin/menu/${escapeHtml(m.id)}/delete" data-confirm-danger="true" data-confirm-message="Delete this item? This cannot be undone.">
        <button class="btn small danger" type="submit">Delete</button>
      </form>
    </div>
  </td>
</tr>`;
    })
    .join("\n");

  return `<table class="table">
    <thead>
      <tr><th>ID</th><th>Item</th><th>Price (₹)</th><th>Visibility</th><th></th></tr>
    </thead>
    <tbody>
      ${rows || ""}
    </tbody>
  </table>`;
}

function renderOrdersAdminTable(orders) {
  const statusOptions = ["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

  const rows = orders
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((o) => {
      const itemSummary = (o.items || [])
        .map((i) => `${escapeHtml(i.name)} × ${escapeHtml(i.quantity)}`)
        .join(", ");

      const statusSelect = `<select name="status">
        ${statusOptions
          .map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`)
          .join("")}
      </select>`;

      return `<tr>
  <td class="mono">#${escapeHtml(o.id)}</td>
  <td>${escapeHtml(itemSummary || "—")}</td>
  <td class="mono">${escapeHtml(Number(o.total || 0).toFixed(2))}</td>
  <td>
    <form method="post" action="/admin/orders/${escapeHtml(o.id)}/status" class="row" style="justify-content: end;">
      ${statusSelect}
      <button class="btn small" type="submit">Update</button>
    </form>
  </td>
  <td>
    <form method="post" action="/admin/orders/${escapeHtml(o.id)}/paid" class="row" style="justify-content: end;">
      <button class="btn small ${o.paid ? "" : "primary"}" type="submit">${o.paid ? "Mark unpaid" : "Mark paid"}</button>
    </form>
  </td>
  <td class="muted" style="font-size: 12px;">${escapeHtml(new Date(o.createdAt).toLocaleString())}</td>
</tr>`;
    })
    .join("\n");

  return `<table class="table">
    <thead>
      <tr><th>ID</th><th>Items</th><th>Total (₹)</th><th>Status</th><th>Payment</th><th>Time</th></tr>
    </thead>
    <tbody>
      ${rows || ""}
    </tbody>
  </table>`;
}

export function renderAdminDashboard({ menuItems, orders, adminUser }) {
  const availableCount = menuItems.filter((m) => m.available).length;

  return layout({
    title: "Admin · Canteen Manager",
    navRightHtml: `
      <span class="pill">Signed in: <span class="mono">${escapeHtml(adminUser || "admin")}</span></span>
      <form method="post" action="/admin/logout" style="display:inline;">
        <button class="btn small" type="submit">Logout</button>
      </form>
    `,
    bodyHtml: `
      <div class="grid">
        <div class="card">
          <div class="card-header">
            <h2>Menu Management</h2>
            <span class="badge ok">${availableCount} visible</span>
          </div>
          <div class="card-body">
            <div class="notice" style="margin-bottom: 12px;">Add items to the menu, hide items when out of stock.</div>

            <form method="post" action="/admin/menu/new">
              <div class="row">
                <div class="field">
                  <label for="name">Item name</label>
                  <input id="name" name="name" type="text" required />
                </div>
                <div class="field">
                  <label for="category">Category</label>
                  <input id="category" name="category" type="text" placeholder="Snacks / Meals / Drinks" />
                </div>
                <div class="field">
                  <label for="price">Price (₹)</label>
                  <input id="price" name="price" type="number" min="0" step="0.5" required />
                </div>
              </div>
              <div class="row" style="justify-content: end;">
                <button class="btn primary" type="submit">Add item</button>
              </div>
            </form>

            <div style="margin-top: 14px;">
              ${menuItems.length ? renderMenuAdminTable(menuItems) : `<div class="notice warn">No menu items yet.</div>`}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Orders</h2>
            <span class="badge">${orders.length} total</span>
          </div>
          <div class="card-body">
            ${
              orders.length
                ? renderOrdersAdminTable(orders)
                : `<div class="notice">No orders yet.</div>`
            }
          </div>
        </div>
      </div>
    `,
    scripts: ["/static/admin.js"]
  });
}

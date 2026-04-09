import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiFetch, formatINR } from "../../api/client";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";

type MenuItem = { id: string; name: string; category: string; pricePaise: number; available: boolean };

export function StudentMenuPage() {
  const menuQuery = useQuery({
    queryKey: ["menu"],
    queryFn: () => apiFetch<{ menuItems: MenuItem[] }>("/api/menu")
  });

  const [search, setSearch] = useState("");
  const [cart, setCart] = useLocalStorageState<{ items: Array<MenuItem & { quantity: number }> }>("cart_v1", {
    items: []
  });

  const filtered = useMemo(() => {
    const list = menuQuery.data?.menuItems ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [menuQuery.data, search]);

  return (
    <div className="stack">
      <div className="card">
        <div className="row row-between">
          <h1 className="h1">Student Menu</h1>
          <Link className="btn" to="/student/cart">
            Cart ({cart.items.reduce((a, b) => a + b.quantity, 0)})
          </Link>
        </div>
        <div className="field">
          <label>Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." />
        </div>
      </div>

      {menuQuery.isLoading ? <div className="card">Loading menu…</div> : null}
      {menuQuery.isError ? <div className="card">Failed to load menu.</div> : null}

      <div className="grid">
        {filtered.map((item) => (
          <div key={item.id} className="card item-card">
            <div className="row row-between">
              <div>
                <div className="item-title">{item.name}</div>
                <div className="muted">{item.category}</div>
              </div>
              <div className="price">{formatINR(item.pricePaise)}</div>
            </div>
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  setCart((prev) => {
                    const existing = prev.items.find((x) => x.id === item.id);
                    if (existing) {
                      return { items: prev.items.map((x) => (x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x)) };
                    }
                    return { items: [...prev.items, { ...item, quantity: 1 }] };
                  });
                }}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


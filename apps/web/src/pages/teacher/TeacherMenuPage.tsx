import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { apiFetch, formatINR } from "../../api/client";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";

type MenuItem = {
  id: string;
  name: string;
  category: string;
  pricePaise: number;
  available: boolean;
  imageUrl?: string | null;
};
type CategoryKey = "Breakfast" | "Lunch" | "Snacks";

export function TeacherMenuPage() {
  const menuQuery = useQuery({
    queryKey: ["menu"],
    queryFn: () => apiFetch<{ menuItems: MenuItem[] }>("/api/menu")
  });
  const location = useLocation();
  const navigate = useNavigate();
  const promptTimer = useRef<number | undefined>(undefined);
  const [quickPrompt, setQuickPrompt] = useState<{ name: string; count: number } | null>(null);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("Breakfast");
  const [cart, setCart] = useLocalStorageState<{ items: Array<MenuItem & { quantity: number }> }>(
    "cart_teacher_v1",
    { items: [] },
    [location.pathname]
  );
  const totalCount = cart.items.reduce((a, b) => a + b.quantity, 0);

  const filtered = useMemo(() => {
    const list = menuQuery.data?.menuItems ?? [];
    const q = search.trim().toLowerCase();
    const categoryMap: Record<CategoryKey, string[]> = {
      Breakfast: ["Beverages"],
      Lunch: ["Lunch"],
      Snacks: ["Snacks"]
    };
    const allowed = new Set(categoryMap[activeCategory]);
    const byCategory = list.filter((i) => allowed.has(i.category));
    if (!q) return byCategory;
    return byCategory.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [menuQuery.data, search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      map.set(item.category, [...(map.get(item.category) || []), item]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  useEffect(() => () => window.clearTimeout(promptTimer.current), []);

  return (
    <div className="stack">
      <div className="card">
        <div className="row row-between">
          <h1 className="h1">Teacher Menu</h1>
          <Link className="btn" to="/teacher/cart">
            Cart ({totalCount})
          </Link>
        </div>
        <div className="category-selector">
          {(["Breakfast", "Lunch", "Snacks"] as CategoryKey[]).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-card ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              <div className="category-title">{cat}</div>
              <div className="muted">Tap to view items</div>
            </button>
          ))}
        </div>
        <div className="field">
          <label>Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." />
        </div>
      </div>

      {menuQuery.isLoading ? <div className="card">Loading menu…</div> : null}
      {menuQuery.isError ? <div className="card">Failed to load menu.</div> : null}

      {!filtered.length ? <div className="card">No items found.</div> : null}

      {grouped.map(([category, items]) => (
        <div key={category} className="category-section">
          <div className="category-header">
            <h2 className="h2">{category}</h2>
            <div className="muted">{items.length} items</div>
          </div>
          <div className="grid">
            {items.map((item) => (
              <div key={item.id} className="card item-card">
                {item.imageUrl ? <img className="item-image" src={item.imageUrl} alt={item.name} loading="lazy" /> : null}
                <div className="row row-between">
                  <div>
                    <div className="item-title">{item.name}</div>
                    <div className="muted">{formatINR(item.pricePaise)}</div>
                  </div>
                  <div className="price">{formatINR(item.pricePaise)}</div>
                </div>
                <div className="row">
                  <button
                    className="btn primary"
                    onClick={() => {
                      const nextCount = totalCount + 1;
                      setCart((prev) => {
                        const existing = prev.items.find((x) => x.id === item.id);
                        if (existing) {
                          return { items: prev.items.map((x) => (x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x)) };
                        }
                        return { items: [...prev.items, { ...item, quantity: 1 }] };
                      });
                      setQuickPrompt({ name: item.name, count: nextCount });
                      window.clearTimeout(promptTimer.current);
                      promptTimer.current = window.setTimeout(() => setQuickPrompt(null), 4000);
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {quickPrompt ? (
        <div className="toast" role="status" aria-live="polite">
          <div>
            <div className="toast-title">Added {quickPrompt.name}</div>
            <div className="muted">{quickPrompt.count} items in cart</div>
          </div>
          <div className="toast-actions">
            <button type="button" className="btn ghost" onClick={() => setQuickPrompt(null)}>
              Keep browsing
            </button>
            <button type="button" className="btn primary" onClick={() => navigate("/teacher/cart")}>
              Go to cart
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


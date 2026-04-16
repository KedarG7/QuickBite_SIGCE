import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, formatINR } from "../../api/client";

type MenuItem = {
  id: string;
  name: string;
  category: string;
  pricePaise: number;
  available: boolean;
  imageUrl?: string | null;
};

export function AdminMenuPage() {
  const qc = useQueryClient();
  const menuQuery = useQuery({
    queryKey: ["adminMenu"],
    queryFn: () => apiFetch<{ menuItems: MenuItem[] }>("/api/admin/menu")
  });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Snacks");
  const [priceRupees, setPriceRupees] = useState("20");
  const [imageUrl, setImageUrl] = useState("");
  const [imageDrafts, setImageDrafts] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/menu", {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          priceRupees: Number(priceRupees),
          available: true,
          imageUrl: imageUrl.trim() || undefined
        })
      }),
    onSuccess: () => {
      setName("");
      setImageUrl("");
      qc.invalidateQueries({ queryKey: ["adminMenu"] });
    }
  });

  const patchMutation = useMutation({
    mutationFn: (input: { id: string; patch: any }) =>
      apiFetch(`/api/admin/menu/${input.id}`, { method: "PATCH", body: JSON.stringify(input.patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminMenu"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/menu/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminMenu"] })
  });

  const grouped = useMemo(() => {
    const items = menuQuery.data?.menuItems || [];
    const map = new Map<string, MenuItem[]>();
    for (const i of items) map.set(i.category, [...(map.get(i.category) || []), i]);
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [menuQuery.data]);

  const availableGrouped = useMemo(() => {
    const items = (menuQuery.data?.menuItems || []).filter((i) => i.available);
    const map = new Map<string, MenuItem[]>();
    for (const i of items) map.set(i.category, [...(map.get(i.category) || []), i]);
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [menuQuery.data]);

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Admin · Menu</h1>
        <div className="row">
          <div className="field" style={{ minWidth: 180 }}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <label>Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Snacks" />
          </div>
          <div className="field" style={{ minWidth: 120 }}>
            <label>Price (₹)</label>
            <input value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 220, flex: 1 }}>
            <label>Image URL</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/menu/burger.jpg" />
          </div>
        </div>
        <div className="row admin-menu-actions">
          <button className="btn primary admin-add-btn" disabled={!name || createMutation.isPending} onClick={() => createMutation.mutate()}>
            Add Item
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row row-between">
          <h2 className="h2">Today’s Menu (Available)</h2>
          <div className="pill">{(menuQuery.data?.menuItems || []).filter((i) => i.available).length} items</div>
        </div>
        {menuQuery.isLoading ? <div className="muted">Loading…</div> : null}
        {menuQuery.isError ? <div className="notice danger">Failed to load menu.</div> : null}
        {!menuQuery.isLoading && !menuQuery.isError && availableGrouped.length === 0 ? (
          <div className="muted">No items are marked available.</div>
        ) : null}
        <div className="stack mini">
          {availableGrouped.map(([cat, items]) => (
            <div key={cat} className="stack mini">
              <div className="h3">{cat}</div>
              {items.map((i) => (
                <div key={i.id} className="row row-between">
                  <div className="item-title">{i.name}</div>
                  <div className="price">{formatINR(i.pricePaise)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {menuQuery.isLoading ? <div className="card">Loading…</div> : null}
      {menuQuery.isError ? <div className="card">Failed to load menu.</div> : null}

      {grouped.map(([cat, items]) => (
        <div key={cat} className="card">
          <h2 className="h2">{cat}</h2>
          <div className="stack mini">
            {items.map((i) => (
              <div key={i.id} className="row row-between">
                <div>
                  <div className="row">
                    <div className="item-title">{i.name}</div>
                  </div>
                  <div className="muted">{formatINR(i.pricePaise)}</div>
                  <div className="field" style={{ marginTop: 8, minWidth: 220 }}>
                    <label>Image URL</label>
                    <input
                      value={imageDrafts[i.id] ?? i.imageUrl ?? ""}
                      onChange={(e) => setImageDrafts((prev) => ({ ...prev, [i.id]: e.target.value }))}
                      placeholder="/menu/burger.jpg"
                    />
                  </div>
                </div>
                <div className="row" style={{ marginTop: 0 }}>
                  <button
                    className="btn"
                    disabled={
                      patchMutation.isPending ||
                      (imageDrafts[i.id] ?? i.imageUrl ?? "") === (i.imageUrl ?? "")
                    }
                    onClick={() =>
                      patchMutation.mutate({
                        id: i.id,
                        patch: { imageUrl: (imageDrafts[i.id] ?? "").trim() || null }
                      })
                    }
                  >
                    Save Image
                  </button>
                  <button
                    className="btn"
                    disabled={patchMutation.isPending}
                    onClick={() => patchMutation.mutate({ id: i.id, patch: { available: !i.available } })}
                  >
                    {i.available ? "Hide" : "Show"}
                  </button>
                  <button
                    className="btn"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(i.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


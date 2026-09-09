import { useEffect, useState, FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location: string | null;
}

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export default function Products() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [movementFor, setMovementFor] = useState<Product | null>(null);
  const [movement, setMovement] = useState({ quantity: "1", movementType: "IN", reason: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (lowStockOnly) params.set("lowStock", "true");
      const res = await api.get<{ items: Product[] }>(`/products?${params.toString()}`);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStockOnly]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/products", {
        ...form,
        unitPrice: Number(form.unitPrice),
        currentStock: Number(form.currentStock),
        minStockAlert: Number(form.minStockAlert),
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create product");
    }
  }

  async function submitMovement(e: FormEvent) {
    e.preventDefault();
    if (!movementFor) return;
    setError(null);
    try {
      await api.post(`/products/${movementFor.id}/stock-movements`, {
        quantity: Number(movement.quantity),
        movementType: movement.movementType,
        reason: movement.reason,
      });
      setMovementFor(null);
      setMovement({ quantity: "1", movementType: "IN", reason: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record stock movement");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products &amp; Inventory</h1>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Add Product"}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search by name, SKU, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>

      {showForm && (
        <form className="card form-grid" onSubmit={handleCreate}>
          <div>
            <label>Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label>SKU *</label>
            <input
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label>Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label>Unit Price *</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
          </div>
          <div>
            <label>Opening Stock</label>
            <input
              type="number"
              value={form.currentStock}
              onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
            />
          </div>
          <div>
            <label>Min Stock Alert</label>
            <input
              type="number"
              value={form.minStockAlert}
              onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })}
            />
          </div>
          <div className="span-2">
            <label>Warehouse Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="span-2">
            <button className="btn btn-primary" type="submit">
              Save Product
            </button>
          </div>
        </form>
      )}

      {movementFor && (
        <form className="card form-grid" onSubmit={submitMovement}>
          <h3 className="span-2">Stock movement — {movementFor.name}</h3>
          <div>
            <label>Type</label>
            <select
              value={movement.movementType}
              onChange={(e) => setMovement({ ...movement, movementType: e.target.value })}
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div>
            <label>Quantity</label>
            <input
              type="number"
              min={1}
              value={movement.quantity}
              onChange={(e) => setMovement({ ...movement, quantity: e.target.value })}
            />
          </div>
          <div className="span-2">
            <label>Reason *</label>
            <input
              required
              value={movement.reason}
              onChange={(e) => setMovement({ ...movement, reason: e.target.value })}
            />
          </div>
          <div className="span-2">
            <button className="btn btn-primary" type="submit">
              Record Movement
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setMovementFor(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Location</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className={p.currentStock <= p.minStockAlert ? "row-warning" : ""}>
              <td>{p.name}</td>
              <td>{p.sku}</td>
              <td>{p.category || "—"}</td>
              <td>₹{p.unitPrice}</td>
              <td>
                {p.currentStock}
                {p.currentStock <= p.minStockAlert && (
                  <span className="badge badge-lead">Low</span>
                )}
              </td>
              <td>{p.location || "—"}</td>
              <td>
                {canEdit && (
                  <button className="btn-link" onClick={() => setMovementFor(p)}>
                    Adjust stock
                  </button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

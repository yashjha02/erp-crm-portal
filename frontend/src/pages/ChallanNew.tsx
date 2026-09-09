import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiClientError } from "../api/client";

interface Customer {
  id: string;
  name: string;
  businessName: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unitPrice: string;
}

interface LineItem {
  productId: string;
  quantity: number;
}

export default function ChallanNew() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", quantity: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        api.get<{ items: Customer[] }>("/customers?limit=100"),
        api.get<{ items: Product[] }>("/products?limit=100"),
      ]);
      setCustomers(c.items);
      setProducts(p.items);
    })();
  }, []);

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: FormEvent, status: "DRAFT" | "CONFIRMED") {
    e.preventDefault();
    setError(null);
    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (!customerId || validLines.length === 0) {
      setError("Select a customer and at least one product with quantity.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ id: string }>("/challans", {
        customerId,
        status,
        items: validLines,
      });
      navigate(`/challans/${res.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create challan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>New Sales Challan</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card">
        <label>Customer *</label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName || c.name}
            </option>
          ))}
        </select>

        <h3>Products</h3>
        {lines.map((line, idx) => {
          const product = products.find((p) => p.id === line.productId);
          return (
            <div className="line-item" key={idx}>
              <select
                value={line.productId}
                onChange={(e) => updateLine(idx, { productId: e.target.value })}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — stock: {p.currentStock}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={product?.currentStock}
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
              />
              <button type="button" className="btn-link" onClick={() => removeLine(idx)}>
                Remove
              </button>
            </div>
          );
        })}
        <button type="button" className="btn btn-secondary" onClick={addLine}>
          + Add Product
        </button>

        <div className="action-row">
          <button
            className="btn btn-secondary"
            disabled={submitting}
            onClick={(e) => submit(e, "DRAFT")}
          >
            Save as Draft
          </button>
          <button
            className="btn btn-primary"
            disabled={submitting}
            onClick={(e) => submit(e, "CONFIRMED")}
          >
            Confirm &amp; Reduce Stock
          </button>
        </div>
      </form>
    </div>
  );
}

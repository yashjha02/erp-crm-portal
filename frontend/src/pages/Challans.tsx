import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Challan {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  createdAt: string;
  customer: { name: string; businessName: string | null };
}

export default function Challans() {
  const { user } = useAuth();
  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";
  const [items, setItems] = useState<Challan[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await api.get<{ items: Challan[] }>(`/challans${qs}`);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load challans");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <div className="page-header">
        <h1>Sales Challans</h1>
        {canCreate && (
          <Link className="btn btn-primary" to="/challans/new">
            + New Challan
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="search-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Challan #</th>
            <th>Customer</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>{c.challanNumber}</td>
              <td>{c.customer.businessName || c.customer.name}</td>
              <td>{c.totalQuantity}</td>
              <td>
                <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
              </td>
              <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              <td>
                <Link to={`/challans/${c.id}`}>View</Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No challans found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

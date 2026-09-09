import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiClientError } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface ChallanItem {
  id: string;
  quantity: number;
  unitPrice: string;
  productSnapshot: { name: string; sku: string; category?: string };
}

interface ChallanDetail {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  createdAt: string;
  customer: { id: string; name: string; businessName: string | null };
  createdBy: { name: string };
  items: ChallanItem[];
}

export default function ChallanDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "SALES" || user?.role === "WAREHOUSE";

  const [challan, setChallan] = useState<ChallanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<ChallanDetail>(`/challans/${id}`);
      setChallan(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load challan");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status: string) {
    setError(null);
    try {
      await api.patch(`/challans/${id}/status`, { status });
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to update status");
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!challan) return <p className="muted">Loading...</p>;

  return (
    <div>
      <Link to="/challans">&larr; Back to challans</Link>
      <div className="page-header">
        <h1>{challan.challanNumber}</h1>
        <span className={`badge badge-${challan.status.toLowerCase()}`}>{challan.status}</span>
      </div>

      <div className="card">
        <dl>
          <dt>Customer</dt>
          <dd>{challan.customer.businessName || challan.customer.name}</dd>
          <dt>Created by</dt>
          <dd>{challan.createdBy.name}</dd>
          <dt>Date</dt>
          <dd>{new Date(challan.createdAt).toLocaleString()}</dd>
          <dt>Total quantity</dt>
          <dd>{challan.totalQuantity}</dd>
        </dl>
      </div>

      <div className="card">
        <h3>Items</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((i) => (
              <tr key={i.id}>
                <td>{i.productSnapshot.name}</td>
                <td>{i.productSnapshot.sku}</td>
                <td>{i.quantity}</td>
                <td>₹{i.unitPrice}</td>
                <td>₹{(Number(i.unitPrice) * i.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && challan.status !== "CANCELLED" && (
        <div className="action-row">
          {challan.status === "DRAFT" && (
            <button className="btn btn-primary" onClick={() => setStatus("CONFIRMED")}>
              Confirm Challan (reduces stock)
            </button>
          )}
          <button className="btn btn-danger" onClick={() => setStatus("CANCELLED")}>
            Cancel Challan
          </button>
        </div>
      )}
    </div>
  );
}

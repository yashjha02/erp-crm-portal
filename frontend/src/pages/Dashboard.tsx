import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Stats {
  customers: number;
  products: number;
  lowStock: number;
  draftChallans: number;
  confirmedChallans: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [customers, products, lowStock, draft, confirmed] = await Promise.all([
          api.get<{ pagination: { total: number } }>("/customers?limit=1"),
          api.get<{ pagination: { total: number } }>("/products?limit=1"),
          api.get<{ items: unknown[] }>("/products?lowStock=true"),
          api.get<{ pagination: { total: number } }>("/challans?status=DRAFT&limit=1"),
          api.get<{ pagination: { total: number } }>("/challans?status=CONFIRMED&limit=1"),
        ]);
        setStats({
          customers: customers.pagination.total,
          products: products.pagination.total,
          lowStock: lowStock.items.length,
          draftChallans: draft.pagination.total,
          confirmedChallans: confirmed.pagination.total,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    })();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {!stats && !error && <p className="muted">Loading...</p>}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-label">Customers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.products}</div>
            <div className="stat-label">Products</div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-value">{stats.lowStock}</div>
            <div className="stat-label">Low stock items</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.draftChallans}</div>
            <div className="stat-label">Draft challans</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.confirmedChallans}</div>
            <div className="stat-label">Confirmed challans</div>
          </div>
        </div>
      )}
    </div>
  );
}

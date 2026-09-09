import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiClientError } from "../api/client";

export default function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("admin@erp.test");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>ERP + CRM Portal</h1>
        <p className="muted">Sign in to continue</p>

        {error && <div className="alert alert-error">{error}</div>}

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="demo-creds">
          <strong>Demo accounts (password: Password123!)</strong>
          <ul>
            <li>admin@erp.test — Admin</li>
            <li>sales@erp.test — Sales</li>
            <li>warehouse@erp.test — Warehouse</li>
            <li>accounts@erp.test — Accounts</li>
          </ul>
        </div>
      </form>
    </div>
  );
}

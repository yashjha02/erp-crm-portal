import { useEffect, useState, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: { name: string };
}

interface CustomerDetail {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  gstNumber: string | null;
  customerType: string;
  address: string | null;
  status: string;
  followUpDate: string | null;
  notes: Note[];
  challans: { id: string; challanNumber: string; status: string; totalQuantity: number }[];
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<CustomerDetail>(`/customers/${id}`);
      setCustomer(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await api.post(`/customers/${id}/notes`, { content: noteText });
      setNoteText("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add note");
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!customer) return <p className="muted">Loading...</p>;

  return (
    <div>
      <Link to="/customers">&larr; Back to customers</Link>
      <div className="page-header">
        <h1>{customer.name}</h1>
        <span className={`badge badge-${customer.status.toLowerCase()}`}>{customer.status}</span>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3>Details</h3>
          <dl>
            <dt>Business</dt>
            <dd>{customer.businessName || "—"}</dd>
            <dt>Mobile</dt>
            <dd>{customer.mobile}</dd>
            <dt>Email</dt>
            <dd>{customer.email || "—"}</dd>
            <dt>GST Number</dt>
            <dd>{customer.gstNumber || "—"}</dd>
            <dt>Type</dt>
            <dd>{customer.customerType}</dd>
            <dt>Address</dt>
            <dd>{customer.address || "—"}</dd>
            <dt>Follow-up date</dt>
            <dd>
              {customer.followUpDate
                ? new Date(customer.followUpDate).toLocaleDateString()
                : "—"}
            </dd>
          </dl>
        </div>

        <div className="card">
          <h3>Recent Challans</h3>
          {customer.challans.length === 0 && <p className="muted">No challans yet.</p>}
          <ul className="plain-list">
            {customer.challans.map((c) => (
              <li key={c.id}>
                <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link> — {c.status} (
                {c.totalQuantity} units)
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3>Follow-up Notes</h3>
        {canEdit && (
          <form className="note-form" onSubmit={addNote}>
            <textarea
              placeholder="Add a follow-up note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Add Note
            </button>
          </form>
        )}
        <ul className="plain-list">
          {customer.notes.map((n) => (
            <li key={n.id}>
              <div>{n.content}</div>
              <div className="muted small">
                {n.createdBy.name} — {new Date(n.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
          {customer.notes.length === 0 && <p className="muted">No notes yet.</p>}
        </ul>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { Inbox, Trophy } from "lucide-react";
import { labelize } from "@/lib/constants";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children === "ACTIVE" ? "Ongoing" : children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = ["ACTIVE", "ONGOING", "COMPLETED", "APPROVED", "CONFIRMED", "SUBMISSION_OPEN"].includes(status) ? "success"
    : ["SUBMITTED", "PENDING", "PENDING_ADMIN_APPROVAL", "RESULT_SUBMITTED", "RESERVED", "RESCHEDULED", "POSTPONED"].includes(status) ? "warning"
    : ["REJECTED", "DISPUTED", "CANCELLED", "INACTIVE", "OVERDUE", "SUBMISSION_CLOSED"].includes(status) ? "danger" : "neutral";
  return <Badge tone={tone}>{status === "ACTIVE" ? "Ongoing" : labelize(status)}</Badge>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description, icon = "inbox" }: { title: string; description: string; icon?: "inbox" | "trophy" }) {
  const Icon = icon === "trophy" ? Trophy : Inbox;
  return <div className="empty-state"><Icon aria-hidden="true" /><strong>{title}</strong><p>{description}</p></div>;
}

export function MetricCard({ label, value, note, accent = false }: { label: string; value: ReactNode; note?: string; accent?: boolean }) {
  return <article className={`metric-card ${accent ? "metric-accent" : ""}`}><span>{label}</span><strong>{value === "ACTIVE" ? "Ongoing" : value}</strong>{note && <small>{note}</small>}</article>;
}

export function FormMessage({ state }: { state: { ok: boolean; message: string } }) {
  if (!state.message) return null;
  return <p className={`form-message ${state.ok ? "form-success" : "form-error"}`} role="status">{state.message}</p>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}


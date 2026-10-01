import { BrandLogo } from "@/components/brand-logo";

export function BrandedLoader({ label = "Loading tournament..." }: { label?: string }) {
  return <div className="branded-loader" role="status"><div className="loader-mark"><BrandLogo size={72} priority /></div><strong>{label}</strong><span>Preparing the arena</span></div>;
}

export function DashboardSkeleton() {
  return <div className="loading-layout" aria-hidden="true"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-match" /><div className="skeleton-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton skeleton-card" key={index} />)}</div></div>;
}


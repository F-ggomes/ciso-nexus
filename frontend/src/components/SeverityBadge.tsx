import type { Severity } from '../api/types';

const styles: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

export function severityFromScore(score: number | null | undefined): Severity {
  if (score === null || score === undefined || Number.isNaN(score)) return 'low';
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

export default function SeverityBadge({ severity, className = '' }: { severity: Severity | null | undefined; className?: string }) {
  const key = (severity ?? 'low').toString().toLowerCase();
  const style = styles[key] ?? 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300';
  return <span className={`badge ${style} ${className}`}>{key}</span>;
}

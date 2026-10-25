import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface KpiSub {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}

interface Props {
  title: string;
  value: ReactNode;
  icon?: LucideIcon;
  subs?: KpiSub[];
  onClick?: () => void;
}

const toneClass: Record<NonNullable<KpiSub['tone']>, string> = {
  neutral: 'text-slate-700 dark:text-slate-200',
  good: 'text-emerald-700 dark:text-emerald-400',
  warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-rose-700 dark:text-rose-400',
};

export default function KpiTile({ title, value, icon: Icon, subs = [], onClick }: Props) {
  return (
    <div
      className={`card flex flex-col gap-2 p-3 ${onClick ? 'cursor-pointer hover:border-accent-500' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="section-title">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-accent-600 dark:text-accent-400" />}
      </div>
      <div className="text-2xl font-semibold tabular-nums text-navy-900 dark:text-slate-100">{value}</div>
      {subs.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-3 gap-y-0.5 border-t border-slate-100 pt-2 text-2xs dark:border-navy-800">
          {subs.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between gap-2">
              <dt className="truncate text-slate-500 dark:text-slate-400">{s.label}</dt>
              <dd className={`font-semibold tabular-nums ${toneClass[s.tone ?? 'neutral']}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

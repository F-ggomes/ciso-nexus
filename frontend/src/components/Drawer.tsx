import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export default function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]" onClick={onClose} />
      <aside
        className={`relative flex h-full w-full ${width} flex-col border-l border-slate-200 bg-white shadow-xl dark:border-navy-800 dark:bg-navy-900`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-navy-800">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-navy-900 dark:text-slate-100">{title}</h2>
            {subtitle && <p className="mt-0.5 text-2xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button className="btn-ghost -mr-1 p-1" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-navy-800">{footer}</footer>}
      </aside>
    </div>
  );
}

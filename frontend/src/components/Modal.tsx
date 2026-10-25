import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export default function Modal({ open, onClose, title, children, footer, width = 'max-w-2xl' }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`relative flex max-h-[90vh] w-full ${width} flex-col rounded-md border border-slate-200 bg-white shadow-2xl dark:border-navy-800 dark:bg-navy-900`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-navy-800">
          <h2 className="text-sm font-semibold text-navy-900 dark:text-slate-100">{title}</h2>
          <button className="btn-ghost -mr-1 p-1" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-navy-800">{footer}</footer>}
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Scale, Ticket } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Incident, IncidentClassification, IncidentCreate, NotificationDeadline } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import SeverityBadge from '../components/SeverityBadge';
import { Alert, BoolBadge, Field, KV, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

function deadlinesOf(inc: Incident): NotificationDeadline[] {
  const d = inc.notification_deadlines;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  return Object.entries(d).map(([regime, due]) => ({ regime, due: String(due), basis: '' }));
}

function DeadlineList({ deadlines }: { deadlines: NotificationDeadline[] }) {
  if (deadlines.length === 0) return <p className="text-xs text-slate-500">No notification deadlines.</p>;
  const now = Date.now();
  return (
    <ul className="divide-y divide-slate-100 dark:divide-navy-800">
      {deadlines.map((d, i) => {
        const t = new Date(d.due).getTime();
        const overdue = !Number.isNaN(t) && t < now;
        return (
          <li key={`${d.regime}-${d.due}-${i}`} className="flex items-start justify-between gap-2 py-1.5 text-xs">
            <div>
              <span className="badge-neutral mr-1.5">{d.regime}</span>
              <span className="text-slate-600 dark:text-slate-300">{d.basis}</span>
            </div>
            <span className={`shrink-0 font-medium ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
              {fmtDate(d.due)}
              {overdue && <span className="badge-fail ml-1">overdue</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CreateIncidentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<IncidentCreate>({
    title: '',
    description: '',
    detected_at: new Date().toISOString().slice(0, 16),
    severity: 'medium',
    source: 'manual',
  });
  const create = useMutation({
    mutationFn: (p: IncidentCreate) => api.incidents.create({ ...p, detected_at: new Date(p.detected_at).toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(form);
  };
  const set = <K extends keyof IncidentCreate>(k: K, v: IncidentCreate[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title="Report incident" width="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title">
          <input className="input" required value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="input h-24" required value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Detected at">
            <input className="input" type="datetime-local" required value={form.detected_at} onChange={(e) => set('detected_at', e.target.value)} />
          </Field>
          <Field label="Severity">
            <select className="input" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
              {['low', 'medium', 'high', 'critical'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select className="input" value={form.source} onChange={(e) => set('source', e.target.value)}>
              {['manual', 'siem', 'edr', 'soc', 'vendor', 'customer', 'audit'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {create.isError && <Alert>{errorMessage(create.error)}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ClassifyDrawer({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  const qc = useQueryClient();
  const classify = useMutation({
    mutationFn: (id: string) => api.incidents.classify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
  const ticket = useMutation({
    mutationFn: (id: string) => api.incidents.ticket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
  const incidentId = incident?.id ?? null;
  const { mutate: runClassify, reset: resetClassify } = classify;
  const { reset: resetTicket } = ticket;
  useEffect(() => {
    resetClassify();
    resetTicket();
    if (incidentId) runClassify(incidentId);
  }, [incidentId, runClassify, resetClassify, resetTicket]);

  const c: IncidentClassification | undefined = classify.data;
  const ticketRef = ticket.data?.ticket_ref ?? incident?.ticket_ref ?? null;
  const criteria = c ? (Array.isArray(c.dora_criteria) ? c.dora_criteria : Object.entries(c.dora_criteria).map(([k, v]) => `${k}: ${String(v)}`)) : [];

  return (
    <Drawer
      open={!!incident}
      onClose={onClose}
      title={incident ? `Classify · ${incident.title}` : ''}
      subtitle={incident ? `${incident.id} · detected ${fmtDate(incident.detected_at)} · source ${incident.source}` : undefined}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => incident && classify.mutate(incident.id)} disabled={classify.isPending}>
            Re-run classification
          </button>
          <button type="button" className="btn-primary" onClick={() => incident && ticket.mutate(incident.id)} disabled={ticket.isPending || !!ticketRef}>
            <Ticket className="h-3.5 w-3.5" />
            {ticketRef ? `Ticket ${ticketRef}` : ticket.isPending ? 'Creating…' : 'Create ticket'}
          </button>
        </>
      }
    >
      {classify.isPending && <Spinner label="Classifying against DORA / NIS2 / GDPR…" />}
      {classify.isError && <Alert>{errorMessage(classify.error)}</Alert>}
      {ticket.isError && <Alert>{errorMessage(ticket.error)}</Alert>}
      {c && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-sm border p-2 text-center ${c.dora_major ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30' : 'border-slate-200 dark:border-navy-800'}`}>
              <div className="text-2xs font-semibold uppercase text-slate-500">DORA major</div>
              <div className="mt-1 text-sm font-semibold">{c.dora_major ? 'YES' : 'No'}</div>
            </div>
            <div className={`rounded-sm border p-2 text-center ${c.nis2_significant ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30' : 'border-slate-200 dark:border-navy-800'}`}>
              <div className="text-2xs font-semibold uppercase text-slate-500">NIS2 significant</div>
              <div className="mt-1 text-sm font-semibold">{c.nis2_significant ? 'YES' : 'No'}</div>
            </div>
            <div className={`rounded-sm border p-2 text-center ${c.personal_data_breach ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30' : 'border-slate-200 dark:border-navy-800'}`}>
              <div className="text-2xs font-semibold uppercase text-slate-500">GDPR breach</div>
              <div className="mt-1 text-sm font-semibold">{c.personal_data_breach ? 'YES' : 'No'}</div>
            </div>
          </div>

          <div>
            <KV k="AI severity" v={<SeverityBadge severity={c.severity} />} />
            <KV k="Approver" v={c.approver} />
          </div>

          <section>
            <h3 className="section-title mb-1">Summary</h3>
            <p className="text-xs text-slate-700 dark:text-slate-300">{c.summary}</p>
          </section>

          {criteria.length > 0 && (
            <section>
              <h3 className="section-title mb-1">DORA criteria (RTS 2024/1772)</h3>
              <ul className="list-disc space-y-0.5 pl-4 text-xs">
                {criteria.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="section-title mb-1">Notification deadlines</h3>
            <DeadlineList deadlines={c.deadlines ?? []} />
          </section>

          {c.questions_for_handler?.length > 0 && (
            <section>
              <h3 className="section-title mb-1">Questions for handler</h3>
              <ol className="list-decimal space-y-0.5 pl-4 text-xs">
                {c.questions_for_handler.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

export default function IncidentsPage() {
  const { t } = useI18n();
  const incidents = useQuery({ queryKey: ['incidents'], queryFn: api.incidents.list });
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  const columns: Column<Incident>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="mono text-2xs text-slate-500">{r.id}</span>, width: '90px' },
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span> },
    { key: 'status', header: 'Status', render: (r) => <span className="badge-neutral">{r.status}</span> },
    { key: 'sev', header: 'Severity', render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: 'source', header: 'Source', render: (r) => r.source },
    { key: 'detected', header: 'Detected', render: (r) => <span className="whitespace-nowrap text-slate-500">{fmtDate(r.detected_at)}</span> },
    { key: 'dora', header: 'DORA major', render: (r) => <BoolBadge value={r.dora_major} /> },
    { key: 'nis2', header: 'NIS2', render: (r) => <BoolBadge value={r.nis2_significant} /> },
    {
      key: 'deadlines',
      header: 'Next deadline',
      render: (r) => {
        const ds = deadlinesOf(r).toSorted((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
        if (ds.length === 0) return '—';
        const d = ds[0];
        const overdue = new Date(d.due).getTime() < Date.now();
        return (
          <span className={`whitespace-nowrap ${overdue ? 'text-rose-600 dark:text-rose-400' : ''}`}>
            <span className="badge-neutral mr-1">{d.regime}</span>
            {fmtDate(d.due)}
          </span>
        );
      },
    },
    { key: 'ticket', header: 'Ticket', render: (r) => (r.ticket_ref ? <span className="mono text-2xs">{r.ticket_ref}</span> : '—') },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          type="button"
          className="btn-secondary py-0.5"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
        >
          <Scale className="h-3 w-3" />
          Classify
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.incidents')}
        subtitle="Incident intake, regulatory classification (DORA Art. 19 / NIS2 Art. 23 / GDPR Art. 33) and ticketing."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            Report incident
          </button>
        }
      />
      <DataTable columns={columns} rows={incidents.data ?? []} rowKey={(r) => r.id} loading={incidents.isLoading} error={incidents.isError ? errorMessage(incidents.error) : null} />
      <CreateIncidentModal open={create} onClose={() => setCreate(false)} />
      <ClassifyDrawer incident={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

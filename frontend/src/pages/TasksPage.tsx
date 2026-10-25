import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, Repeat, Ticket } from 'lucide-react';
import { useState, type DragEvent, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Task, TaskCreate, TaskStatus } from '../api/types';
import Modal from '../components/Modal';
import { Alert, Field, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'Doing' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function priorityCls(p: string) {
  switch ((p ?? '').toLowerCase()) {
    case 'critical':
      return 'bg-rose-500';
    case 'high':
      return 'bg-orange-400';
    case 'medium':
      return 'bg-amber-400';
    default:
      return 'bg-slate-300 dark:bg-navy-600';
  }
}

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: (e: DragEvent<HTMLDivElement>, task: Task) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className={`cursor-grab rounded border bg-white p-2 text-xs shadow-xs active:cursor-grabbing dark:bg-navy-900 ${
        task.overdue ? 'border-rose-300 dark:border-rose-800' : 'border-slate-200 dark:border-navy-800'
      }`}
    >
      <div className="flex items-start gap-1.5">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityCls(task.priority)}`} title={`Priority ${task.priority}`} />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-800 dark:text-slate-100">{task.title}</div>
          {task.description && <p className="mt-0.5 line-clamp-2 text-2xs text-slate-500">{task.description}</p>}
        </div>
        {task.story_points !== null && task.story_points !== undefined && <span className="badge-neutral shrink-0">{task.story_points} sp</span>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-2xs text-slate-500">
        {task.assignee && <span className="rounded-sm bg-slate-100 px-1 dark:bg-navy-800">{task.assignee}</span>}
        {task.due_at && (
          <span className={`inline-flex items-center gap-0.5 ${task.overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>
            <CalendarClock className="h-3 w-3" />
            {fmtDate(task.due_at, false)}
            {task.overdue && ' · overdue'}
          </span>
        )}
        {task.recurrence && (
          <span className="inline-flex items-center gap-0.5" title={`Recurs ${task.recurrence}`}>
            <Repeat className="h-3 w-3" />
            {task.recurrence}
          </span>
        )}
        {task.ticket_ref && (
          <span className="mono inline-flex items-center gap-0.5">
            <Ticket className="h-3 w-3" />
            {task.ticket_ref}
          </span>
        )}
        {task.related_kind && (
          <span className="badge-accent normal-case">
            {task.related_kind} {task.related_id}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickAdd({ status, sprint }: { status: TaskStatus; sprint: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const create = useMutation({
    mutationFn: (t: string) => api.tasks.create({ title: t, status, priority: 'medium', sprint: sprint || undefined }),
    onSuccess: () => {
      setTitle('');
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) create.mutate(title.trim());
      }}
      className="mt-1"
    >
      <input className="input py-1 text-2xs" placeholder="+ quick add" value={title} onChange={(e) => setTitle(e.target.value)} disabled={create.isPending} />
    </form>
  );
}

function NewTaskModal({ open, onClose, sprints, defaultSprint }: { open: boolean; onClose: () => void; sprints: string[]; defaultSprint: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TaskCreate>({ title: '', description: '', status: 'todo', priority: 'medium', assignee: '', sprint: defaultSprint, story_points: undefined, due_at: '', recurrence: '', related_kind: '', related_id: '', reminder_days_before: [7, 1] });
  const create = useMutation({
    mutationFn: () =>
      api.tasks.create({
        ...form,
        description: form.description || undefined,
        assignee: form.assignee || undefined,
        sprint: form.sprint || undefined,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined,
        recurrence: form.recurrence || undefined,
        related_kind: form.related_kind || undefined,
        related_id: form.related_id || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });
  const set = <K extends keyof TaskCreate>(k: K, v: TaskCreate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };
  return (
    <Modal open={open} onClose={onClose} title="New task" width="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title">
          <input className="input" required value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="input h-16" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Story points">
            <input className="input" type="number" min={0} value={form.story_points ?? ''} onChange={(e) => set('story_points', e.target.value === '' ? undefined : Number(e.target.value))} />
          </Field>
          <Field label="Assignee">
            <input className="input" value={form.assignee ?? ''} onChange={(e) => set('assignee', e.target.value)} />
          </Field>
          <Field label="Sprint">
            <input className="input" list="sprints" value={form.sprint ?? ''} onChange={(e) => set('sprint', e.target.value)} />
            <datalist id="sprints">
              {sprints.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Due">
            <input className="input" type="datetime-local" value={form.due_at ?? ''} onChange={(e) => set('due_at', e.target.value)} />
          </Field>
          <Field label="Recurrence">
            <select className="input" value={form.recurrence ?? ''} onChange={(e) => set('recurrence', e.target.value)}>
              <option value="">none</option>
              {['weekly', 'monthly', 'quarterly', 'semiannual', 'annual'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Related kind">
            <select className="input" value={form.related_kind ?? ''} onChange={(e) => set('related_kind', e.target.value)}>
              <option value="">—</option>
              {['risk', 'incident', 'vendor', 'control', 'policy', 'vulnerability', 'gap', 'evidence'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Related ID">
            <input className="input mono" value={form.related_id ?? ''} onChange={(e) => set('related_id', e.target.value)} />
          </Field>
        </div>
        <Field label="Reminders (days before due, comma separated)">
          <input
            className="input"
            value={(form.reminder_days_before ?? []).join(', ')}
            onChange={(e) =>
              set(
                'reminder_days_before',
                e.target.value
                  .split(',')
                  .map((x) => Number(x.trim()))
                  .filter((n) => !Number.isNaN(n) && n >= 0),
              )
            }
          />
        </Field>
        {create.isError && <Alert>{errorMessage(create.error)}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TasksPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [sprint, setSprint] = useState('');
  const [modal, setModal] = useState(false);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const board = useQuery({ queryKey: ['tasks', 'board', sprint], queryFn: () => api.tasks.board(sprint || undefined) });

  const move = useMutation({
    mutationFn: (args: { id: string; status: TaskStatus }) => api.tasks.patch(args.id, { status: args.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const onDragStart = (e: DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: task.id, from: task.status }));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDrop = (e: DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    try {
      const { id, from } = JSON.parse(e.dataTransfer.getData('text/plain')) as { id: string; from: TaskStatus };
      if (id && from !== status) move.mutate({ id, status });
    } catch {
      /* ignore malformed drag payloads */
    }
  };

  const columns = board.data?.columns;
  const total = columns ? Object.values(columns).reduce((n, arr) => n + (arr?.length ?? 0), 0) : 0;
  const overdue = columns ? Object.values(columns).reduce((n, arr) => n + (arr ?? []).filter((x) => x.overdue).length, 0) : 0;

  return (
    <div className="flex h-[calc(100vh-88px)] flex-col">
      <PageHeader
        title={t('nav.tasks')}
        subtitle={`${total} tasks${overdue ? ` · ${overdue} overdue` : ''} · drag cards between columns to update status.`}
        actions={
          <>
            <select className="input w-auto" value={sprint} onChange={(e) => setSprint(e.target.value)}>
              <option value="">{t('common.all')} sprints</option>
              {(board.data?.sprints ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              New task
            </button>
          </>
        }
      />
      {board.isError && <Alert>{errorMessage(board.error)}</Alert>}
      {move.isError && <Alert>{errorMessage(move.error)}</Alert>}
      {board.isLoading && <Spinner />}
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const items = columns?.[col.key] ?? [];
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOver !== col.key) setDragOver(col.key);
              }}
              onDragLeave={() => setDragOver((d) => (d === col.key ? null : d))}
              onDrop={(e) => onDrop(e, col.key)}
              className={`flex min-h-0 flex-col rounded-md border p-2 transition-colors ${
                dragOver === col.key ? 'border-accent-500 bg-accent-500/5' : 'border-slate-200 bg-slate-50/60 dark:border-navy-800 dark:bg-navy-900/40'
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="section-title">{col.label}</span>
                <span className="badge-neutral">{items.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                {items.map((task) => (
                  <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
                ))}
                {items.length === 0 && <div className="rounded-sm border border-dashed border-slate-300 p-3 text-center text-2xs text-slate-400 dark:border-navy-700">Drop here</div>}
              </div>
              <QuickAdd status={col.key} sprint={sprint} />
            </div>
          );
        })}
      </div>
      <NewTaskModal open={modal} onClose={() => setModal(false)} sprints={board.data?.sprints ?? []} defaultSprint={sprint} />
    </div>
  );
}

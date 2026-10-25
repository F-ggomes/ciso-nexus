import { useMutation, useQuery } from '@tanstack/react-query';
import { BookMarked, GraduationCap, Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ChatMessage, CopilotProvider, SkillAnswer } from '../api/types';
import Markdown from '../components/Markdown';
import { Alert, PageHeader, Spinner, errorMessage } from '../components/common';
import { useI18n } from '../i18n';

const DEFAULT_SKILLS = ['standards', 'regulation', 'risk_controls', 'grc_ai', 'integrations'];

interface UiMsg extends ChatMessage {
  sources?: SkillAnswer['sources'];
  meta?: string;
}

export default function SkillsPage() {
  const { t } = useI18n();
  const skills = useQuery({ queryKey: ['skills'], queryFn: api.skills.list });
  const frameworks = useQuery({ queryKey: ['frameworks'], queryFn: api.frameworks.list });
  const [skill, setSkill] = useState(DEFAULT_SKILLS[0]);
  const [provider, setProvider] = useState<CopilotProvider>('anthropic');
  const [frameworkIds, setFrameworkIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Record<string, UiMsg[]>>({});
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const list = skills.data && skills.data.length > 0 ? skills.data : DEFAULT_SKILLS.map((s) => ({ skill: s, description: '' }));
  const messages = history[skill] ?? [];

  const ask = useMutation({
    mutationFn: (msgs: UiMsg[]) =>
      api.skills.ask({
        skill,
        question: msgs[msgs.length - 1].content,
        framework_ids: frameworkIds.length ? frameworkIds : undefined,
        provider,
        history: msgs.slice(0, -1).map(({ role, content }) => ({ role, content })),
      }),
    onSuccess: (res) => {
      setHistory((h) => ({ ...h, [res.skill ?? skill]: [...(h[res.skill ?? skill] ?? []), { role: 'assistant', content: res.answer, sources: res.sources, meta: `${res.provider} · ${res.model}` }] }));
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, ask.isPending]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || ask.isPending) return;
    const next: UiMsg[] = [...messages, { role: 'user', content: q }];
    setHistory((h) => ({ ...h, [skill]: next }));
    setInput('');
    ask.mutate(next);
  };

  const toggleFw = (id: string) => setFrameworkIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const current = list.find((s) => s.skill === skill);

  return (
    <div className="flex h-[calc(100vh-88px)] flex-col">
      <PageHeader
        title={t('nav.skills')}
        subtitle="Specialised assistants grounded in the repository. Answers cite framework requirements; nothing is written back."
        actions={
          <>
            <div className="flex items-center overflow-hidden rounded border border-slate-300 text-xs dark:border-navy-700">
              {(
                [
                  ['anthropic', 'Claude'],
                  ['gemini', 'Gemini'],
                ] as [CopilotProvider, string][]
              ).map(([p, label]) => (
                <button key={p} onClick={() => setProvider(p)} className={`px-3 py-1 font-medium ${provider === p ? 'bg-navy-800 text-white dark:bg-accent-600' : 'bg-white text-slate-600 dark:bg-navy-900 dark:text-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => setHistory((h) => ({ ...h, [skill]: [] }))} disabled={messages.length === 0}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </>
        }
      />
      <div className="flex gap-1 border-b border-slate-200 dark:border-navy-800">
        {list.map((s) => (
          <button
            key={s.skill}
            onClick={() => setSkill(s.skill)}
            title={s.description}
            className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium ${skill === s.skill ? 'border-accent-600 text-navy-900 dark:text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {s.skill.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      <div className="mt-3 flex min-h-0 flex-1 gap-3">
        <div className="card flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="mx-auto max-w-lg py-10 text-center">
                <GraduationCap className="mx-auto h-8 w-8 text-accent-600" />
                <p className="mt-2 text-sm font-medium">{skill.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-500">{current?.description || 'Ask a question. Optionally scope it to specific frameworks on the right.'}</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                <div className={`max-w-[80%] rounded-md px-3 py-2 ${m.role === 'user' ? 'bg-navy-800 text-white' : 'bg-slate-50 dark:bg-navy-800/60'}`}>
                  {m.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <Markdown source={m.content} className="text-xs" />}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 border-t border-slate-200 pt-1.5 dark:border-navy-700">
                      <div className="mb-1 flex items-center gap-1 text-2xs font-semibold text-slate-500">
                        <BookMarked className="h-3 w-3" /> Sources
                      </div>
                      <ul className="space-y-0.5 text-2xs">
                        {m.sources.map((s, j) => (
                          <li key={j}>
                            <span className="badge-accent mr-1 normal-case">{s.framework}</span>
                            <span className="mono mr-1">{s.ref}</span>
                            <span className="text-slate-600 dark:text-slate-300">{s.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {m.meta && <div className="mt-1 text-2xs text-slate-400">{m.meta}</div>}
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-navy-800/60">
                <Spinner label={`Consulting ${skill.replace(/_/g, ' ')} skill with ${provider === 'anthropic' ? 'Claude' : 'Gemini'}…`} />
              </div>
            )}
            {ask.isError && <Alert>{errorMessage(ask.error)}</Alert>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-navy-800">
            <input className="input flex-1" placeholder={`Ask the ${skill.replace(/_/g, ' ')} skill…`} value={input} onChange={(e) => setInput(e.target.value)} disabled={ask.isPending} />
            <button type="submit" className="btn-primary" disabled={ask.isPending || !input.trim()}>
              <Send className="h-3.5 w-3.5" />
              Ask
            </button>
          </form>
        </div>
        <aside className="card w-60 shrink-0 overflow-y-auto p-3">
          <h2 className="section-title mb-2">Scope to frameworks</h2>
          {frameworks.isLoading && <Spinner />}
          <ul className="space-y-1 text-xs">
            {(frameworks.data ?? []).map((f) => (
              <li key={f.id}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5" checked={frameworkIds.includes(f.id)} onChange={() => toggleFw(f.id)} />
                  <span>
                    {f.name} <span className="text-2xs text-slate-500">· {f.jurisdiction}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {frameworkIds.length > 0 && (
            <button className="btn-ghost mt-2 w-full justify-center text-2xs" onClick={() => setFrameworkIds([])}>
              Clear scope
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

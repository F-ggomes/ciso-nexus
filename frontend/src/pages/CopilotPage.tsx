import { useMutation } from '@tanstack/react-query';
import { Bot, ChevronDown, ChevronRight, Send, Trash2, User, Wrench } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { ChatMessage, CopilotProvider, ToolTrace } from '../api/types';
import Markdown from '../components/Markdown';
import { Alert, PageHeader, Spinner, errorMessage } from '../components/common';
import { useI18n } from '../i18n';

interface UiMessage extends ChatMessage {
  trace?: ToolTrace[];
  provider?: string;
  model?: string;
}

const SUGGESTIONS = [
  'Which incidents are approaching a DORA notification deadline?',
  'List tier 1 third parties without an exit strategy.',
  'Summarise failing evidence by framework for the last 30 days.',
  'Draft the ICT risk section of the board brief.',
];

function TraceView({ trace }: { trace: ToolTrace[] }) {
  const [open, setOpen] = useState(false);
  if (!trace || trace.length === 0) return null;
  return (
    <div className="mt-2 rounded border border-slate-200 text-2xs dark:border-navy-800">
      <button className="flex w-full items-center gap-1 px-2 py-1 text-left font-semibold text-slate-600 dark:text-slate-300" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3" />
        Tool trace ({trace.length})
      </button>
      {open && (
        <ol className="divide-y divide-slate-100 border-t border-slate-200 dark:divide-navy-800 dark:border-navy-800">
          {trace.map((t, i) => (
            <li key={i} className="px-2 py-1.5">
              <div className="mono font-semibold text-accent-700 dark:text-accent-400">{t.tool}</div>
              <pre className="mono mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap text-slate-600 dark:text-slate-400">{typeof t.input === 'string' ? t.input : JSON.stringify(t.input, null, 2)}</pre>
              <div className="mt-0.5 text-slate-500">→ {t.result_preview}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function CopilotPage() {
  const { t } = useI18n();
  const [provider, setProvider] = useState<CopilotProvider>('anthropic');
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: (history: ChatMessage[]) => api.copilot.chat(history, provider),
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, trace: res.trace, provider: res.provider, model: res.model }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chat.isPending]);

  const send = (text: string) => {
    const content = text.trim();
    if (!content || chat.isPending) return;
    const next: UiMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    chat.mutate(next.map(({ role, content: c }) => ({ role, content: c })));
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="flex h-[calc(100vh-88px)] flex-col">
      <PageHeader
        title={t('nav.copilot')}
        subtitle="Read-only assistant over the GRC data. Every call is logged to the AI audit trail; decisions require human approval."
        actions={
          <>
            <div className="flex items-center overflow-hidden rounded border border-slate-300 text-xs dark:border-navy-700">
              {(
                [
                  ['anthropic', 'Claude'],
                  ['gemini', 'Gemini'],
                ] as [CopilotProvider, string][]
              ).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`px-3 py-1 font-medium ${provider === p ? 'bg-navy-800 text-white dark:bg-accent-600' : 'bg-white text-slate-600 dark:bg-navy-900 dark:text-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={() => setMessages([])} disabled={messages.length === 0}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </>
        }
      />

      <div className="card flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg py-10 text-center">
              <Bot className="mx-auto h-8 w-8 text-accent-600" />
              <p className="mt-2 text-sm font-medium">Ask the GRC copilot</p>
              <p className="text-xs text-slate-500">It can query risks, incidents, third parties, evidence and frameworks through audited tools.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn-secondary justify-start text-left" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-md px-3 py-2 ${m.role === 'user' ? 'bg-navy-800 text-white' : 'bg-slate-50 dark:bg-navy-800/60'}`}>
                {m.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <Markdown source={m.content} className="text-xs" />}
                {m.role === 'assistant' && (
                  <>
                    <TraceView trace={m.trace ?? []} />
                    {(m.provider || m.model) && (
                      <div className="mt-1 text-2xs text-slate-400">
                        {m.provider} · {m.model}
                      </div>
                    )}
                  </>
                )}
              </div>
              {m.role === 'user' && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-navy-700 dark:text-slate-200">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
          {chat.isPending && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-navy-800/60">
                <Spinner label={`Thinking with ${provider === 'anthropic' ? 'Claude' : 'Gemini'}…`} />
              </div>
            </div>
          )}
          {chat.isError && <Alert>{errorMessage(chat.error)}</Alert>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-200 p-3 dark:border-navy-800">
          <input
            className="input flex-1"
            placeholder="Ask about risks, incidents, third parties, evidence…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={chat.isPending}
          />
          <button type="submit" className="btn-primary" disabled={chat.isPending || !input.trim()}>
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

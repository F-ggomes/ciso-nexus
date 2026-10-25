import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, FileSignature, Pencil, Save, Send, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getRole } from '../api/client';
import type { CopilotProvider } from '../api/types';
import Markdown from '../components/Markdown';
import { Alert, Field, KV, Spinner, errorMessage, fmtDate } from '../components/common';
import { PolicyStatusBadge } from './PoliciesPage';

export default function PolicyDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const role = (getRole() ?? '').toLowerCase();
  const isCiso = role === 'ciso' || role === 'admin';

  const policy = useQuery({ queryKey: ['policies', id], queryFn: () => api.policies.get(id), enabled: !!id });
  const attestations = useQuery({ queryKey: ['policies', id, 'attestations'], queryFn: () => api.policies.attestations(id), enabled: !!id });

  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [instructions, setInstructions] = useState('');
  const [provider, setProvider] = useState<CopilotProvider>('anthropic');
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (policy.data && !editing) setContent(policy.data.content_md ?? '');
  }, [policy.data, editing]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['policies'] });
  };
  const draft = useMutation({
    mutationFn: () => api.policies.draft(id, instructions, provider),
    onSuccess: (d) => {
      setContent(d.content_md);
      setEditing(true);
      setChangeNote(`AI draft (${provider}) — ${instructions.slice(0, 80)}`);
      setAiOpen(false);
    },
  });
  const saveVersion = useMutation({
    mutationFn: () => api.policies.addVersion(id, content, changeNote || 'Manual edit'),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      setChangeNote('');
    },
  });
  const submit = useMutation({ mutationFn: () => api.policies.submit(id), onSuccess: invalidate });
  const approve = useMutation({ mutationFn: () => api.policies.approve(id), onSuccess: invalidate });
  const attest = useMutation({
    mutationFn: () => api.policies.attest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies', id, 'attestations'] }),
  });

  const p = policy.data;

  return (
    <div className="space-y-3">
      <Link to="/policies" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Policies
      </Link>
      {policy.isLoading && <Spinner />}
      {policy.isError && <Alert>{errorMessage(policy.error)}</Alert>}
      {p && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="mono text-xs text-slate-500">{p.code}</span>
                <PolicyStatusBadge status={p.status} />
                <span className="badge-neutral">{p.doc_kind}</span>
                <span className="badge-neutral">{p.language}</span>
              </div>
              <h1 className="page-title mt-1">{p.title}</h1>
              <p className="text-xs text-slate-500">
                Owner {p.owner ?? '—'} · v{p.current_version ?? '0'} · review every {p.review_cycle_months} months · next {fmtDate(p.next_review_at, false)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary" onClick={() => setAiOpen((o) => !o)}>
                <Sparkles className="h-3.5 w-3.5" />
                Draft with AI
              </button>
              {!editing ? (
                <button className="btn-secondary" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setContent(p.content_md ?? '');
                  }}
                >
                  Cancel edit
                </button>
              )}
              <button className="btn-secondary" onClick={() => submit.mutate()} disabled={submit.isPending || p.status === 'in_review' || p.status === 'approved'}>
                <Send className="h-3.5 w-3.5" />
                Submit for review
              </button>
              <button className="btn-primary" onClick={() => approve.mutate()} disabled={!isCiso || approve.isPending || p.status === 'approved'} title={isCiso ? '' : 'CISO role required'}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </button>
              <button className="btn-secondary" onClick={() => attest.mutate()} disabled={attest.isPending || p.status !== 'approved'} title={p.status !== 'approved' ? 'Only approved documents can be attested' : ''}>
                <FileSignature className="h-3.5 w-3.5" />
                Attest
              </button>
            </div>
          </div>

          {(submit.isError || approve.isError || attest.isError) && <Alert>{errorMessage(submit.error ?? approve.error ?? attest.error)}</Alert>}
          {attest.isSuccess && <Alert kind="success">Attestation recorded.</Alert>}

          {aiOpen && (
            <div className="card space-y-2 p-3">
              <div className="flex items-center justify-between">
                <h2 className="section-title">AI drafting</h2>
                <div className="flex items-center overflow-hidden rounded-sm border border-slate-300 text-xs dark:border-navy-700">
                  {(
                    [
                      ['anthropic', 'Claude'],
                      ['gemini', 'Gemini'],
                    ] as [CopilotProvider, string][]
                  ).map(([k, label]) => (
                    <button key={k} onClick={() => setProvider(k)} className={`px-3 py-1 font-medium ${provider === k ? 'bg-navy-800 text-white dark:bg-accent-600' : 'bg-white text-slate-600 dark:bg-navy-900 dark:text-slate-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Instructions" hint="Describe audience, tone, mandatory clauses and the requirements to cover. The draft lands in the editor for review before it is saved as a version.">
                <textarea className="input h-20" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Write a concise access-control policy for a fintech software company covering ISO 27001 A.5.15–A.5.18 and DORA Art. 9, in Portuguese (PT)…" />
              </Field>
              {draft.isError && <Alert>{errorMessage(draft.error)}</Alert>}
              <div className="flex items-center justify-end gap-3">
                {draft.isPending && <Spinner label={`Drafting with ${provider === 'anthropic' ? 'Claude' : 'Gemini'}…`} />}
                <button className="btn-primary" onClick={() => draft.mutate()} disabled={draft.isPending || instructions.trim().length < 5}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate draft
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <div className="card p-4 xl:col-span-3">
              {editing ? (
                <div className="space-y-2">
                  <textarea className="input mono h-[60vh] resize-y text-xs" value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} />
                  <div className="flex items-end gap-2">
                    <Field label="Change note">
                      <input className="input" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="What changed and why" />
                    </Field>
                    <button className="btn-primary" onClick={() => saveVersion.mutate()} disabled={saveVersion.isPending || !content.trim()}>
                      <Save className="h-3.5 w-3.5" />
                      {saveVersion.isPending ? 'Saving…' : 'Save as new version'}
                    </button>
                  </div>
                  {saveVersion.isError && <Alert>{errorMessage(saveVersion.error)}</Alert>}
                </div>
              ) : p.content_md ? (
                <Markdown source={p.content_md} />
              ) : (
                <p className="text-xs text-slate-500">No content yet. Use "Draft with AI" or "Edit" to write the first version.</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="card p-3">
                <h2 className="section-title mb-1">Current version</h2>
                {p.version_meta ? (
                  <>
                    <KV k="Version" v={p.version_meta.version} />
                    <KV k="Author" v={p.version_meta.author} />
                    <KV k="AI generated" v={p.version_meta.ai_generated ? <span className="badge-info">yes</span> : 'no'} />
                    <KV k="Created" v={fmtDate(p.version_meta.created_at)} />
                    <KV k="Approved by" v={p.version_meta.approved_by ?? '—'} />
                    <KV k="Approved at" v={fmtDate(p.version_meta.approved_at)} />
                    <KV k="SHA-256" v={<span className="mono break-all text-2xs">{p.version_meta.sha256?.slice(0, 16)}…</span>} />
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No versions.</p>
                )}
              </div>
              <div className="card p-3">
                <h2 className="section-title mb-1">Requirements</h2>
                <div className="flex flex-wrap gap-1">
                  {(p.requirement_refs ?? []).map((r, i) => (
                    <span key={i} className="badge-accent normal-case">
                      {r.framework_id}:{r.ref}
                    </span>
                  ))}
                  {(p.requirement_refs ?? []).length === 0 && <span className="text-xs text-slate-500">—</span>}
                </div>
              </div>
              <div className="card p-3">
                <h2 className="section-title mb-1">Version history ({p.versions?.length ?? 0})</h2>
                <ul className="divide-y divide-slate-100 text-xs dark:divide-navy-800">
                  {(p.versions ?? []).map((v, i) => (
                    <li key={i} className="py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">v{v.version}</span>
                        <span className="text-2xs text-slate-500">{fmtDate(v.created_at)}</span>
                      </div>
                      <div className="text-2xs text-slate-500">
                        {v.author} {v.ai_generated && <span className="badge-info ml-1">AI</span>} {v.approved_at && <span className="badge-pass ml-1">approved</span>}
                      </div>
                      {v.change_note && <div className="mt-0.5 text-slate-600 dark:text-slate-300">{v.change_note}</div>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-3">
                <h2 className="section-title mb-1">Attestations ({attestations.data?.length ?? 0})</h2>
                <ul className="divide-y divide-slate-100 text-xs dark:divide-navy-800">
                  {(attestations.data ?? []).map((a, i) => (
                    <li key={a.id ?? i} className="flex items-center justify-between py-1">
                      <span>{a.user ?? a.actor ?? a.email ?? 'user'}</span>
                      <span className="text-2xs text-slate-500">{fmtDate(a.at ?? a.attested_at ?? null)}</span>
                    </li>
                  ))}
                  {(attestations.data ?? []).length === 0 && <li className="py-1 text-slate-500">None yet.</li>}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

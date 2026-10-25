import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Asset, AssetInput } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import { Alert, BoolBadge, Field, PageHeader, errorMessage } from '../components/common';
import { useI18n } from '../i18n';

const ASSET_TYPES = ['application', 'database', 'server', 'network', 'endpoint', 'cloud-service', 'data', 'people', 'facility', 'supplier-service', 'other'];
const CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted'];
const CRITICALITIES = ['low', 'medium', 'high', 'critical'];

const emptyAsset: AssetInput = {
  name: '',
  asset_type: 'application',
  owner: '',
  classification: 'internal',
  cia: { c: 2, i: 2, a: 2 },
  criticality: 'medium',
  supports_critical_function: false,
  location: '',
};

function ClassBadge({ value }: { value: string }) {
  const v = (value ?? '').toLowerCase();
  const cls =
    v === 'restricted'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
      : v === 'confidential'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        : v === 'internal'
          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
          : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300';
  return <span className={`badge ${cls}`}>{v || '—'}</span>;
}

function CiaCell({ cia }: { cia: Asset['cia'] }) {
  const cell = (label: string, v: number) => (
    <span className="inline-flex items-center gap-0.5" title={`${label}: ${v}`}>
      <span className="text-2xs text-slate-500">{label}</span>
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-sm text-2xs font-semibold ${v >= 3 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' : v === 2 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300'}`}>{v}</span>
    </span>
  );
  return (
    <span className="inline-flex gap-1.5">
      {cell('C', cia?.c ?? 0)}
      {cell('I', cia?.i ?? 0)}
      {cell('A', cia?.a ?? 0)}
    </span>
  );
}

function AssetDrawer({ asset, open, onClose }: { asset: Asset | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AssetInput>(emptyAsset);
  useEffect(() => {
    if (!open) return;
    setForm(
      asset
        ? {
            name: asset.name,
            asset_type: asset.asset_type,
            owner: asset.owner ?? '',
            classification: asset.classification,
            cia: asset.cia ?? { c: 2, i: 2, a: 2 },
            criticality: asset.criticality,
            supports_critical_function: asset.supports_critical_function,
            location: asset.location ?? '',
          }
        : emptyAsset,
    );
  }, [asset, open]);

  const save = useMutation({
    mutationFn: () => (asset ? api.isms.patchAsset(asset.id, form) : api.isms.createAsset(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['isms', 'assets'] });
      onClose();
    },
  });
  const set = <K extends keyof AssetInput>(k: K, v: AssetInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <Drawer open={open} onClose={onClose} title={asset ? `Edit · ${asset.name}` : 'New asset'} subtitle={asset?.external_system ? `Synced from ${asset.external_system}:${asset.external_id}` : undefined}>
      <form id="asset-form" onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className="input" value={form.asset_type} onChange={(e) => set('asset_type', e.target.value)}>
              {ASSET_TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Owner">
            <input className="input" value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} />
          </Field>
          <Field label="Classification">
            <select className="input" value={form.classification} onChange={(e) => set('classification', e.target.value)}>
              {CLASSIFICATIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Criticality">
            <select className="input" value={String(form.criticality)} onChange={(e) => set('criticality', e.target.value)}>
              {CRITICALITIES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <input className="input" value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="PT-Coimbra · AO-Luanda · EU-cloud" />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-xs">
            <input type="checkbox" checked={form.supports_critical_function} onChange={(e) => set('supports_critical_function', e.target.checked)} />
            Supports critical / important function
          </label>
        </div>
        <div>
          <span className="label">CIA rating (1–4)</span>
          <div className="grid grid-cols-3 gap-3">
            {(['c', 'i', 'a'] as const).map((k) => (
              <label key={k} className="text-xs">
                <span className="mr-1 font-semibold uppercase">{k}</span>
                <input type="range" min={1} max={4} className="w-full" value={form.cia[k]} onChange={(e) => set('cia', { ...form.cia, [k]: Number(e.target.value) })} />
                <span className="tabular-nums">{form.cia[k]}</span>
              </label>
            ))}
          </div>
        </div>
        {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : asset ? 'Save changes' : 'Create asset'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

export default function AssetsPage() {
  const { t } = useI18n();
  const assets = useQuery({ queryKey: ['isms', 'assets'], queryFn: api.isms.assets });
  const [editing, setEditing] = useState<Asset | null>(null);
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const rows = (assets.data ?? []).filter((a) => !typeFilter || a.asset_type === typeFilter);
  const types = Array.from(new Set((assets.data ?? []).map((a) => a.asset_type))).sort();

  const columns: Column<Asset>[] = [
    {
      key: 'name',
      header: 'Asset',
      render: (a) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">{a.name}</div>
          {a.external_system && <div className="mono text-2xs text-slate-500">{a.external_system}:{a.external_id}</div>}
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (a) => <span className="badge-neutral normal-case">{a.asset_type}</span> },
    { key: 'owner', header: 'Owner', render: (a) => a.owner ?? <span className="text-slate-400">unassigned</span> },
    { key: 'class', header: 'Classification', render: (a) => <ClassBadge value={a.classification} /> },
    { key: 'cia', header: 'CIA', render: (a) => <CiaCell cia={a.cia} /> },
    { key: 'crit', header: 'Criticality', render: (a) => <span className="badge-neutral">{String(a.criticality)}</span> },
    { key: 'cif', header: 'CIF', render: (a) => <BoolBadge value={a.supports_critical_function} yes="CIF" no="no" /> },
    { key: 'loc', header: 'Location', render: (a) => a.location ?? '—' },
    {
      key: 'actions',
      header: '',
      render: (a) => (
        <button
          className="btn-secondary py-0.5"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(a);
            setOpen(true);
          }}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.assets')}
        subtitle="Information asset inventory with ownership, classification and CIA ratings (ISO/IEC 27001 A.5.9–A.5.13)."
        actions={
          <>
            <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">{t('common.all')} types</option>
              {types.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New asset
            </button>
          </>
        }
      />
      <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} loading={assets.isLoading} error={assets.isError ? errorMessage(assets.error) : null} />
      <AssetDrawer asset={editing} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

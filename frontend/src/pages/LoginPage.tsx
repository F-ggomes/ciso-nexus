import { Shield } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { isAuthenticated, login } from '../api/client';
import { Alert, errorMessage } from '../components/common';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  if (isAuthenticated()) return <Navigate to={next} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      navigate(next.startsWith('/') ? next : '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-white">
          <Shield className="h-7 w-7 text-accent-400" />
          <div>
            <div className="text-lg font-semibold tracking-tight">CISO Nexus</div>
            <div className="text-2xs text-slate-400">AI GRC orchestration · Grupo | PT · EU · AO</div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <h1 className="text-sm font-semibold text-navy-900 dark:text-slate-100">Sign in</h1>
          {error && <Alert>{error}</Alert>}
          <label className="block">
            <span className="label">Username</span>
            <input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn-primary w-full justify-center" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-2xs text-slate-500">Access is logged. Authorised personnel only.</p>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const AdminLoginPage = () => {
  const { user, loginAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await loginAdmin(email, password);
      addToast('Admin login successful', 'success');
      navigate('/admin', { replace: true });
    } catch (loginError) {
      setError(loginError.response?.data?.message || 'Admin authentication failed.');
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-4xl border border-stone-200 bg-white p-10 shadow-sm">
      <h1 className="text-3xl font-semibold text-stone-900">Administrator login</h1>
      <p className="mt-3 text-stone-600">This area is restricted to authorized administrators.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error ? <p className="rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
        </label>
        <button type="submit" disabled={loading} className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
};

export default AdminLoginPage;

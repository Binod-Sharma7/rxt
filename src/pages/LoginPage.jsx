import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const LoginPage = () => {
  const { loginWithGoogle, loginWithApple, loading } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [error, setError] = useState('');

  const firebaseError = (authError) => {
    const messages = {
      'auth/popup-closed-by-user': 'The sign-in popup was closed.',
      'auth/cancelled-popup-request': 'The sign-in request was cancelled.',
      'auth/account-exists-with-different-credential': 'An account already exists with another sign-in method.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled yet.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again later.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.'
    };
    return messages[authError.code] || authError.message || 'Authentication failed. Please try again.';
  };

  const runProviderLogin = async (loginMethod) => {
    setError('');
    try {
      await loginMethod();
      addToast('Login successful', 'success');
      navigate('/dashboard');
    } catch (authError) {
      setError(firebaseError(authError));
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-4xl border border-stone-200 bg-white p-10 shadow-sm">
      <h1 className="text-3xl font-semibold text-stone-900">Login</h1>
      <p className="mt-3 text-stone-600">Access your orders, cart, and profile.</p>
      <div className="mt-8 space-y-3">
        {error ? <p className="rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <button
          type="button"
          onClick={() => runProviderLogin(loginWithGoogle)}
          disabled={loading}
          className="w-full cursor-pointer rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => runProviderLogin(loginWithApple)}
          disabled={loading}
          className="w-full cursor-pointer rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Apple
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

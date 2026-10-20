import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await register(form.name, form.email, form.password, form.phone, form.address);
      addToast('Account created successfully', 'success');
      navigate('/dashboard');
    } catch {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-stone-200 bg-white p-10 shadow-sm">
      <h1 className="text-3xl font-semibold text-stone-900">Create an account</h1>
      <p className="mt-3 text-stone-600">Start ordering custom prints and managing your profile.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error ? <p className="rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {['name', 'email', 'password', 'phone', 'address'].map((field) => (
          <label key={field} className="space-y-2">
            <span className="text-sm font-medium text-stone-700">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
            <input
              name={field}
              type={field === 'password' ? 'password' : 'text'}
              value={form[field]}
              onChange={handleChange}
              required={field !== 'phone' && field !== 'address'}
              className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none"
            />
          </label>
        ))}
        <button type="submit" className="w-full rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">Register</button>
      </form>
      <p className="mt-6 text-sm text-stone-600">Already have an account? <Link to="/login" className="font-semibold text-stone-900">Login</Link>.</p>
    </div>
  );
};

export default RegisterPage;

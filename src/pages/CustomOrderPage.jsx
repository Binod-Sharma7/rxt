import { useState } from 'react';
import { createCustomOrder } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CustomOrderPage = () => {
  const { token, user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', selectedColor: '', description: '', quantity: 1, colors: '', category: 'custom-products' });
  const [files, setFiles] = useState({ imageFile: null, stlFile: null });
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files: fileList } = event.target;
    setFiles((current) => ({ ...current, [name]: fileList[0] || null }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('phone', form.phone);
    formData.append('address', form.address);
    formData.append('selectedColor', form.selectedColor);
    formData.append('description', form.description);
    formData.append('quantity', form.quantity);
    formData.append('colors', form.colors);
    formData.append('category', form.category);
    if (files.imageFile) {
      formData.append('imageFile', files.imageFile);
    }
    if (files.stlFile) {
      formData.append('stlFile', files.stlFile);
    }

    await createCustomOrder(formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    setMessage('Custom request submitted successfully.');
    setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', selectedColor: '', description: '', quantity: 1, colors: '', category: 'custom-products' });
    setFiles({ imageFile: null, stlFile: null });
  };

  return (
    <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-stone-900">Custom Products</h1>
      <p className="mt-3 text-stone-600">Share your idea, upload your file, and we’ll turn it into a premium custom print.</p>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Name</span>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Phone number</span>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Selected color</span>
            <input name="selectedColor" value={form.selectedColor} onChange={handleChange} placeholder="Sand" className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
        </div>
        <label className="space-y-2">
          <span className="text-sm font-medium text-stone-700">Description</span>
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Quantity</span>
            <input name="quantity" type="number" min={1} value={form.quantity} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Available colors</span>
            <input name="colors" value={form.colors} onChange={handleChange} placeholder="Sand, Oak, Terracotta" className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Category</span>
            <select name="category" value={form.category} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none">
              <option value="custom-products">Custom Products</option>
              <option value="lithophanes">Lithophanes</option>
              <option value="decorative-items">Decorative Items</option>
              <option value="lamps">Lamps</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">Address</span>
            <input name="address" value={form.address} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Upload image (for lithophane)</span>
            <input name="imageFile" type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-stone-700" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Upload STL file (custom model)</span>
            <input name="stlFile" type="file" accept=".stl" onChange={handleFileChange} className="w-full text-sm text-stone-700" />
          </label>
        </div>
        <button type="submit" className="inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">Submit request</button>
        {message ? <p className="rounded-3xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      </form>
    </div>
  );
};

export default CustomOrderPage;

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { apiBaseUrl, apiOrigin, createProduct, deleteProduct, getAdminProducts, getCategories, updateProduct } from '../services/api';
import { useToast } from '../components/ToastProvider';
import StateCard from '../components/StateCard';

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', price: 0, discount: 0, colors: '', dimensions: '', stock: 0, popularity: 0, images: '', imageAssets: [], description: '', reviews: 0, featured: false });
  const [previewImages, setPreviewImages] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [priceEditTarget, setPriceEditTarget] = useState(null);
  const [priceEditForm, setPriceEditForm] = useState({ price: '', discount: '', discountEnabled: false });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [updatingFeaturedId, setUpdatingFeaturedId] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const pageSize = 5;
  const { addToast } = useToast();
  const token = localStorage.getItem('reforgedx-token');

  useEffect(() => {
    setLoading(true);
    Promise.all([getAdminProducts(token), getCategories()])
      .then(([productsResponse, categoriesResponse]) => {
        setProducts(productsResponse.data);
        setCategories(categoriesResponse.data || []);
      })
      .catch(() => {
        setProducts([]);
        setCategories([]);
        setError('Could not load products right now.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, stockFilter, featuredFilter]);

  const categoryOptions = useMemo(() => {
    const values = Array.from(new Set([...(categories || []).map((category) => category.name).filter(Boolean), ...(products || []).map((product) => product.category).filter(Boolean)]));
    return values.map((value) => ({ id: value, name: value }));
  }, [categories, products]);

  const refresh = () => {
    setLoading(true);
    return getAdminProducts(token).then((response) => {
      setError('');
      setProducts(response.data);
    }).catch(() => {
      setProducts([]);
      setError('Could not refresh products.');
    }).finally(() => setLoading(false));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      addToast('Unsupported image type', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('Image must be smaller than 2MB', 'error');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/products/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');
      const imageUrl = data.imageUrl.startsWith('http') ? data.imageUrl : `${apiOrigin}${data.imageUrl}`;
      setForm((current) => ({
        ...current,
        images: current.images ? `${current.images},${imageUrl}` : imageUrl,
        imageAssets: [...current.imageAssets, {
          url: imageUrl,
          storageId: data.storageId || '',
          format: data.format || '',
          resourceType: data.resourceType || 'image'
        }]
      }));
      setPreviewImages((current) => [...current, imageUrl]);
      addToast('Image uploaded', 'success');
    } catch (error) {
      addToast(error.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!form.name || !form.category || !form.dimensions || !form.colors || !form.images) {
      addToast('Please fill all required product fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discount: Number(form.discount),
        stock: Number(form.stock),
        popularity: Number(form.popularity),
        images: String(form.images).split(',').map((url) => url.trim()).filter(Boolean),
        colors: String(form.colors).split(',').map((color) => color.trim()).filter(Boolean),
        featured: Boolean(form.featured)
      };
      await createProduct(payload, token);
      setForm({ name: '', category: '', price: 0, discount: 0, colors: '', dimensions: '', stock: 0, popularity: 0, images: '', imageAssets: [], description: '', reviews: 0, featured: false });
      setPreviewImages([]);
      addToast('Product added', 'success');
      await refresh();
    } catch (error) {
      addToast(error.message || 'Could not save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await deleteProduct(id, token);
      addToast('Product deleted', 'success');
      await refresh();
      setDeleteTarget(null);
    } catch (error) {
      addToast(error.message || 'Delete failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (product) => {
    if (updatingFeaturedId === product.id) return;
    setUpdatingFeaturedId(product.id);
    try {
      const response = await updateProduct(product.id, { featured: !product.featured }, token);
      setProducts((current) => current.map((currentProduct) => currentProduct.id === product.id ? response.data : currentProduct));
      addToast(product.featured ? 'Product unfeatured' : 'Product featured', 'success');
    } catch (error) {
      addToast(error.message || 'Could not update feature state', 'error');
    } finally {
      setUpdatingFeaturedId(null);
    }
  };

  const updateStock = async (product, delta) => {
    const nextStock = Math.max(0, (product.stock || 0) + delta);
    try {
      await updateProduct(product.id, { stock: nextStock, status: nextStock > 0 ? (nextStock < 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock' }, token);
      await refresh();
      addToast('Stock updated', 'success');
    } catch (error) {
      addToast(error.message || 'Could not update stock', 'error');
    }
  };

  const openPriceEditor = (product) => {
    const discount = Number(product.discount);
    setPriceEditTarget(product);
    setPriceEditForm({
      price: String(product.price ?? ''),
      discount: String(Number.isFinite(discount) ? discount : 0),
      discountEnabled: Number.isFinite(discount) && discount > 0
    });
  };

  const handlePriceEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPriceEditForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePriceEdit = async (event) => {
    event.preventDefault();
    const price = Number(priceEditForm.price);
    const discount = priceEditForm.discountEnabled ? Number(priceEditForm.discount) : 0;
    if (!Number.isFinite(price) || price <= 0) {
      addToast('Price must be greater than zero', 'error');
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      addToast('Discount must be between 0 and 100%', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await updateProduct(priceEditTarget.id, { price, discount }, token);
      setProducts((current) => current.map((product) => product.id === priceEditTarget.id ? response.data : product));
      addToast('Product pricing updated', 'success');
      setPriceEditTarget(null);
    } catch (error) {
      addToast(error.message || 'Could not update product pricing', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !term || product.name?.toLowerCase().includes(term) || product.category?.toLowerCase().includes(term) || product.id?.toLowerCase().includes(term);
      const matchesCategory = !categoryFilter || product.category === categoryFilter;
      const matchesStock = !stockFilter || (stockFilter === 'out' && (product.stock || 0) <= 0) || (stockFilter === 'low' && (product.stock || 0) > 0 && (product.stock || 0) < 5) || (stockFilter === 'in' && (product.stock || 0) >= 5);
      const matchesFeatured = !featuredFilter || (featuredFilter === 'featured' && product.featured) || (featuredFilter === 'not-featured' && !product.featured);
      return matchesSearch && matchesCategory && matchesStock && matchesFeatured;
    });
  }, [products, search, categoryFilter, stockFilter, featuredFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-900">Products</h1>
        <p className="mt-3 text-stone-600">Add, edit, and delete products for the storefront.</p>
      </div>
      <section className="grid gap-6 lg:grid-cols-[1fr_460px]">
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Product catalog</h2>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="w-full rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none md:max-w-xs" />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none">
              <option value="">All categories</option>
              {categoryOptions.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>
            <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none">
              <option value="">All stock</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
            <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value)} className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none">
              <option value="">All featured</option>
              <option value="featured">Featured</option>
              <option value="not-featured">Not featured</option>
            </select>
          </div>
          {loading ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <tbody>
                  {Array.from({ length: 4 }).map((_, index) => <tr key={index} className="border-b border-stone-100"><td className="px-2 py-3"><div className="h-12 w-12 animate-pulse rounded-xl bg-stone-200" /></td><td className="px-2 py-3"><div className="h-4 w-24 animate-pulse rounded-full bg-stone-200" /></td><td className="px-2 py-3"><div className="h-4 w-20 animate-pulse rounded-full bg-stone-200" /></td><td className="px-2 py-3"><div className="h-4 w-14 animate-pulse rounded-full bg-stone-200" /></td></tr>)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-600">
                    <th className="px-2 py-3">Image</th>
                    <th className="px-2 py-3">Product</th>
                    <th className="px-2 py-3">Category</th>
                    <th className="px-2 py-3">Price</th>
                    <th className="px-2 py-3">Discount</th>
                    <th className="px-2 py-3">Stock</th>
                    <th className="px-2 py-3">Featured</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => (
                    <tr key={product.id} className="border-b border-stone-100 align-middle">
                      <td className="px-2 py-3">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-500">No image</div>
                        )}
                      </td>
                      <td className="px-2 py-3"><div className="font-semibold text-stone-900">{product.name}</div><div className="text-xs text-stone-500">{product.productId || product.id}</div><div className="text-[11px] text-stone-400">SKU {product.sku || '—'}</div></td>
                      <td className="px-2 py-3">{product.category}</td>
                      <td className="px-2 py-3">NPR {Number(product.price || 0).toLocaleString()}<div className="text-xs text-stone-500">Final: NPR {Math.round(Number(product.price || 0) * (1 - Number(product.discount || 0) / 100)).toLocaleString()}</div></td>
                      <td className="px-2 py-3">{product.discount || 0}%</td>
                      <td className="px-2 py-3">{product.stock || 0}</td>
                      <td className="px-2 py-3">{product.featured ? 'Yes' : 'No'}</td>
                      <td className="px-2 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.stock <= 0 ? 'bg-rose-100 text-rose-700' : product.stock < 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{product.status || (product.stock > 0 ? (product.stock < 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock')}</span></td>
                      <td className="px-2 py-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => updateStock(product, -1)} className="rounded-full border border-stone-300 px-2 py-1 text-xs">-</button>
                          <button onClick={() => updateStock(product, 1)} className="rounded-full border border-stone-300 px-2 py-1 text-xs">+</button>
                          <button onClick={() => handleToggleFeatured(product)} disabled={updatingFeaturedId === product.id} className="rounded-full border border-stone-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50">{updatingFeaturedId === product.id ? 'Updating...' : product.featured ? 'Unfeature' : 'Feature'}</button>
                          <button onClick={() => openPriceEditor(product)} className="rounded-full border border-stone-300 px-2 py-1 text-xs">Edit price</button>
                          <button onClick={() => setDeleteTarget(product)} className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredProducts.length === 0 ? <p className="mt-6 text-sm text-stone-600">No products found.</p> : null}
                    {!loading && filteredProducts.length === 0 ? <StateCard title="No products found" description="Try a different filter or add a new product to the catalog." /> : null}
          {!loading ? (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-stone-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-full border border-stone-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-full border border-stone-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Next</button>
              </div>
            </div>
          ) : null}
        </div>
        <form onSubmit={handleAdd} className="space-y-4 rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Add product</h2>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Product Name *</span>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Category *</span>
            <select name="category" value={form.category} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none">
              <option value="">Select a category</option>
              {categoryOptions.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Price *</span>
              <input name="price" type="number" min="0" value={form.price} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Discount %</span>
              <input name="discount" type="number" min="0" max="100" value={form.discount} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Stock *</span>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Popularity</span>
              <input name="popularity" type="number" min="0" value={form.popularity} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Dimensions *</span>
            <input name="dimensions" value={form.dimensions} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Available Colors *</span>
            <input name="colors" value={form.colors} onChange={handleChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Images *</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            {uploading ? <p className="text-sm text-stone-600">Uploading image...</p> : null}
            {previewImages.length > 0 ? <div className="flex flex-wrap gap-3">{previewImages.map((image) => <img key={image} src={image} alt="Preview" className="h-20 w-20 rounded-2xl object-cover" />)}</div> : null}
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Description</span>
            <textarea name="description" rows={4} value={form.description} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
          </label>
          <label className="flex items-center gap-3 rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <input name="featured" type="checkbox" checked={form.featured} onChange={handleChange} />
            <span>Featured product</span>
          </label>
          <button type="submit" disabled={saving} className="inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving...' : 'Create product'}
          </button>
        </form>
      </section>
      {error ? <StateCard tone="error" title="Product load error" description={error} /> : null}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4">
          <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 shadow-xl">
            <h3 className="text-xl font-semibold text-stone-900">Delete product?</h3>
            <p className="mt-3 text-sm text-stone-600">This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget.id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
      {priceEditTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4">
          <form onSubmit={handlePriceEdit} className="w-full max-w-md space-y-5 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-xl">
            <div>
              <h3 className="text-xl font-semibold text-stone-900">Edit product pricing</h3>
              <p className="mt-2 text-sm text-stone-600">{priceEditTarget.name}</p>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Original price (NPR)</span>
              <input name="price" type="number" min="0.01" step="0.01" value={priceEditForm.price} onChange={handlePriceEditChange} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="flex items-center gap-3 text-sm text-stone-700">
              <input name="discountEnabled" type="checkbox" checked={priceEditForm.discountEnabled} onChange={handlePriceEditChange} />
              <span>Enable discount</span>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Discount (%)</span>
              <input name="discount" type="number" min="0" max="100" step="0.01" value={priceEditForm.discount} onChange={handlePriceEditChange} disabled={!priceEditForm.discountEnabled} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-60" />
            </label>
            <div className="rounded-3xl bg-stone-50 p-4 text-sm text-stone-700">
              Final price: <strong>NPR {Math.round((Number(priceEditForm.price) || 0) * (1 - (priceEditForm.discountEnabled ? Number(priceEditForm.discount) || 0 : 0) / 100)).toLocaleString()}</strong>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPriceEditTarget(null)} disabled={saving} className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save pricing'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default AdminProductsPage;

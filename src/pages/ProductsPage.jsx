import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ProductCard from '../components/ProductCard';
import SectionHeading from '../components/SectionHeading';
import { getCategories, getProducts } from '../services/api';
import StateCard from '../components/StateCard';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popularity');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([productsResponse, categoriesResponse]) => {
        setProducts(productsResponse.data || []);
        setCategories(categoriesResponse.data || []);
        setError('');
      })
      .catch((fetchError) => setError(fetchError.message || 'Could not load products'));
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (selectedCategory) {
      result = result.filter((product) => product.category === selectedCategory);
    }
    if (query) {
      const term = query.toLowerCase();
      result = result.filter((product) => product.name.toLowerCase().includes(term) || product.description.toLowerCase().includes(term));
    }
    if (sort === 'price') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'popularity') {
      result.sort((a, b) => b.popularity - a.popularity);
    } else if (sort === 'newest') {
      result.sort((a, b) => b.id.localeCompare(a.id));
    }
    return result;
  }, [products, query, selectedCategory, sort]);

  const handleCategorySelect = (categoryId) => {
    const nextCategory = selectedCategory === categoryId ? '' : categoryId;
    setSelectedCategory(nextCategory);
    if (nextCategory) {
      setSearchParams({ category: nextCategory });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Collections" title="Browse our products by category" description="Search by product name, price, or popularity and discover premium recycled pieces for homes, gifts, and custom projects." />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-4xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-stone-700">
            <SlidersHorizontal size={16} /> Filters
          </div>
          <div className="mt-6 space-y-2">
            <button onClick={() => handleCategorySelect('')} className={`w-full rounded-full px-4 py-2 text-left text-sm font-medium ${selectedCategory === '' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
              All Products
            </button>
            {categories.map((category) => (
              <button key={category.id} onClick={() => handleCategorySelect(category.id)} className={`w-full rounded-full px-4 py-2 text-left text-sm font-medium ${selectedCategory === category.id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>
                {category.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-4xl border border-stone-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="w-full rounded-full border border-stone-200 bg-stone-50 py-3 pl-12 pr-4 outline-none" />
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none">
              <option value="popularity">Sort by Popularity</option>
              <option value="price">Sort by Price</option>
              <option value="newest">Sort by Newest</option>
            </select>
          </div>

          <SectionHeading eyebrow="Products" title={selectedCategory ? categories.find((category) => category.id === selectedCategory)?.name || 'Selected category' : 'All available products'} description="Each product page includes images, dimensions, stock status, colors, and a simple add-to-cart experience." />

          {error ? <StateCard tone="error" title="Unable to load products" description={error} /> : null}
          <div className="grid gap-6 md:grid-cols-2">
            {!error && filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {!error && filteredProducts.length === 0 ? <StateCard title="No products found" description="Try another search term or clear the current filters." /> : null}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;

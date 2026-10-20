import { useEffect, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import { getBlogs } from '../services/api';
import StateCard from '../components/StateCard';

const BlogPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getBlogs(query)
      .then((response) => {
        setBlogs(response.data || []);
        setError('');
      })
      .catch((fetchError) => setError(fetchError.message || 'Could not load blogs'));
  }, [query]);

  return (
    <div className="space-y-10">
      <SectionHeading eyebrow="Blog" title="Latest stories and design insights" description="Learn more about how ReforgedX makes sustainable products with premium craftsmanship." />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-stone-600">Browse our latest posts on materials, design, and sustainable manufacturing.</p>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search blog" className="rounded-full border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {error ? <StateCard tone="error" title="Unable to load blog posts" description={error} /> : null}
        {!error && blogs.length === 0 ? <StateCard title="No blog posts yet" description="New stories and design notes will appear here soon." /> : null}
        {!error && blogs.map((blog) => (
          <article key={blog.id} className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-700">{blog.category}</p>
            <h2 className="mt-4 text-2xl font-semibold text-stone-900">{blog.title}</h2>
            <p className="mt-4 text-stone-600">{blog.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default BlogPage;

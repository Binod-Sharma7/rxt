/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { deleteAdminReview, getAdminReviews, updateAdminReview } from '../services/api';
import { useToast } from '../components/ToastProvider';
import StateCard from '../components/StateCard';

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const token = localStorage.getItem('reforgedx-token');
  const { addToast } = useToast();

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await getAdminReviews(token, { q: search, status: statusFilter });
      setReviews(response.data || []);
    } catch (error) {
      addToast(error.message || 'Could not load reviews', 'error');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filteredReviews = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const matchesSearch = !term || review.title?.toLowerCase().includes(term) || review.description?.toLowerCase().includes(term) || review.customerName?.toLowerCase().includes(term) || review.productName?.toLowerCase().includes(term);
      const matchesStatus = !statusFilter || review.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reviews, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const visibleReviews = filteredReviews.slice((page - 1) * pageSize, page * pageSize);

  const handleStatusChange = async (reviewId, status) => {
    try {
      await updateAdminReview(reviewId, { status }, token);
      setReviews((current) => current.map((review) => (review.id === reviewId ? { ...review, status } : review)));
      window.dispatchEvent(new Event('reviews:updated'));
      addToast('Review status updated', 'success');
    } catch (error) {
      addToast(error.message || 'Could not update review', 'error');
    }
  };

  const handleDelete = async (reviewId) => {
    try {
      await deleteAdminReview(reviewId, token);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      window.dispatchEvent(new Event('reviews:updated'));
      addToast('Review deleted', 'success');
    } catch (error) {
      addToast(error.message || 'Could not delete review', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-900">Reviews</h1>
        <p className="mt-3 text-stone-600">Moderate customer reviews and approve or remove content.</p>
      </div>
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews" className="w-full rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none md:max-w-sm" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="mt-6 space-y-4">
          {loading ? <p className="text-sm text-stone-600">Loading reviews...</p> : visibleReviews.map((review) => (
            <div key={review.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">{review.title || 'Untitled review'}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${review.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : review.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{review.status || 'Pending'}</span>
                  </div>
                  <p className="text-sm text-stone-600">{review.description || 'No description provided.'}</p>
                  <p className="text-sm text-stone-500">By {review.customerName || 'Unknown'} • Product {review.productName || review.productId || '—'} • Rating {review.rating || 0}/5</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleStatusChange(review.id, 'Approved')} className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Approve</button>
                  <button type="button" onClick={() => handleStatusChange(review.id, 'Rejected')} className="rounded-full bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Reject</button>
                  <button type="button" onClick={() => handleDelete(review.id)} className="rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!loading && filteredReviews.length === 0 ? <StateCard title="No reviews found" description="Try adjusting the search or filters." tone="default" /> : null}
        </div>
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
    </div>
  );
};

export default AdminReviewsPage;

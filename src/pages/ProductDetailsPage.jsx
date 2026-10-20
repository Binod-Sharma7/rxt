import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Tag } from 'lucide-react';
import { createReview, getFavourites, getOrders, getProductById, getProductReviews, toggleFavourite } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { formatCurrency, getDiscountAmount, getFinalPrice } from '../services/pricing';
import StateCard from '../components/StateCard';

const ProductDetailsPage = () => {
  const { id, productId } = useParams();
  const resolvedProductId = productId || id;
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState('');
  const [saved, setSaved] = useState(false);
  const [reviewsData, setReviewsData] = useState({ reviews: [], averageRating: 0, totalReviews: 0 });
  const [myOrders, setMyOrders] = useState([]);
  const [reviewForm, setReviewForm] = useState({ orderId: '', rating: 5, title: '', description: '' });
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const token = localStorage.getItem('reforgedx-token');

  const eligibleDeliveredOrders = useMemo(() => myOrders.filter((order) => order.status === 'Delivered' && order.items?.some((item) => item.id === resolvedProductId)), [myOrders, resolvedProductId]);

  const refreshReviews = () => {
    if (!resolvedProductId) return;
    getProductReviews(resolvedProductId).then((response) => setReviewsData(response.data || { reviews: [], averageRating: 0, totalReviews: 0 }));
  };

  useEffect(() => {
    if (!resolvedProductId) return;
    getProductById(resolvedProductId).then((response) => {
      setProduct(response.data);
      setActiveImage(response.data.images?.[0] || '');
    });
    refreshReviews();
  }, [resolvedProductId]);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    getFavourites(token).then((response) => {
      const ids = response.data?.favourites || [];
      setSaved(ids.includes(resolvedProductId));
    }).catch(() => setSaved(false));

    getOrders(token).then((response) => {
      const data = response.data || [];
      setMyOrders(data);
      const firstEligible = data.find((order) => order.status === 'Delivered' && order.items?.some((item) => item.id === resolvedProductId));
      if (firstEligible) {
        setReviewForm((current) => ({ ...current, orderId: firstEligible.id }));
      }
    }).catch(() => setMyOrders([]));
  }, [token, user, resolvedProductId]);

  if (!product) {
    return <p className="text-stone-600">Loading product details...</p>;
  }

  const handleSaveToggle = async () => {
    if (!user || user.role === 'admin') {
      addToast('Please login as a customer to save favourites', 'error');
      return;
    }

    try {
      const response = await toggleFavourite(product.id, token);
      const nowSaved = Boolean(response.data?.saved);
      setSaved(nowSaved);
      addToast(nowSaved ? 'Saved to favourites' : 'Removed from favourites', 'success');
    } catch (error) {
      addToast(error.message || 'Could not update favourites', 'error');
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!reviewForm.orderId) {
      addToast('Select a delivered order to review this product', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('productId', product.id);
    formData.append('orderId', reviewForm.orderId);
    formData.append('rating', String(reviewForm.rating));
    formData.append('title', reviewForm.title);
    formData.append('description', reviewForm.description);
    reviewImages.forEach((file) => formData.append('reviewImages', file));

    setReviewSubmitting(true);
    try {
      await createReview(formData, token);
      addToast('Review submitted for approval', 'success');
      setReviewForm((current) => ({ ...current, title: '', description: '' }));
      setReviewImages([]);
      refreshReviews();
    } catch (error) {
      addToast(error.message || 'Could not submit review', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const canReview = user?.role === 'customer' && eligibleDeliveredOrders.length > 0;
  const isOutOfStock = (product.stock || 0) <= 0;

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-4xl border border-stone-200 bg-white p-6 shadow-sm">
          <img src={activeImage} alt={product.name} className="h-[520px] w-full rounded-3xl object-cover" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {product.images.map((image) => (
              <button key={image} type="button" onClick={() => setActiveImage(image)} className="overflow-hidden rounded-3xl border border-stone-200">
                <img src={image} alt="Product" className="h-24 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">{product.category}</p>
              <h1 className="mt-3 text-3xl font-semibold text-stone-900">{product.name}</h1>
            </div>
            <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">{product.stock > 0 ? 'In stock' : 'Out of stock'}</div>
          </div>

          <div className="grid gap-3 rounded-3xl bg-stone-50 p-5">
            <div className="flex items-center gap-3">
              <p className="text-3xl font-semibold text-stone-900">{formatCurrency(getFinalPrice(product.price, product.discount))}</p>
              {product.discount ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">-{product.discount}%</span> : null}
            </div>
            {product.discount ? <p className="text-sm text-stone-500 line-through">{formatCurrency(product.price)}</p> : null}
            {product.discount ? <p className="text-sm text-stone-600">Save {formatCurrency(getDiscountAmount(product.price, product.discount))} today</p> : null}
            <p className="text-sm text-stone-600">Dimensions: {product.dimensions}</p>
            <p className="text-sm text-stone-600">Available colors: {product.colors.join(', ')}</p>
          </div>

          <p className="text-stone-600">{product.description}</p>

          {user?.role !== 'admin' ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => addToCart(product)}
                disabled={isOutOfStock}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 ${isOutOfStock ? 'cursor-not-allowed bg-stone-300 text-stone-600' : 'cursor-pointer bg-stone-900 text-white hover:-translate-y-0.5 hover:bg-stone-700 active:scale-[0.98]'}`}
              >
                Add to cart <ShoppingBag size={18} />
              </button>
              <button type="button" onClick={handleSaveToggle} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 ${saved ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-300 text-stone-700 hover:bg-stone-100'}`}>
                {saved ? 'Remove from favourites' : 'Save for later'} <Heart size={18} />
              </button>
            </div>
          ) : null}

          <div className="grid gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700"><Tag size={16} /> Popularity: {product.popularity}</div>
            <div className="text-sm text-stone-600">Average rating: {reviewsData.averageRating} / 5 ({reviewsData.totalReviews} reviews)</div>
          </div>
        </div>
      </div>

      <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-stone-900">Customer Reviews</h2>
        <div className="mt-6 space-y-4">
          {reviewsData.reviews.length === 0 ? <StateCard title="No approved reviews yet" description="Reviews will appear once approved by the admin team." /> : null}
          {reviewsData.reviews.map((review) => (
            <article key={review.id || review._id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-center gap-3">
                {review.customerProfileImage ? <img src={review.customerProfileImage} alt={review.customerName || 'Customer'} className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700">{(review.customerName || 'RX').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>}
                <div>
                  <p className="font-semibold text-stone-900">{review.customerName || 'Customer'}</p>
                  <p className="text-xs text-stone-500">{review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={16} fill={index < Number(review.rating || 0) ? 'currentColor' : 'none'} />)}
              </div>
              {review.title ? <p className="mt-3 font-medium text-stone-900">{review.title}</p> : null}
              <p className="mt-2 text-sm text-stone-700">{review.description}</p>
              {review.images?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.images.map((image) => <img key={image} src={image} alt="Review upload" className="h-20 w-20 rounded-2xl object-cover" />)}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {canReview ? (
        <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-stone-900">Write a review</h3>
          <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-stone-700">
                <span>Delivered order</span>
                <select value={reviewForm.orderId} onChange={(event) => setReviewForm((current) => ({ ...current, orderId: event.target.value }))} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none">
                  {eligibleDeliveredOrders.map((order) => <option key={order.id} value={order.id}>{order.id}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-stone-700">
                <span>Rating</span>
                <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none">
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} Star{value > 1 ? 's' : ''}</option>)}
                </select>
              </label>
            </div>
            <label className="space-y-2 text-sm text-stone-700">
              <span>Review title</span>
              <input value={reviewForm.title} onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-stone-700">
              <span>Review description</span>
              <textarea rows={4} value={reviewForm.description} onChange={(event) => setReviewForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="space-y-2 text-sm text-stone-700">
              <span>Upload images (optional)</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setReviewImages(Array.from(event.target.files || []))} className="w-full text-sm" />
            </label>
            <button type="submit" disabled={reviewSubmitting} className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{reviewSubmitting ? 'Submitting...' : 'Submit review'}</button>
          </form>
        </section>
      ) : null}

      {user?.role === 'customer' && !canReview ? <StateCard title="Review unavailable" description="You can review this product after a delivered order." /> : null}
    </div>
  );
};

export default ProductDetailsPage;

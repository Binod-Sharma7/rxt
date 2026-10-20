/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { deletePurchaseHistory, getCustomOrders, getFavourites, getOrders, toggleFavourite } from '../services/api';
import { formatCurrency, getFinalPrice } from '../services/pricing';
import { useToast } from '../components/ToastProvider';
import StateCard from '../components/StateCard';

const sections = ['Dashboard', 'Profile', 'Purchase History', 'Favourite Products', 'Order Tracking', 'Settings'];
const timelineStatuses = ['Pending', 'Accepted', 'Printing', 'Packaging', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Cancelled'];

const paymentTone = (status = '') => {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Cash On Delivery Pending') return 'bg-amber-100 text-amber-700';
  if (status === 'Rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-stone-100 text-stone-700';
};

const orderTimestamp = (order) => {
  const value = order.orderDate || order.createdAt || order.updatedAt;
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const statusStep = (status) => {
  const idx = timelineStatuses.indexOf(status);
  return idx === -1 ? 0 : idx;
};

const DashboardPage = () => {
  const { user, logout, updateProfile, updateProfileImage, removeProfileImage } = useAuth();
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const orderRefs = useRef({});

  const [activeSection, setActiveSection] = useState('Dashboard');
  const [orders, setOrders] = useState([]);
  const [favouriteProducts, setFavouriteProducts] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [deletingHistory, setDeletingHistory] = useState(false);

  const token = localStorage.getItem('reforgedx-token');

  const fetchOrders = () => {
    if (!user) return;
    setOrdersLoading(true);
    Promise.allSettled([getOrders(token), getCustomOrders(token)]).then(([ordersResult, customOrdersResult]) => {
      const normalOrders = ordersResult.status === 'fulfilled' ? ordersResult.value.data || [] : [];
      const customOrders = customOrdersResult.status === 'fulfilled' ? customOrdersResult.value.data || [] : [];
      if (ordersResult.status === 'rejected' && customOrdersResult.status === 'rejected') {
        setError(ordersResult.reason?.message || customOrdersResult.reason?.message || 'Could not load your orders');
        setOrders([]);
        return;
      }
      setOrders([...(normalOrders || []), ...(customOrders || [])].sort((left, right) => orderTimestamp(right) - orderTimestamp(left)));
      setError('');
    }).finally(() => setOrdersLoading(false));
  };

  const fetchFavourites = () => {
    if (!user) return;
    getFavourites(token)
      .then((response) => setFavouriteProducts(response.data?.products || []))
      .catch(() => setFavouriteProducts([]));
  };

  useEffect(() => {
    fetchOrders();
    fetchFavourites();
    const handleRefresh = () => fetchOrders();
    window.addEventListener('orders:updated', handleRefresh);
    return () => window.removeEventListener('orders:updated', handleRefresh);
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedSection = params.get('section');
    if (requestedSection && sections.includes(requestedSection)) setActiveSection(requestedSection);
    const requestedOrderId = params.get('orderId');
    if (requestedOrderId) {
      setSelectedOrderId(requestedOrderId);
      setActiveSection('Order Tracking');
    }
  }, [location.search]);

  const normalizedOrders = useMemo(() => orders.map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const originalSubtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const finalSubtotal = items.reduce((sum, item) => sum + getFinalPrice(item.price, item.discount) * Number(item.quantity || 0), 0);
    const discountAmount = Math.max(0, originalSubtotal - finalSubtotal);
    const discountPercentage = originalSubtotal ? Math.round((discountAmount / originalSubtotal) * 100) : Number(order.discount || 0);
    const resolvedStatus = order.paymentMethod === 'Cash On Delivery'
      ? (order.status === 'Delivered' ? 'Completed' : 'Cash On Delivery Pending')
      : (order.paymentStatus || 'Pending');
    const resolvedAmountPaid = resolvedStatus === 'Completed' ? Number(order.total || finalSubtotal || 0) : Number(order.amountPaid || 0);
    const resolvedRemainingAmount = resolvedStatus === 'Completed' ? 0 : Number(order.remainingAmount ?? Math.max(0, Number(order.total || finalSubtotal || 0) - resolvedAmountPaid));
    const orderType = order.orderType || (order.imageFile || order.stlFile ? 'Custom Order' : 'Standard Order');
    return {
      ...order,
      orderType,
      isCustomOrder: orderType === 'Custom Order',
      originalSubtotal,
      finalSubtotal: Number(order.total || finalSubtotal || 0),
      discountAmount,
      discountPercentage,
      resolvedPaymentStatus: resolvedStatus,
      resolvedAmountPaid,
      resolvedRemainingAmount,
      displayEstimatedDelivery: order.estimatedDelivery || '3-5 business days',
      displayOrderDate: orderTimestamp(order)
    };
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return normalizedOrders.filter((order) => {
      if (!term) return true;
      return [
        order.id,
        order.status,
        order.resolvedPaymentStatus,
        order.orderType,
        order.selectedColor,
        ...(order.items || []).map((i) => i.name)
      ].some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [normalizedOrders, search]);

  const totalSpent = useMemo(() => normalizedOrders.reduce((sum, order) => sum + Number(order.resolvedAmountPaid || 0), 0), [normalizedOrders]);
  const selectedOrder = useMemo(() => normalizedOrders.find((order) => order.id === selectedOrderId) || null, [normalizedOrders, selectedOrderId]);
  const recentOrders = filteredOrders.slice(0, 5);
  const olderOrders = filteredOrders.slice(5);
  const visibleOlderIds = olderOrders.map((order) => order.id);
  const allOlderSelected = visibleOlderIds.length > 0 && visibleOlderIds.every((id) => selectedHistoryIds.includes(id));

  const historyMoney = (value) => Number.isFinite(Number(value)) ? formatCurrency(Number(value)) : '—';
  const historyLineItems = (order) => (order.items || []).map((item) => {
    const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : null;
    const unitPrice = Number.isFinite(Number(item.price)) ? Number(item.price) : null;
    const hasDiscount = item.discount !== undefined && item.discount !== null && Number.isFinite(Number(item.discount));
    const discount = hasDiscount ? Number(item.discount) : null;
    const lineTotal = unitPrice === null || quantity === null || discount === null ? null : getFinalPrice(unitPrice, discount) * quantity;
    return { name: item.name || 'Unnamed product', quantity, unitPrice, lineTotal };
  });

  const handleDeleteHistory = async (ids) => {
    if (deletingHistory || ids.length === 0) return;
    const message = ids.length === 1
      ? 'Hide this purchase from your history? The order and its records will be preserved.'
      : `Hide these ${ids.length} purchases from your history? The orders and their records will be preserved.`;
    if (!window.confirm(message)) return;
    setDeletingHistory(true);
    try {
      const response = await deletePurchaseHistory(ids, token);
      const archivedIds = response.data?.archivedIds || [];
      const failedIds = response.data?.failedIds || [];
      setSelectedHistoryIds((current) => current.filter((id) => !archivedIds.includes(id)));
      if (failedIds.length > 0) {
        addToast(`${archivedIds.length} purchase(s) hidden; ${failedIds.length} could not be updated.`, 'error');
      } else {
        addToast(`${archivedIds.length} purchase${archivedIds.length === 1 ? '' : 's'} hidden from your history.`, 'success');
      }
      fetchOrders();
    } catch (deleteError) {
      addToast(deleteError.message || 'Could not update purchase history', 'error');
    } finally {
      setDeletingHistory(false);
    }
  };

  const toggleHistorySelection = (orderId) => {
    setSelectedHistoryIds((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
  };

  const toggleSelectAllHistory = () => {
    setSelectedHistoryIds((current) => allOlderSelected
      ? current.filter((id) => !visibleOlderIds.includes(id))
      : [...new Set([...current, ...visibleOlderIds])]);
  };

  useEffect(() => {
    if (activeSection !== 'Order Tracking' || !selectedOrderId) return;
    const node = orderRefs.current[selectedOrderId];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeSection, selectedOrderId, filteredOrders]);

  const handleTrackOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setActiveSection('Order Tracking');
    navigate(`/dashboard?section=Order%20Tracking&orderId=${encodeURIComponent(orderId)}`);
  };

  const handleProfileFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('Only jpg, jpeg, png, and webp are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Profile image must be less than 5MB', 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      await updateProfileImage(file);
      addToast('Profile image updated', 'success');
    } catch (uploadError) {
      addToast(uploadError.message || 'Could not upload profile image', 'error');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await removeProfileImage();
      addToast('Profile image removed', 'success');
    } catch (removeError) {
      addToast(removeError.message || 'Could not remove profile image', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ phone: profilePhone, address: profileAddress });
      addToast('Contact details updated', 'success');
    } catch (profileError) {
      addToast(profileError.message || 'Could not update contact details', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveFavourite = async (productId) => {
    try {
      await toggleFavourite(productId, token);
      setFavouriteProducts((current) => current.filter((product) => product.id !== productId));
      addToast('Removed from favourites', 'success');
    } catch (toggleError) {
      addToast(toggleError.message || 'Could not update favourites', 'error');
    }
  };

  // Stepped progress bar for order tracking
  const renderProgressBar = (order) => {
    const isCancelled = order.status === 'Cancelled';
    const activeStatuses = timelineStatuses.filter((s) => s !== 'Cancelled');
    const currentStep = isCancelled ? -1 : activeStatuses.indexOf(order.status);

    if (isCancelled) {
      return (
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Order Cancelled</span>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <div className="flex items-center gap-0">
          {activeStatuses.map((status, idx) => {
            const done = idx < currentStep;
            const active = idx === currentStep;
            return (
              <div key={status} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${active ? 'border-stone-900 bg-stone-900 text-white' : done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300 bg-white text-stone-400'}`}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span className={`mt-1 hidden text-center text-[9px] font-medium leading-tight sm:block ${active ? 'text-stone-900' : done ? 'text-emerald-600' : 'text-stone-400'}`} style={{ maxWidth: 56 }}>
                    {status}
                  </span>
                </div>
                {idx < activeStatuses.length - 1 && (
                  <div className={`mb-4 h-0.5 flex-1 ${done || active ? 'bg-stone-900' : 'bg-stone-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProductDetails = (order) => {
    const rows = [
      ['Order Type', order.orderType],
      ['Selected Color', order.selectedColor || order.items?.[0]?.selectedColor || order.items?.[0]?.color || '—'],
      ['Quantity', String(order.quantity || order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || '—')],
      ['Customer Description', order.description || order.notes || '—'],
      ['Current Order Status', order.status || 'Pending'],
      ['Order Date', order.displayOrderDate.toLocaleDateString()],
      ['Estimated Delivery', order.displayEstimatedDelivery]
    ];

    // Items listed at top
    const itemChips = !order.isCustomOrder && order.items?.length
      ? order.items.map((item, index) => (
          <span key={`${order.id}-item-${index}`} className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
            {item.name} × {item.quantity}
          </span>
        ))
      : null;

    return (
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm font-semibold text-stone-900">Product Details</p>

        {/* Items at the top */}
        {itemChips && (
          <div className="mt-3 flex flex-wrap gap-2">
            {itemChips}
          </div>
        )}

        {order.isCustomOrder && (
          <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-3 text-sm text-stone-700">
            <p className="font-semibold text-stone-900">Uploaded Files</p>
            <p className="mt-1">Image: {order.imageFileName || (order.imageFile ? 'Available' : 'Not uploaded')}</p>
            <p>STL: {order.stlFileName || (order.stlFile ? 'Available' : 'Not uploaded')}</p>
          </div>
        )}

        {/* Flat label-value rows */}
        <dl className="mt-3 divide-y divide-stone-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-xs uppercase tracking-[0.18em] text-stone-500 shrink-0">{label}</dt>
              <dd className="text-right text-sm font-medium text-stone-900">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const renderOrderCard = (order) => {
    const isSelected = selectedOrderId === order.id;

    const priceBreakdown = !order.isCustomOrder ? (
      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-stone-200 bg-white p-4 sm:grid-cols-4">
        {[
          ['Original Price', formatCurrency(order.originalSubtotal)],
          ['Discount', `${order.discountPercentage || 0}%`],
          ['Saved', formatCurrency(order.discountAmount || 0)],
          ['Final Price', formatCurrency(order.finalSubtotal || 0)]
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{value}</p>
          </div>
        ))}
      </div>
    ) : null;

    return (
      <article
        key={order.id}
        ref={(node) => { if (node) orderRefs.current[order.id] = node; }}
        className={`rounded-4xl border bg-white p-5 shadow-sm transition ${isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-stone-200'}`}
      >
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">{order.orderType}</span>
          <span className="text-sm text-stone-500">#{order.id}</span>
          <span className={`ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : order.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-700'}`}>
            {order.status || 'Pending'}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            {renderProductDetails(order)}
            {priceBreakdown}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
              {order.paymentMethod === 'Cash On Delivery' ? (
                <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] bg-amber-100 text-amber-700">Payment: Cash On Delivery</span>
              ) : (
                <>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${paymentTone(order.resolvedPaymentStatus)}`}>{order.resolvedPaymentStatus}</span>
                  <span>via {order.paymentMethod}</span>
                  <span>Paid: {formatCurrency(order.resolvedAmountPaid || 0)}</span>
                  {order.resolvedRemainingAmount > 0 && <span>Due: {formatCurrency(order.resolvedRemainingAmount)}</span>}
                </>
              )}
            </div>

            <p className="text-xs text-stone-400">Ordered {order.displayOrderDate.toLocaleDateString()} · Est. {order.displayEstimatedDelivery}</p>
          </div>

          {/* Right column: timeline + actions */}
          <div className="space-y-4">
            <div className="mt-2 flex flex-wrap gap-2">
              {timelineStatuses.map((status) => {
                const active = order.status === status;
                const done = statusStep(status) < statusStep(order.status) && order.status !== 'Cancelled';
                const cancelled = order.status === 'Cancelled';
                const cls = cancelled && status !== 'Cancelled'
                  ? 'border-stone-200 bg-stone-100 text-stone-400'
                  : active
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 bg-white text-stone-500';
                return (
                  <span key={status} className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{status}</span>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {order.status === 'Delivered' && !order.isCustomOrder && order.items?.[0]?.id ? (
                <button type="button" onClick={() => navigate(`/products/${order.items[0].id}`)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100">
                  Review Product
                </button>
              ) : null}
              <button type="button" onClick={() => handleTrackOrder(order.id)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100">
                Track Order
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  // Minimal order tracking card
  const renderTrackingCard = (order) => {
    const isSelected = selectedOrderId === order.id;
    const productNames = order.isCustomOrder
      ? (order.imageFileName || order.stlFileName || 'Custom Order')
      : (order.items || []).map((i) => `${i.name} ×${i.quantity}`).join(', ') || '—';

    return (
      <div
        key={order.id}
        ref={(node) => { if (node) orderRefs.current[order.id] = node; }}
        className={`rounded-3xl border bg-white p-5 shadow-sm transition ${isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-stone-200'}`}
      >
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500 mb-1">Order #{order.id}</p>
            <p className="font-semibold text-stone-900 text-sm">{productNames}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : order.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-700'}`}>
              {order.status || 'Pending'}
            </span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentTone(order.resolvedPaymentStatus)}`}>
              {order.resolvedPaymentStatus}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {renderProgressBar(order)}

        {/* Footer meta */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            <span>Ordered {order.displayOrderDate.toLocaleDateString()}</span>
            <span>Est. {order.displayEstimatedDelivery}</span>
            <span>Total: {formatCurrency(order.finalSubtotal || 0)}</span>
          </div>
          <div className="flex gap-2">
            {order.status === 'Delivered' && !order.isCustomOrder && order.items?.[0]?.id ? (
              <button type="button" onClick={() => navigate(`/products/${order.items[0].id}`)} className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700">
                Review
              </button>
            ) : null}
            <button type="button" onClick={() => { setSelectedOrderId(order.id); navigate(`/dashboard?section=Order%20Tracking&orderId=${encodeURIComponent(order.id)}`); }} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100">
              {isSelected ? 'Selected' : 'Focus'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboardOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        {[
          ['Total orders', normalizedOrders.length],
          ['Total paid', formatCurrency(totalSpent)],
          ['Favourites', favouriteProducts.length]
        ].map(([label, value]) => (
          <div key={label} className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{label}</p>
            <p className="mt-4 text-3xl font-semibold text-stone-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Quick account snapshot</h2>
        <p className="mt-3 text-stone-600">Use the dashboard menu to manage profile, favourites, purchases, and tracking updates.</p>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-stone-900">Profile</h2>
      <div className="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {user?.profileImage ? (
          <img src={user.profileImage} alt="Customer avatar" className="h-24 w-24 rounded-full border border-stone-200 object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-2xl font-semibold text-stone-700">
            {(user?.name || 'RX').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
          </div>
        )}
        <div className="space-y-3">
          <p className="text-sm text-stone-600">Upload jpg, jpeg, png, or webp up to 5MB.</p>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white">
              {uploadingAvatar ? 'Uploading...' : 'Upload picture'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfileFile} className="hidden" disabled={uploadingAvatar} />
            </label>
            <button type="button" onClick={handleRemoveAvatar} disabled={uploadingAvatar || !user?.profileImage} className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50">
              Remove picture
            </button>
          </div>
        </div>
      </div>
      <form onSubmit={handleProfileSave} className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-stone-700">Phone number</span>
          <input value={profilePhone} onChange={(event) => setProfilePhone(event.target.value.replace(/\D/g, ''))} inputMode="numeric" required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-stone-700">Address</span>
          <input value={profileAddress} onChange={(event) => setProfileAddress(event.target.value)} maxLength={200} required className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
        </label>
        <button type="submit" disabled={savingProfile} className="w-fit rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {savingProfile ? 'Saving...' : 'Save contact details'}
        </button>
      </form>
      <dl className="mt-8 divide-y divide-stone-100">
        {[['Name', user?.name], ['Email', user?.email]].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-xs uppercase tracking-[0.2em] text-stone-500">{label}</dt>
            <dd className="text-sm font-medium text-stone-900">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const renderPurchaseHistory = () => (
    <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold text-stone-900">Purchase History</h2>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" className="w-full rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none md:max-w-xs" />
      </div>
      <div className="mt-6 space-y-4">
        {error ? <StateCard tone="error" title="Unable to load orders" description={error} /> : null}
        {ordersLoading ? <p className="text-sm text-stone-600">Loading purchase history...</p> : null}
        {!ordersLoading && !error && filteredOrders.length === 0 ? <StateCard title="No orders yet" description="Your orders will appear here after checkout." /> : null}
        {!ordersLoading && !error && recentOrders.length > 0 ? (
          <>
            <h3 className="pt-2 text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">Recent Orders</h3>
            {recentOrders.map((order) => renderOrderCard(order))}
          </>
        ) : null}
        {!ordersLoading && !error && olderOrders.length > 0 ? (
          <section className="pt-4">
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-500">Older Purchase History</h3>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" checked={allOlderSelected} onChange={toggleSelectAllHistory} disabled={deletingHistory} />
                  Select All
                </label>
                <button type="button" onClick={() => handleDeleteHistory(selectedHistoryIds.filter((id) => visibleOlderIds.includes(id)))} disabled={deletingHistory || selectedHistoryIds.filter((id) => visibleOlderIds.includes(id)).length === 0} className="rounded-full border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {deletingHistory ? 'Updating...' : `Delete Selected (${selectedHistoryIds.filter((id) => visibleOlderIds.includes(id)).length})`}
                </button>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {olderOrders.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 text-sm text-stone-700">
                  <input type="checkbox" checked={selectedHistoryIds.includes(order.id)} onChange={() => toggleHistorySelection(order.id)} disabled={deletingHistory} aria-label={`Select order ${order.id}`} />
                  <span className="text-stone-500">{order.displayOrderDate.toLocaleDateString('en-CA')}</span>
                  <span className="min-w-0 flex-1">
                    {historyLineItems(order).length > 0
                      ? historyLineItems(order).map((item, index) => <span key={`${order.id}-${index}`} className="mr-3 inline-block">{item.name} × {item.quantity ?? '—'} @ {historyMoney(item.unitPrice)} — {historyMoney(item.lineTotal)}</span>)
                      : 'Order details unavailable'}
                  </span>
                  <button type="button" onClick={() => handleDeleteHistory([order.id])} disabled={deletingHistory} className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50">Delete</button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );

  const renderFavourites = () => (
    <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-stone-900">Favourite Products</h2>
      <div className="mt-6 space-y-4">
        {favouriteProducts.length === 0 ? <StateCard title="No favourites saved" description="Save products for later from a product details page." /> : null}
        {favouriteProducts.map((product) => (
          <div key={product.id} className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center">
            <img src={product.images?.[0]} alt={product.name} className="h-20 w-20 rounded-2xl object-cover" />
            <div className="flex-1">
              <p className="font-semibold text-stone-900">{product.name}</p>
              <p className="text-sm text-stone-600">Price: {formatCurrency(getFinalPrice(product.price, product.discount))}</p>
              <p className="text-sm text-stone-600">Discount: {product.discount || 0}%</p>
              <p className="text-sm text-stone-600">Stock: {product.stock || 0}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addToCart(product)} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Move To Cart</button>
              <button type="button" onClick={() => handleRemoveFavourite(product.id)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Remove</button>
              <button type="button" onClick={() => navigate(`/products/${product.id}`)} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOrderTracking = () => (
    <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-stone-900">Order Tracking</h2>
      <p className="mt-1 text-stone-500 text-sm">Live status updates for your orders.</p>

      {/* Highlighted selected order summary */}
      {selectedOrder ? (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-600 mb-3">Tracking</p>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <span className="font-semibold text-stone-900 text-sm">
              {selectedOrder.isCustomOrder
                ? (selectedOrder.imageFileName || selectedOrder.stlFileName || 'Custom Order')
                : (selectedOrder.items || []).map((i) => `${i.name} ×${i.quantity}`).join(', ') || '—'}
            </span>
            <span className="text-xs text-stone-500">#{selectedOrder.id}</span>
          </div>
          <p className="text-sm text-stone-600 mb-3">Status: <span className="font-semibold text-stone-900">{selectedOrder.status || 'Pending'}</span></p>
          {renderProgressBar(selectedOrder)}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {filteredOrders.length === 0 ? <StateCard title="No trackable orders" description="Place an order to view tracking updates here." /> : null}
        {filteredOrders.map((order) => renderTrackingCard(order))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-stone-900">Settings</h2>
      <p className="mt-3 text-stone-600">More account settings will be available soon.</p>
      <button type="button" onClick={logout} className="mt-6 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700">Logout</button>
    </div>
  );

  const sectionView = {
    Dashboard: renderDashboardOverview(),
    Profile: renderProfile(),
    'Purchase History': renderPurchaseHistory(),
    'Favourite Products': renderFavourites(),
    'Order Tracking': renderOrderTracking(),
    Settings: renderSettings()
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-4xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700">Customer Menu</p>
        <div className="mt-6 space-y-2">
          {sections.map((section) => (
            <button key={section} type="button" onClick={() => setActiveSection(section)} className={`w-full rounded-3xl px-4 py-3 text-left text-sm font-medium ${activeSection === section ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
              {section}
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-6">
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-stone-900">Dashboard</h1>
          <p className="mt-3 text-stone-600">Welcome back, {user?.name}. Manage your profile, favourites, and orders in one place.</p>
        </div>
        {sectionView[activeSection]}
      </section>
    </div>
  );
};

export default DashboardPage;

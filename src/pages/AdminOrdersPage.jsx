/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';
import { apiOrigin, changeCustomOrderStatus, changeOrderStatus, deleteCustomOrder, deleteOrder, getCustomOrders, getOrders, updateOrderPaymentStatus } from '../services/api';
import { useToast } from '../components/ToastProvider';
import StateCard from '../components/StateCard';

const statuses = ['Pending', 'Accepted', 'Printing', 'Packaging', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Cancelled'];
const statusStyles = {
  Pending: 'bg-amber-100 text-amber-800',
  Accepted: 'bg-sky-100 text-sky-800',
  Printing: 'bg-violet-100 text-violet-800',
  Packaging: 'bg-stone-100 text-stone-800',
  'Ready for Delivery': 'bg-indigo-100 text-indigo-800',
  'Out for Delivery': 'bg-cyan-100 text-cyan-800',
  Delivered: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-rose-100 text-rose-800'
};

const orderTimestamp = (order) => {
  const value = order.orderDate || order.createdAt || order.updatedAt;
  const date = value ? new Date(value) : new Date(0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const pageSize = 4;
  const token = localStorage.getItem('reforgedx-token');
  const { addToast } = useToast();

  const refreshOrders = () => {
    setLoading(true);
    Promise.allSettled([getOrders(token), getCustomOrders(token)]).then(([ordersResult, customOrdersResult]) => {
      const normalOrders = ordersResult.status === 'fulfilled' ? ordersResult.value.data || [] : [];
      const customOrders = customOrdersResult.status === 'fulfilled' ? customOrdersResult.value.data || [] : [];
      if (ordersResult.status === 'rejected' && customOrdersResult.status === 'rejected') {
        setOrders([]);
        return;
      }
      setOrders([...(normalOrders || []), ...(customOrders || [])].sort((left, right) => orderTimestamp(right) - orderTimestamp(left)));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { refreshOrders(); }, [token]);

  useEffect(() => () => {
    if (previewFile?.objectUrl) URL.revokeObjectURL(previewFile.objectUrl);
  }, [previewFile]);

  const normalizedOrders = useMemo(() => orders.map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const originalSubtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const finalSubtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0) * (1 - Number(item.discount || 0) / 100), 0);
    const orderType = order.orderType || (order.imageFile || order.stlFile ? 'Custom Order' : 'Standard Order');
    const paymentStatus = order.paymentMethod === 'Cash On Delivery'
      ? (order.status === 'Delivered' ? 'Completed' : 'Cash On Delivery Pending')
      : (order.paymentStatus || 'Pending');

    return {
      ...order,
      orderType,
      isCustomOrder: orderType === 'Custom Order',
      originalSubtotal,
      finalSubtotal: Number(order.total || finalSubtotal || 0),
      displayCustomerName: order.customerName || order.name || order.customer?.name || 'Unknown',
      displayPhone: order.phone || order.customer?.phone || '—',
      displayEmail: order.email || order.customer?.email || '—',
      displayAddress: order.address || order.customer?.address || '—',
      displaySelectedColor: order.selectedColor || order.items?.[0]?.selectedColor || order.items?.[0]?.color || '—',
      displayQuantity: String(order.quantity || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || '—'),
      displayDescription: order.description || order.notes || '—',
      displayEstimatedDelivery: order.estimatedDelivery || '3-5 business days',
      displayOrderDate: orderTimestamp(order),
      paymentStatus,
      amountPaid: paymentStatus === 'Completed' ? Number(order.total || finalSubtotal || 0) : Number(order.amountPaid || 0),
      remainingAmount: paymentStatus === 'Completed' ? 0 : Number(order.remainingAmount ?? Math.max(0, Number(order.total || finalSubtotal || 0) - Number(order.amountPaid || 0)))
    };
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return normalizedOrders.filter((order) => {
      const matchesSearch = !term || [
        order.id,
        order.displayCustomerName,
        order.displayPhone,
        order.displayEmail,
        order.displayAddress,
        order.displaySelectedColor,
        order.orderType
      ].some((value) => String(value || '').toLowerCase().includes(term));
      const matchesStatus = !statusFilter || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [normalizedOrders, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const visibleOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);
  const orderSummary = useMemo(() => normalizedOrders.reduce((sum, order) => sum + Number(order.finalSubtotal || order.total || 0), 0), [normalizedOrders]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const fetchProtectedBlob = async (filePath) => {
    const response = await fetch(`${apiOrigin}${filePath}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Could not load file');
    return response.blob();
  };

  const openFilePreview = async (filePath, fileName) => {
    setFileLoading(true);
    try {
      const blob = await fetchProtectedBlob(filePath);
      setPreviewFile({ fileName, objectUrl: URL.createObjectURL(blob), filePath });
    } catch (error) {
      addToast(error.message || 'Could not open file', 'error');
    } finally {
      setFileLoading(false);
    }
  };

  const downloadProtectedFile = async (filePath, fileName) => {
    setFileLoading(true);
    try {
      const blob = await fetchProtectedBlob(filePath);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName || filePath.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      addToast('File download started', 'success');
    } catch (error) {
      addToast(error.message || 'Could not download file', 'error');
    } finally {
      setFileLoading(false);
    }
  };

  const openFileLocation = async (filePath, fileName) => {
    setFileLoading(true);
    try {
      const blob = await fetchProtectedBlob(filePath);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      addToast(`Opened ${fileName || 'file'}`, 'success');
    } catch (error) {
      addToast(error.message || 'Could not open file location', 'error');
    } finally {
      setFileLoading(false);
    }
  };

  const handleStatusChange = async (order, status) => {
    try {
      if (order.isCustomOrder) {
        await changeCustomOrderStatus(order.id, status, token);
      } else {
        await changeOrderStatus(order.id, status, token);
      }
      setOrders((current) => current.map((entry) => (entry.id === order.id ? { ...entry, status } : entry)));
      window.dispatchEvent(new Event('orders:updated'));
      addToast('Order status updated', 'success');
    } catch (error) {
      addToast(error.message || 'Could not update order status', 'error');
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.isCustomOrder) {
        await deleteCustomOrder(deleteTarget.id, token);
      } else {
        await deleteOrder(deleteTarget.id, token);
      }
      setOrders((current) => current.filter((order) => order.id !== deleteTarget.id));
      setDeleteTarget(null);
      window.dispatchEvent(new Event('orders:updated'));
      addToast('Order deleted', 'success');
    } catch (error) {
      addToast(error.message || 'Could not delete order', 'error');
    }
  };

  const handlePaymentStatusChange = async (orderId, status) => {
    setPaymentSaving(true);
    try {
      await updateOrderPaymentStatus(orderId, { status }, token);
      setOrders((current) => current.map((order) => (order.id === orderId ? {
        ...order,
        paymentStatus: status,
        amountPaid: status === 'Completed' ? Number(order.total || 0) : 0,
        remainingAmount: status === 'Completed' ? 0 : Number(order.total || 0)
      } : order)));
      window.dispatchEvent(new Event('orders:updated'));
      addToast('Payment status updated', 'success');
    } catch (error) {
      addToast(error.message || 'Could not update payment status', 'error');
    } finally {
      setPaymentSaving(false);
    }
  };

  // Flat label-value list, no individual boxes
  const renderFlatSection = (title, rows) => (
    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <p className="mb-1 text-xs uppercase tracking-[0.25em] text-stone-500">{title}</p>
      <dl className="divide-y divide-stone-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="shrink-0 text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
            <dd className="text-right text-sm font-medium text-stone-900">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const renderOrderCard = (order) => (
    <div key={order.id} className="rounded-4xl border border-stone-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">{order.orderType}</span>
        <span className="text-sm text-stone-500">#{order.id}</span>
        <span className={`ml-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${statusStyles[order.status] || 'bg-stone-100 text-stone-700'}`}>{order.status || 'Pending'}</span>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: details */}
        <div className="flex-1 space-y-4">

          {/* Item chips at top for standard orders */}
          {!order.isCustomOrder && order.items?.length ? (
            <div className="flex flex-wrap gap-2">
              {order.items.map((item, index) => (
                <span key={`${order.id}-${index}`} className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                  {item.name} × {item.quantity}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {renderFlatSection('Customer Details', [
              ['Name', order.displayCustomerName],
              ['Phone', order.displayPhone],
              ['Email', order.displayEmail],
              ['Address', order.displayAddress]
            ])}

            {renderFlatSection('Product Details', [
              ['Order Type', order.orderType],
              ['Color', order.displaySelectedColor],
              ['Quantity', order.displayQuantity],
              ['Description', order.displayDescription],
              ['Status', order.status || 'Pending'],
              ['Order Date', order.displayOrderDate.toLocaleDateString()],
              ['Est. Delivery', order.displayEstimatedDelivery]
            ])}
          </div>

          {/* Payment info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
            {order.paymentMethod === 'Cash On Delivery' ? (
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Payment: Cash On Delivery
              </span>
            ) : (
              <>
                <span className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700">
                  {order.paymentStatus || 'Pending'}
                </span>
                <span>via {order.paymentMethod}</span>
                {!order.isCustomOrder && <span>Paid: NPR {Number(order.amountPaid || 0).toLocaleString()}</span>}
                {!order.isCustomOrder && order.remainingAmount > 0 && <span>Due: NPR {Number(order.remainingAmount).toLocaleString()}</span>}
              </>
            )}
          </div>

          {/* Payment screenshot actions */}
          {!order.isCustomOrder && order.paymentScreenshot ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={fileLoading} onClick={() => openFilePreview(order.paymentScreenshot, order.paymentScreenshotName || 'payment-screenshot')} className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50"><Eye size={14} /> View screenshot</button>
              <button type="button" disabled={fileLoading} onClick={() => downloadProtectedFile(order.paymentScreenshot, order.paymentScreenshotName || 'payment-screenshot')} className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50"><Download size={14} /> Download screenshot</button>
              <button type="button" disabled={paymentSaving} onClick={() => handlePaymentStatusChange(order.id, 'Completed')} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Approve Payment</button>
              <button type="button" disabled={paymentSaving} onClick={() => handlePaymentStatusChange(order.id, 'Rejected')} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Reject Payment</button>
            </div>
          ) : null}

          {/* Custom order files */}
          {order.isCustomOrder ? (
            <div className="space-y-3 rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Uploaded Files</p>
              {order.imageFile ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-900">Image — {order.imageFileName || 'Custom upload'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={fileLoading} onClick={() => openFilePreview(order.imageFile, order.imageFileName || 'image')} className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50"><Eye size={14} /> View</button>
                    <button type="button" disabled={fileLoading} onClick={() => downloadProtectedFile(order.imageFile, order.imageFileName || 'image')} className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50"><Download size={14} /> Download</button>
                  </div>
                </div>
              ) : null}
              {order.stlFile ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-3">
                  <p className="text-sm font-semibold text-stone-900">STL — {order.stlFileName || 'Custom model'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={fileLoading} onClick={() => openFileLocation(order.stlFile, order.stlFileName || 'model.stl')} className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50"><Eye size={14} /> View</button>
                    <button type="button" disabled={fileLoading} onClick={() => downloadProtectedFile(order.stlFile, order.stlFileName || 'model.stl')} className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-50"><Download size={14} /> Download</button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Right: status controls */}
        <div className="space-y-3 lg:w-60">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button key={status} type="button" onClick={() => handleStatusChange(order, status)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${order.status === status ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                {status}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setDeleteTarget(order)} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-900">Orders</h1>
        <p className="mt-3 text-stone-600">Review and update customer order status across standard and custom orders.</p>
      </div>

      <div className="rounded-4xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-stone-500">Total order value</p>
        <p className="mt-2 text-2xl font-semibold text-stone-900">NPR {orderSummary.toLocaleString()}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-4xl border border-stone-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by order id, customer, phone" className="w-full rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none md:max-w-sm" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm outline-none">
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-sm text-stone-600">Loading orders...</p> : visibleOrders.map((order) => renderOrderCard(order))}
        {filteredOrders.length === 0 && !loading ? <StateCard title="No orders found" description="Try adjusting your search or status filter." tone="default" /> : null}
        {!loading ? (
          <div className="flex items-center justify-between rounded-4xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-stone-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-full border border-stone-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-full border border-stone-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </div>
          </div>
        ) : null}
      </div>

      {previewFile ? (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-stone-950/45 p-4">
          <div className="w-full max-w-2xl rounded-4xl border border-stone-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-stone-900">{previewFile.fileName}</p>
              <button type="button" onClick={() => { URL.revokeObjectURL(previewFile.objectUrl); setPreviewFile(null); }} className="rounded-full border border-stone-300 px-3 py-2 text-sm text-stone-700">Close</button>
            </div>
            <div className="mt-4 rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <label className="mb-3 block text-sm font-medium text-stone-700">Zoom</label>
              <input type="range" min="1" max="2.5" step="0.1" value={previewFile.zoom || 1} onChange={(event) => setPreviewFile((current) => ({ ...current, zoom: Number(event.target.value) }))} className="w-full" />
              <div className="mt-4 overflow-auto rounded-[1.25rem] bg-white p-3 shadow-sm">
                <img src={previewFile.objectUrl} alt={previewFile.fileName} style={{ transform: `scale(${previewFile.zoom || 1})`, transformOrigin: 'center top' }} className="mx-auto max-h-[70vh] object-contain" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-stone-950/40 p-4">
          <div className="w-full max-w-md rounded-4xl border border-stone-200 bg-white p-6 shadow-xl">
            <p className="text-lg font-semibold text-stone-900">Delete order?</p>
            <p className="mt-3 text-sm text-stone-600">Are you sure you want to delete this order?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700">Cancel</button>
              <button type="button" onClick={handleDeleteOrder} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminOrdersPage;

import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAnalytics, getCustomOrders, getOrders } from '../services/api';
import StateCard from '../components/StateCard';

const AdminPage = () => {
  const { user } = useAuth();
  const { counts } = useOutletContext();
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('reforgedx-token');
    Promise.all([getAnalytics(token), getOrders(token), getCustomOrders(token)])
      .then(([analyticsResponse, ordersResponse, customOrdersResponse]) => {
        setAnalytics(analyticsResponse.data);
        setOrders(ordersResponse.data || []);
        setCustomOrders(customOrdersResponse.data || []);
      })
      .catch((fetchError) => setError(fetchError.message || 'Could not load dashboard data'));
  }, [user]);

  if (!user || user.role !== 'admin') {
    return <StateCard tone="error" title="Admin access required" description="Sign in with an administrator account to continue." />;
  }

  if (error) {
    return <StateCard tone="error" title="Unable to load admin dashboard" description={error} />;
  }

  return (
    <div className="space-y-10">
      <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-900">Admin Dashboard</h1>
        <p className="mt-3 text-stone-600">Manage products, orders, analytics, and more from one place.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm uppercase tracking-[0.3em] text-stone-500">Revenue</p><p className="mt-4 text-3xl font-semibold text-stone-900">NPR {analytics?.revenue?.toLocaleString() || 0}</p></div>
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm uppercase tracking-[0.3em] text-stone-500">Orders</p><p className="mt-4 text-3xl font-semibold text-stone-900">{counts.orders}</p></div>
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm uppercase tracking-[0.3em] text-stone-500">Reviews</p><p className="mt-4 text-3xl font-semibold text-stone-900">{counts.reviews}</p></div>
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm uppercase tracking-[0.3em] text-stone-500">Products</p><p className="mt-4 text-3xl font-semibold text-stone-900">{analytics?.totalProducts || 0}</p></div>
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm"><p className="text-sm uppercase tracking-[0.3em] text-stone-500">Customers</p><p className="mt-4 text-3xl font-semibold text-stone-900">{analytics?.customerCount || 0}</p></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Recent orders</h2>
          <div className="mt-6 space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Order ID: {order.id}</p>
                <p className="mt-2 font-semibold text-stone-900">NPR {order.total?.toLocaleString() || 0}</p>
                <p className="text-sm text-stone-600">Status: {order.status}</p>
              </div>
            ))}
            {orders.length === 0 ? <p className="text-sm text-stone-600">No orders yet.</p> : null}
            {orders.length === 0 ? <StateCard title="No orders yet" description="Customer orders will appear here once they start coming in." /> : null}
          </div>
        </section>
        <section className="space-y-6">
          <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Low stock warning</h2>
            <p className="mt-4 text-sm text-stone-600">{analytics?.lowStockProducts || 0} products are running low.</p>
          </div>
          <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Top selling products</h2>
            <div className="mt-4 space-y-3">
              {(analytics?.topSellingProducts || []).map((product) => <div key={product.name} className="rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">{product.name} • {product.popularity}</div>)}
            </div>
          </div>
        </section>
      </div>
      <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-stone-900">Custom requests</h2>
        <div className="mt-6 space-y-4">
          {customOrders.slice(0, 4).map((request) => (
            <div key={request.id} className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
              <p className="text-sm text-stone-500">Request ID: {request.id}</p>
              <p className="mt-2 font-semibold text-stone-900">{String(request.category || 'General').replace('-', ' ')}</p>
              <p className="text-sm text-stone-600">Status: {request.status}</p>
            </div>
          ))}
          {customOrders.length === 0 ? <StateCard title="No custom requests yet" description="Lithophane and STL submissions will appear here." /> : null}
        </div>
      </section>
    </div>
  );
};

export default AdminPage;

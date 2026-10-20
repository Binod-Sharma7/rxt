import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { getAdminReviews, getCustomOrders, getOrders } from '../services/api';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
  const [counts, setCounts] = useState({ orders: 0, reviews: 0 });
  const token = localStorage.getItem('reforgedx-token');

  useEffect(() => {
    const loadCounts = () => {
      Promise.allSettled([getOrders(token), getCustomOrders(token), getAdminReviews(token)])
        .then(([ordersResult, customOrdersResult, reviewsResult]) => {
          const orders = ordersResult.status === 'fulfilled' ? ordersResult.value.data || [] : [];
          const customOrders = customOrdersResult.status === 'fulfilled' ? customOrdersResult.value.data || [] : [];
          const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value.data || [] : [];
          setCounts({ orders: orders.length + customOrders.length, reviews: reviews.length });
        });
    };

    loadCounts();
    window.addEventListener('orders:updated', loadCounts);
    window.addEventListener('reviews:updated', loadCounts);
    return () => {
      window.removeEventListener('orders:updated', loadCounts);
      window.removeEventListener('reviews:updated', loadCounts);
    };
  }, [token]);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <AdminSidebar counts={counts} />
      <div className="space-y-6">
        <Outlet context={{ counts }} />
      </div>
    </div>
  );
};

export default AdminLayout;

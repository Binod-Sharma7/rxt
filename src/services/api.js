import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

export const apiBaseUrl = api.defaults.baseURL.replace(/\/$/, '');
export const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const fallbackMessage = !error.response ? 'Network error. Please check your connection.' : serverMessage || 'API request failed';
    error.message = status === 401 ? 'Unauthorized. Please sign in again.' : status === 403 ? 'Forbidden. Admin access required.' : status === 404 ? 'Requested resource was not found.' : status === 500 ? 'Server error. Please try again later.' : fallbackMessage;
    return Promise.reject(error);
  }
);

export const getProducts = (params = {}) => api.get('/products', { params });
export const getProductById = (id) => api.get(`/products/${id}`);
export const getCategories = () => api.get('/categories');
export const getBlogs = (q = '') => api.get(`/blogs${q ? `?q=${encodeURIComponent(q)}` : ''}`);
export const getFaqs = () => api.get('/faqs');
export const getSiteAssets = () => api.get('/site-assets');
export const createCustomOrder = (payload, config = {}) => api.post('/custom-orders', payload, config);
export const createProduct = (payload, token) => api.post('/admin/products', payload, { headers: { Authorization: `Bearer ${token}` } });
export const getAdminProducts = (token) => api.get('/admin/products', { headers: { Authorization: `Bearer ${token}` } });
export const updateProduct = (id, payload, token) => api.patch(`/admin/products/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
export const deleteProduct = (id, token) => api.delete(`/admin/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
export const createOrder = (payload, token) => api.post('/orders', payload, { headers: { Authorization: `Bearer ${token}` } });
export const getOrders = (token) => api.get('/orders', { headers: { Authorization: `Bearer ${token}` } });
export const getAnalytics = (token) => api.get('/analytics', { headers: { Authorization: `Bearer ${token}` } });
export const getCustomOrders = (token) => api.get('/custom-orders', { headers: { Authorization: `Bearer ${token}` } });
export const changeOrderStatus = (id, status, token) => api.patch(`/orders/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
export const changeCustomOrderStatus = (id, status, token) => api.patch(`/custom-orders/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
export const deleteOrder = (id, token) => api.delete(`/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
export const deleteCustomOrder = (id, token) => api.delete(`/custom-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
export const uploadProfileImage = (formData, token) => api.patch('/auth/profile-image', formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
export const removeProfileImage = (token) => api.delete('/auth/profile-image', { headers: { Authorization: `Bearer ${token}` } });
export const getFavourites = (token) => api.get('/favourites', { headers: { Authorization: `Bearer ${token}` } });
export const toggleFavourite = (productId, token) => api.post(`/favourites/${productId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
export const getProductReviews = (productId) => api.get(`/products/${productId}/reviews`);
export const getApprovedReviews = () => api.get('/reviews/approved');
export const createReview = (formData, token) => api.post('/reviews', formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
export const updateReview = (reviewId, formData, token) => api.patch(`/reviews/${reviewId}`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
export const uploadOrderPaymentScreenshot = (orderId, formData, token) => api.post(`/orders/${orderId}/payment-screenshot`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
export const updateOrderPaymentStatus = (orderId, payload, token) => api.patch(`/orders/${orderId}/payment-status`, payload, { headers: { Authorization: `Bearer ${token}` } });
export const getAdminReviews = (token, { q = '', status = '' } = {}) => api.get(`/admin/reviews?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`, { headers: { Authorization: `Bearer ${token}` } });
export const updateAdminReview = (reviewId, payload, token) => api.patch(`/admin/reviews/${reviewId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
export const deleteAdminReview = (reviewId, token) => api.delete(`/admin/reviews/${reviewId}`, { headers: { Authorization: `Bearer ${token}` } });

export const updateProfile = (payload, token) => api.patch('/auth/profile', payload, { headers: { Authorization: `Bearer ${token}` } });

export const deletePurchaseHistory = (orderIds, token) => api.post('/orders/history/delete', { orderIds }, { headers: { Authorization: 'Bearer ' + token } });

export default api;

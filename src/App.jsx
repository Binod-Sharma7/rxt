import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import BlogPage from './pages/BlogPage';
import FaqPage from './pages/FaqPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AdminLayout from './components/AdminLayout';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import CustomOrderPage from './pages/CustomOrderPage';
import NotFoundPage from './pages/NotFoundPage';

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user, token } = useAuth();
  if (!user && !token) {
    return <Navigate to="/admin-login" replace />;
  }
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const CustomerOnlyRoute = ({ children }) => {
  const { user, token } = useAuth();
  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:id" element={<ProductDetailsPage />} />
            <Route path="cart" element={<CustomerOnlyRoute><CartPage /></CustomerOnlyRoute>} />
            <Route path="checkout" element={<CustomerOnlyRoute><CheckoutPage /></CustomerOnlyRoute>} />
            <Route path="login" element={<LoginPage />} />
            <Route path="admin-login" element={<AdminLoginPage />} />
            <Route path="adminlogin" element={<Navigate to="/" replace />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="dashboard" element={<CustomerOnlyRoute><DashboardPage /></CustomerOnlyRoute>} />
            <Route path="admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
            </Route>
            <Route path="custom-order" element={<CustomOrderPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;

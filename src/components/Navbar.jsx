
import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from './ToastProvider';

const CLOUDINARY_LOGO_URL =
  'https://res.cloudinary.com/jwoloh7i/image/upload/v1791999525/reforgedx/static/logo.png';

const links = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Our Products' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/faq', label: 'FAQs' },
];

const DefaultAvatar = ({ name = '' }) => (
  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold uppercase text-stone-700">
    {name.trim()
      ? name
          .trim()
          .split(' ')
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
      : 'RX'}
  </div>
);

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const { addToast } = useToast();

  const isAdmin = user?.role === 'admin';

  const visibleLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin/products', label: 'Products' },
        { to: '/admin/orders', label: 'Orders' },
      ];
    }

    return links;
  }, [isAdmin]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
      addToast('Logout successful', 'success');
      setOpen(false);
      navigate('/');
    } catch {
      addToast('Logout failed. Please try again.', 'error');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-white">
            <img
              src={CLOUDINARY_LOGO_URL}
              alt="ReforgedX Logo"
              className="h-full w-full object-contain"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-stone-900">
              ReforgedX
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
              We See Waste As A Resource
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 lg:flex">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive
                  ? 'font-semibold text-stone-900'
                  : 'text-stone-600 hover:text-stone-900'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <>
              <Link
                to="/products"
                aria-label="Search products"
                className="hidden rounded-full border border-stone-200 p-2 text-stone-700 sm:block"
              >
                <Search size={18} />
              </Link>

              <Link
                to="/cart"
                aria-label="Shopping cart"
                className="relative rounded-full border border-stone-200 p-2 text-stone-700"
              >
                <ShoppingBag size={18} />
                <span className="absolute -right-1 -top-1 rounded-full bg-amber-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {cartItems.length}
                </span>
              </Link>
            </>
          )}

          {user ? (
            <>
              <Link
                to={isAdmin ? '/admin' : '/dashboard'}
                aria-label="Profile"
                className="rounded-full border border-stone-200 p-1 text-stone-700"
              >
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile avatar"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <DefaultAvatar name={user.name || ''} />
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="hidden cursor-pointer items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700"
            >
              Login
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen((state) => !state)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="rounded-full border border-stone-200 p-2 text-stone-700 lg:hidden"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {open && (
        <div className="border-t border-stone-200 bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? 'text-sm font-semibold text-stone-900'
                    : 'text-sm font-medium text-stone-700'
                }
              >
                {link.label}
              </NavLink>
            ))}

            {user ? (
              <button
                onClick={handleLogout}
                className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-700 transition duration-200 hover:text-stone-900 active:scale-[0.98] disabled:opacity-60"
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-stone-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

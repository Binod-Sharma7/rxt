import { NavLink, useLocation } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/reviews', label: 'Reviews' }
];

const AdminSidebar = ({ counts }) => {
  const location = useLocation();

  return (
    <aside className="rounded-4xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm uppercase tracking-[0.3em] text-amber-700">Admin</p>
      <div className="mt-6 space-y-3">
        {links.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={`flex items-center justify-between rounded-3xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}
            >
              <span>{item.label}</span>
              {item.to === '/admin/orders' || item.to === '/admin/reviews' ? (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-white text-stone-900' : 'bg-amber-100 text-amber-800'}`} aria-label={`${item.label} count`}>
                  {item.to === '/admin/orders' ? counts.orders : counts.reviews}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};

export default AdminSidebar;

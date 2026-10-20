import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { SiteAssetsProvider } from '../context/SiteAssetsContext';

const Layout = () => (
  <SiteAssetsProvider>
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,224,182,0.35),_transparent_40%)] text-stone-800">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  </SiteAssetsProvider>
);

export default Layout;

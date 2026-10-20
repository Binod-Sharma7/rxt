import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="border-t border-stone-200 bg-stone-950 text-stone-200">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
      <div>
        <p className="text-lg font-semibold text-white">ReforgedX</p>
        <p className="mt-3 text-sm text-stone-400">Turning plastic waste into premium 3D printed products with a calm, sustainable approach.</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-400">Explore</h3>
        <div className="mt-4 flex flex-col gap-2 text-sm text-stone-300">
          <Link to="/products" className="hover:text-white">Products</Link>
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/contact" className="hover:text-white">Contact</Link>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-400">Visit</h3>
        <p className="mt-4 text-sm text-stone-300">Lamachaur, Pokhara, Kaski, Nepal</p>
        {/* <a href="mailto:hello@reforgedx.com" className="mt-2 inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200">
          hello@reforgedx.com <ArrowRight size={14} />
        </a> */}
      </div>
    </div>
  </footer>
);

export default Footer;

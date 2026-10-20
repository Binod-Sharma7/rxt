import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Sparkles } from 'lucide-react';
import { motion as Motion } from 'framer-motion';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-4xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,119,6,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(120,113,108,0.12),transparent_35%)]" />
      <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl text-amber-700 shadow-sm">
          <Sparkles size={34} />
        </div>
        <p className="mt-6 text-sm uppercase tracking-[0.35em] text-amber-700">Page not found</p>
        <h1 className="mt-4 text-4xl font-semibold text-stone-900 sm:text-5xl">Oops! The page you're looking for doesn't exist.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-stone-600">The link may be broken, the page may have moved, or the address may be mistyped. Use one of the buttons below to continue browsing ReforgedX.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white"><Home size={16} /> Go Home</Link>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700"><ArrowLeft size={16} /> Back</button>
        </div>
      </Motion.div>
    </div>
  );
};

export default NotFoundPage;

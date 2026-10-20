import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getFinalPrice } from '../services/pricing';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const isOutOfStock = (product.stock || 0) <= 0;
  const isAdmin = user?.role === 'admin';

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/products/${product.id}`}>
        <img src={product.images?.[0]} alt={product.name} className="h-56 w-full object-cover" />
      </Link>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-700">{product.category}</p>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{product.stock} in stock</span>
        </div>
        <Link to={`/products/${product.id}`} className="mt-3 block text-xl font-semibold text-stone-900">{product.name}</Link>
        <p className="mt-2 text-sm text-stone-600">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-stone-900">{formatCurrency(getFinalPrice(product.price, product.discount))}</p>
            {product.discount ? <p className="text-sm text-stone-500">{product.discount}% off</p> : null}
          </div>
          {!isAdmin ? (
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={isOutOfStock}
              aria-label={`Add ${product.name} to cart`}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${isOutOfStock ? 'cursor-not-allowed bg-stone-300 text-stone-600' : 'cursor-pointer bg-stone-900 text-white hover:bg-stone-700 active:scale-[0.98] active:bg-stone-800'}`}
            >
              <ShoppingBag size={16} /> {isOutOfStock ? 'Sold out' : 'Add'}
            </button>
          ) : <span className="rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-600">Admin view</span>}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;

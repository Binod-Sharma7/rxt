import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getProducts } from '../services/api';
import { formatCurrency, getFinalPrice } from '../services/pricing';

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    getProducts()
      .then((response) => setCatalog(response.data || []))
      .catch(() => setCatalog([]));
  }, []);

  const resolvedCartItems = useMemo(() => cartItems.map((item) => {
    const latestProduct = catalog.find((product) => product.id === item.id);
    return latestProduct ? { ...item, ...latestProduct, quantity: item.quantity } : item;
  }), [cartItems, catalog]);

  const subtotal = resolvedCartItems.reduce((sum, item) => sum + getFinalPrice(item.price, item.discount) * item.quantity, 0);

  return (
    <div className="space-y-10">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-900">Shopping Cart</h1>
        {cartItems.length === 0 ? (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
            <p className="text-lg text-stone-600">Your cart is empty.</p>
            <Link to="/products" className="mt-5 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">Browse products</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              {resolvedCartItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center">
                  <img src={item.images?.[0]} alt={item.name} className="h-28 w-28 rounded-3xl object-cover" />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-stone-900">{item.name}</h2>
                    <p className="text-sm text-stone-600">Original: {formatCurrency(item.price)}</p>
                    <p className="text-sm text-stone-600">Final: {formatCurrency(getFinalPrice(item.price, item.discount))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded-full border border-stone-300 px-3 py-2">-</button>
                    <span className="min-w-[2rem] text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-full border border-stone-300 px-3 py-2">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700">Remove</button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-stone-200 bg-white p-6 text-stone-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Total</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{formatCurrency(subtotal)}</p>
                <p className="mt-1 text-sm text-stone-600">Savings are recalculated from the latest product prices.</p>
              </div>
              <button onClick={() => navigate('/checkout')} className="inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">Proceed to checkout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;

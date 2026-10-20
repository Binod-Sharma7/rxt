/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const mergeCartItems = (guestCart, userCart) => {
  const merged = [...userCart];
  guestCart.forEach((item) => {
    const existing = merged.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.push(item);
    }
  });
  return merged;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const guestCart = JSON.parse(localStorage.getItem('reforgedx-cart') || '[]');
    const userCart = JSON.parse(localStorage.getItem(`reforgedx-cart:${user?.id || 'guest'}`) || '[]');
    if (user) {
      const merged = mergeCartItems(guestCart, userCart);
      setCartItems(merged);
      localStorage.setItem(`reforgedx-cart:${user.id}`, JSON.stringify(merged));
      localStorage.setItem('reforgedx-cart', JSON.stringify([]));
      return;
    }
    setCartItems(guestCart);
  }, [user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('reforgedx-cart', JSON.stringify(cartItems));
      return;
    }
    localStorage.setItem(`reforgedx-cart:${user.id}`, JSON.stringify(cartItems));
  }, [cartItems, user]);

  const addToCart = (product) => {
    if ((product.stock || 0) <= 0) {
      return;
    }
    setCartItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, quantity) => {
    setCartItems((current) => current.map((item) => item.id === id ? { ...item, quantity } : item).filter((item) => item.quantity > 0));
  };

  const removeFromCart = (id) => {
    setCartItems((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => setCartItems([]);

  const value = useMemo(() => ({ cartItems, addToCart, updateQuantity, removeFromCart, clearCart }), [cartItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

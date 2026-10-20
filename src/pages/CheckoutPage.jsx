/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ToastProvider';
import { createOrder, getProducts, uploadOrderPaymentScreenshot } from '../services/api';
import { formatCurrency, getFinalPrice, getDiscountAmount } from '../services/pricing';

const CheckoutPage = () => {
  const { user } = useAuth();
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('eSewa');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const { addToast } = useToast();
  const qrImage = import.meta.env.VITE_ESEWA_QR_URL || '';

  useEffect(() => {
    getProducts()
      .then((response) => setCatalog(response.data || []))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  useEffect(() => {
    const nextErrors = {};
    const phoneDigits = phone.replace(/\D/g, '');
    const normalizedPhone = phoneDigits.startsWith('977') ? phoneDigits.slice(3) : phoneDigits;

    if (!customerName.trim()) {
      nextErrors.customerName = 'Full name is required';
    } else if (customerName.trim().length < 3) {
      nextErrors.customerName = 'Full name must be at least 3 characters';
    } else if (customerName.trim().length > 100) {
      nextErrors.customerName = 'Full name must be at most 100 characters';
    }

    if (!phoneDigits || !/^9\d{9}$/.test(normalizedPhone)) {
      nextErrors.phone = 'Enter a valid Nepal phone number';
    }
    if (!address.trim()) {
      nextErrors.address = 'Address is required';
    } else if (address.trim().length > 200) {
      nextErrors.address = 'Address is too long';
    }

    setErrors(nextErrors);
  }, [customerName, phone, address]);

  const resolvedCartItems = useMemo(() => cartItems.map((item) => {
    const latestProduct = catalog.find((product) => product.id === item.id);
    return latestProduct ? { ...item, ...latestProduct, quantity: item.quantity } : item;
  }), [cartItems, catalog]);

  const originalSubtotal = useMemo(() => resolvedCartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [resolvedCartItems]);
  const subtotal = useMemo(() => resolvedCartItems.reduce((sum, item) => sum + getFinalPrice(item.price, item.discount) * item.quantity, 0), [resolvedCartItems]);
  const discountAmount = useMemo(() => resolvedCartItems.reduce((sum, item) => sum + getDiscountAmount(item.price, item.discount) * item.quantity, 0), [resolvedCartItems]);
  const total = subtotal;

  const validateFields = () => {
    const nextErrors = {};
    const phoneDigits = phone.replace(/\D/g, '');
    const normalizedPhone = phoneDigits.startsWith('977') ? phoneDigits.slice(3) : phoneDigits;

    if (!customerName.trim()) {
      nextErrors.customerName = 'Full name is required';
    } else if (customerName.trim().length < 3) {
      nextErrors.customerName = 'Full name must be at least 3 characters';
    } else if (customerName.trim().length > 100) {
      nextErrors.customerName = 'Full name must be at most 100 characters';
    }

    if (!phoneDigits || !/^9\d{9}$/.test(normalizedPhone)) {
      nextErrors.phone = 'Enter a valid Nepal phone number';
    }
    if (!address.trim()) {
      nextErrors.address = 'Address is required';
    } else if (address.trim().length > 200) {
      nextErrors.address = 'Address is too long';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!validateFields()) {
      addToast('Please complete the required shipping details.', 'error');
      return;
    }
    if (paymentMethod === 'FonePay') {
      addToast('This payment method is coming soon.', 'error');
      return;
    }
    if (paymentMethod === 'Bank Transfer') {
      addToast('Bank Transfer will be available soon.', 'error');
      return;
    }
    if (paymentMethod === 'eSewa' && !paymentConfirmation) {
      addToast('Please confirm you have paid through eSewa before checkout.', 'error');
      return;
    }
    if (paymentMethod === 'eSewa' && !paymentScreenshot) {
      addToast('Please upload your payment screenshot.', 'error');
      return;
    }

    setLoading(true);
    try {
      const orderResponse = await createOrder({
        items: resolvedCartItems,
        subtotal: originalSubtotal,
        discount: originalSubtotal ? Math.round((discountAmount / originalSubtotal) * 100 || 0) : 0,
        discountAmount,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'Cash On Delivery' ? 'Cash On Delivery Pending' : 'Pending',
        amountPaid: paymentMethod === 'eSewa' ? 0 : 0,
        remainingAmount: total,
        customerName,
        email,
        phone,
        address,
        notes,
        estimatedDelivery: '3-5 business days'
      }, localStorage.getItem('reforgedx-token'));

      if (paymentMethod === 'eSewa' && paymentScreenshot) {
        const screenshotForm = new FormData();
        screenshotForm.append('paymentScreenshot', paymentScreenshot);
        await uploadOrderPaymentScreenshot(orderResponse.data.id, screenshotForm, localStorage.getItem('reforgedx-token'));
      }

      clearCart();
      window.dispatchEvent(new Event('orders:updated'));
      addToast('Order placed successfully', 'success');
      navigate('/dashboard');
    } catch (error) {
      addToast(error.message || 'Could not place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-stone-900">Checkout</h1>
      {resolvedCartItems.length === 0 ? (
        <p className="mt-6 text-stone-600">Add items to your cart before checking out.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Full name</span>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} minLength={3} maxLength={100} className={`w-full rounded-3xl border px-4 py-3 outline-none ${errors.customerName ? 'border-rose-400 bg-rose-50' : 'border-stone-200 bg-stone-50'}`} />
              {errors.customerName ? <p className="text-sm text-rose-600">{errors.customerName}</p> : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Email <span className="font-normal text-stone-500">(optional)</span></span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Phone number</span>
              <input inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className={`w-full rounded-3xl border px-4 py-3 outline-none ${errors.phone ? 'border-rose-400 bg-rose-50' : 'border-stone-200 bg-stone-50'}`} />
              {errors.phone ? <p className="text-sm text-rose-600">{errors.phone}</p> : null}
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-stone-700">Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} className={`w-full rounded-3xl border px-4 py-3 outline-none ${errors.address ? 'border-rose-400 bg-rose-50' : 'border-stone-200 bg-stone-50'}`} />
              {errors.address ? <p className="text-sm text-rose-600">{errors.address}</p> : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-stone-700">Order notes <span className="font-normal text-stone-500">(optional)</span></span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
          </div>
          <div className="space-y-3 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-6">
            <p className="text-sm font-medium text-stone-700">Payment method</p>
            {['eSewa', 'FonePay', 'Bank Transfer', 'Cash On Delivery'].map((method) => (
              <label key={method} className="flex items-center gap-3 rounded-3xl border border-stone-200 bg-white px-4 py-3">
                <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} disabled={method === 'FonePay' || method === 'Bank Transfer'} />
                <span className="text-sm text-stone-700">{method}</span>
                {method === 'FonePay' ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Coming soon</span> : null}
                {method === 'Bank Transfer' ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">Coming soon</span> : null}
              </label>
            ))}
            {paymentMethod === 'eSewa' ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Please scan the QR code using your eSewa App.</p>
                <p className="mt-2">IMPORTANT: While making payment, write your FULL NAME in the payment remarks/description. This helps us verify your payment quickly.</p>
                <p className="mt-2">After payment click "I Have Paid" then upload payment screenshot. Admin will verify payment before confirming your order.</p>
                {qrImage ? <img src={qrImage} alt="eSewa QR code" className="mt-4 h-48 w-48 rounded-2xl border border-emerald-200 bg-white object-contain" /> : <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-white p-6 text-center text-emerald-700">eSewa QR will be added here</div>}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => setPaymentConfirmation(true)} className={`rounded-full px-4 py-2 text-sm font-semibold ${paymentConfirmation ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {paymentConfirmation ? 'Payment Confirmed' : 'I Have Paid'}
                  </button>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      addToast('Payment screenshot must be less than 5MB', 'error');
                      event.target.value = '';
                      setPaymentScreenshot(null);
                      return;
                    }
                    setPaymentScreenshot(file);
                  }} className="text-sm" />
                </div>
                {paymentScreenshot ? <p className="mt-2 text-xs text-emerald-800">Screenshot selected: {paymentScreenshot.name}</p> : null}
              </div>
            ) : null}
            {paymentMethod === 'FonePay' ? <p className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">This payment method is coming soon.</p> : null}
            {paymentMethod === 'Bank Transfer' ? <p className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Bank Transfer will be available soon.</p> : null}
          </div>
          <div className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Order summary</p>
            <p className="mt-3 text-sm text-stone-600">Original total: {formatCurrency(originalSubtotal)}</p>
            <p className="mt-2 text-sm text-stone-600">Discount: {formatCurrency(discountAmount)}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">Final payable: {formatCurrency(total)}</p>
            <p className="mt-2 text-sm text-stone-600">{resolvedCartItems.length} items in cart</p>
          </div>
          <button type="submit" disabled={loading} className="inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white">
            {loading ? 'Placing order...' : 'Place order'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CheckoutPage;

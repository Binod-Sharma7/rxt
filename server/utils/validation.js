export const isNepalPhoneNumber = (value = '') => {
  const normalized = String(value || '').replace(/\D/g, '');
  if (!normalized) return false;
  if (/^9[0-9]{9}$/.test(normalized)) return true;
  if (/^9779[0-9]{9}$/.test(normalized)) return true;
  return false;
};

export const validateCheckoutPayload = (payload = {}) => {
  const errors = {};
  const customerName = String(payload.customerName || '').trim();
  const phone = String(payload.phone || '').trim();
  const address = String(payload.address || '').trim();

  if (!customerName) {
    errors.customerName = 'Customer name is required';
  } else if (customerName.length < 3) {
    errors.customerName = 'Customer name must be at least 3 characters';
  } else if (customerName.length > 100) {
    errors.customerName = 'Customer name must be at most 100 characters';
  }

  if (!isNepalPhoneNumber(phone)) {
    errors.phone = 'Enter a valid Nepal phone number';
  }

  if (!address) {
    errors.address = 'Address is required';
  } else if (address.length > 200) {
    errors.address = 'Address is too long';
  }

  return errors;
};

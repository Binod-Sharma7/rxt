export const validateProductPricing = (payload = {}) => {
  const errors = {};
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'price')) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
      errors.price = 'Price must be greater than zero.';
    } else {
      updates.price = price;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'discount')) {
    const discount = Number(payload.discount);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      errors.discount = 'Discount must be between 0 and 100 percent.';
    } else {
      updates.discount = discount;
    }
  }

  return { errors, updates };
};

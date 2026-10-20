export const getFinalPrice = (price, discount = 0) => {
  const numericPrice = Number(price || 0);
  const numericDiscount = Number(discount || 0);
  const discounted = numericPrice * (1 - numericDiscount / 100);
  return Math.round(discounted);
};

export const getDiscountAmount = (price, discount = 0) => {
  const numericPrice = Number(price || 0);
  const numericDiscount = Number(discount || 0);
  return Math.max(0, Math.round(numericPrice * (numericDiscount / 100)));
};

export const formatCurrency = (amount) => `NPR ${Number(amount || 0).toLocaleString()}`;

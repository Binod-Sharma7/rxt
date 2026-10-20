export const normalizeHistoryIds = (value, max = 50) => {
  if (!Array.isArray(value)) return { ids: [], error: 'Order IDs must be provided as an array.' };
  const ids = [...new Set(value.map((id) => String(id || '').trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > max) {
    return { ids: [], error: `Provide between 1 and ${max} order IDs.` };
  }
  return { ids, error: '' };
};

export const belongsToCustomer = (order, userId, customerObjectId = '') => (
  Boolean(order?.userId === userId || (customerObjectId && order?.customer?.toString() === customerObjectId))
);

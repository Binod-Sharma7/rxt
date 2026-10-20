export const isSupportedPaymentMethod = (paymentMethod) => (
  paymentMethod === 'eSewa' || paymentMethod === 'Cash On Delivery'
);

export const buildTrustedOrder = (requestedItems, catalog) => {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { error: 'At least one product is required.' };
  }

  const quantities = new Map();
  for (const item of requestedItems) {
    const productId = String(item?.id || '').trim();
    const quantity = Number(item?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return { error: 'Each product must have a valid quantity between 1 and 100.' };
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const productIds = Array.from(quantities.keys());
  const catalogById = new Map(catalog.filter((product) => productIds.includes(product.id)).map((product) => [product.id, product]));
  if (catalogById.size !== productIds.length) {
    return { error: 'One or more products are no longer available.' };
  }

  const items = [];
  let subtotal = 0;
  let discountAmount = 0;
  for (const productId of productIds) {
    const product = catalogById.get(productId);
    const quantity = quantities.get(productId);
    const stock = Number(product.stock || 0);
    const price = Math.max(0, Number(product.price || 0));
    const discount = Math.min(100, Math.max(0, Number(product.discount || 0)));
    if (!Number.isFinite(price) || !Number.isFinite(discount) || quantity > stock) {
      return { error: `Insufficient stock for ${product.name || 'a product'}.` };
    }
    const unitDiscount = Math.round(price * (discount / 100));
    subtotal += price * quantity;
    discountAmount += unitDiscount * quantity;
    items.push({
      id: product.id,
      name: product.name,
      category: product.category,
      price,
      discount,
      colors: product.colors,
      dimensions: product.dimensions,
      images: product.images,
      quantity
    });
  }

  return {
    items,
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    discount: subtotal ? Math.round((discountAmount / subtotal) * 100) : 0
  };
};

export const reserveStock = async (items, { useDb, products, Product }) => {
  const reserved = [];
  const release = async () => {
    if (useDb) {
      await Promise.all(reserved.map((item) => Product.updateOne({ id: item.id }, { $inc: { stock: item.quantity } })));
      return;
    }
    reserved.forEach((item) => {
      const product = products.find((entry) => entry.id === item.id);
      if (product) product.stock += item.quantity;
    });
  };

  for (const item of items) {
    if (useDb) {
      const updated = await Product.findOneAndUpdate(
        { id: item.id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      ).lean();
      if (!updated) {
        await release();
        return { error: `Insufficient stock for ${item.name}.` };
      }
    } else {
      const product = products.find((entry) => entry.id === item.id);
      if (!product || product.stock < item.quantity) {
        await release();
        return { error: `Insufficient stock for ${item.name}.` };
      }
      product.stock -= item.quantity;
    }
    reserved.push({ id: item.id, quantity: item.quantity });
  }
  return { release };
};

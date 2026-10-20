import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { User, Product, Category, CustomOrder, Order, Review, SiteAsset } from '../models/index.js';

dotenv.config({ quiet: true });

const root = process.cwd();
const uploadsRoot = path.join(root, 'server', 'uploads');
const approve = process.argv.includes('--approve');
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
if (!cloudinaryConfigured) throw new Error('Cloudinary configuration is required.');
if (process.env.MONGO_URI.startsWith('mongodb+srv://')) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const staticAssets = [
  { file: 'rxt logo/final logo main.png', folder: 'static', key: 'logo', kind: 'logo', label: 'ReforgedX logo', alt: 'ReforgedX Logo' },
  { file: 'team photo/binod.jpg', folder: 'team', key: 'teamBinod', kind: 'team', label: 'Binod Sharma team photo', alt: 'Binod Sharma' },
  { file: 'team photo/rps.jpg', folder: 'team', key: 'teamRupesh', kind: 'team', label: 'Rupesh Malla team photo', alt: 'Rupesh Malla' },
  { file: 'qr/20260613_192756.jpg', folder: 'static', key: 'paymentQr', kind: 'qr', label: 'Payment QR code', alt: 'Payment QR code' },
  { sourceUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80', folder: 'static', key: 'homeHero', kind: 'hero', label: 'Homepage manufacturing hero', alt: 'ReforgedX manufacturing workspace' }
];

const basename = (value) => path.basename(value || '');
const cloudinaryReference = (value) => {
  if (!value?.startsWith('https://res.cloudinary.com/')) return null;
  const match = value.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  const pathParts = match[1].split('/');
  const file = pathParts.pop() || '';
  const extensionIndex = file.lastIndexOf('.');
  return {
    storageId: [...pathParts, extensionIndex > -1 ? file.slice(0, extensionIndex) : file].join('/'),
    format: extensionIndex > -1 ? file.slice(extensionIndex + 1) : ''
  };
};
const secureUpload = async (file, folder, type = 'upload', resourceType = 'image') => {
  const data = await fs.readFile(file);
  return secureUploadBuffer(data, folder, type, resourceType);
};

const secureUploadBuffer = async (data, folder, type = 'upload', resourceType = 'image', publicId = '') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `reforgedx/${folder}`,
      resource_type: resourceType,
      type,
      public_id: publicId || undefined,
      overwrite: false
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(data);
  });
};

const migrateStaticAsset = async (asset) => {
  const file = asset.file ? path.join(uploadsRoot, asset.file) : '';
  try {
    await fs.access(file);
  } catch {
    return { status: 'missing-source', file: asset.file };
  }
  const publicId = `reforgedx/${asset.folder}/${asset.key}`;
  try {
    const existing = await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'upload' });
    return { status: 'existing', url: existing.secure_url, publicId: existing.public_id, format: existing.format, file: asset.file || asset.sourceUrl };
  } catch (error) {
    if (error.error?.http_code !== 404) throw error;
  }
  const response = asset.sourceUrl ? await fetch(asset.sourceUrl) : null;
  if (response && !response.ok) throw new Error(`Static source returned ${response.status}: ${asset.sourceUrl}`);
  const data = asset.sourceUrl ? Buffer.from(await response.arrayBuffer()) : await fs.readFile(file);
  const result = await secureUploadBuffer(data, asset.folder, 'upload', 'image', asset.key);
  return { status: 'uploaded', url: result.secure_url, publicId: result.public_id, format: result.format, file: asset.file || asset.sourceUrl };
};

const uploadPublicSource = async (source, folder, publicId) => {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image source returned ${response.status}: ${source}`);
  const result = await secureUploadBuffer(Buffer.from(await response.arrayBuffer()), folder, 'upload', 'image', publicId);
  return result;
};

const planned = [];
const addPlan = (collection, record, updates, file, access) => {
  planned.push({
    collection,
    recordId: record.id || record._id?.toString(),
    file,
    access,
    updates
  });
};

const addStaticPlan = (asset, sourceStatus) => {
  planned.push({
    collection: 'siteAssets',
    recordId: asset.key,
    source: asset.file || asset.sourceUrl,
    access: 'public',
    updates: {
      key: asset.key,
      kind: asset.kind,
      label: asset.label,
      url: '<verified Cloudinary secure_url>',
      storageId: `reforgedx/${asset.folder}/${asset.key}`,
      format: '<verified format>',
      resourceType: 'image',
      alt: asset.alt,
      source: sourceStatus
    }
  });
};

const findRecords = async () => {
  for (const asset of staticAssets) {
    const sourceExists = asset.sourceUrl || await fs.access(path.join(uploadsRoot, asset.file)).then(() => true).catch(() => false);
    const existing = await SiteAsset.findOne({ key: asset.key }).lean();
    if (!existing || !existing.storageId) {
      addStaticPlan(asset, sourceExists ? 'available' : 'missing-source');
    }
  }

  const products = await Product.find({ images: { $exists: true, $ne: [] } }).lean();
  for (const product of products) {
    for (let index = 0; index < (product.images || []).length; index += 1) {
      const image = product.images[index];
      if (!image || image.startsWith('https://res.cloudinary.com/')) continue;
      const reference = cloudinaryReference(image);
      const asset = { collection: 'products', recordId: product.id || product._id.toString(), index, current: image, proposedStorageId: reference?.storageId || `reforgedx/products/${product.id || product._id}-${index + 1}` };
      planned.push({ ...asset, action: reference ? 'register-existing' : 'upload-source', access: 'public', updates: { image: reference ? image : '<verified Cloudinary secure_url>', storageId: asset.proposedStorageId, format: reference?.format || '<verified format>' } });
    }
  }

  const categories = await Category.find({ banner: { $type: 'string', $ne: '' } }).lean();
  for (const category of categories) {
    const reference = cloudinaryReference(category.banner);
    if (reference && category.bannerStorageId) continue;
    planned.push({
      collection: 'categories',
      recordId: category.id || category._id.toString(),
      current: category.banner,
      action: reference ? 'register-existing' : 'upload-source',
      access: 'public',
      updates: {
        banner: reference ? category.banner : '<verified Cloudinary secure_url>',
        bannerStorageId: reference?.storageId || `reforgedx/categories/${category.id || category._id}`,
        bannerStorageFormat: reference?.format || '<verified format>',
        bannerResourceType: 'image'
      }
    });
  }

  const users = await User.find({ profileImage: /^\/uploads\// });
  for (const user of users) {
    if (user.profileImageStorageId) continue;
    const file = path.join(uploadsRoot, 'profile-images', basename(user.profileImage));
    addPlan('users', user, {
      profileImage: '<Cloudinary secure_url>',
      profileImageStorageId: '<Cloudinary public_id>',
      profileImageStorageFormat: '<format>'
    }, file, 'public');
  }

  const reviews = await Review.find({ images: /^\/uploads\// });
  for (const review of reviews) {
    const missing = (review.images || []).some((image, index) => image.startsWith('/uploads/') && !review.imageStorageIds?.[index]);
    if (!missing) continue;
    const updates = [];
    for (let index = 0; index < (review.images || []).length; index += 1) {
      const image = review.images[index];
      if (!image.startsWith('/uploads/') || review.imageStorageIds?.[index]) continue;
      updates.push({
        index,
        image: '<Cloudinary secure_url>',
        storageId: '<Cloudinary public_id>',
        format: '<format>'
      });
    }
    for (const update of updates) {
      addPlan('reviews', review, update, path.join(uploadsRoot, 'review-images', basename(review.images[update.index])), 'public');
    }
  }

  const customOrders = await CustomOrder.find({
    $or: [{ imageFile: /^\/uploads\// }, { stlFile: /^\/uploads\// }]
  });
  for (const order of customOrders) {
    for (const kind of ['image', 'stl']) {
      const urlField = `${kind}File`;
      const idField = `${kind}StorageId`;
      const formatField = `${kind}StorageFormat`;
      if (!order[urlField]?.startsWith('/uploads/') || order[idField]) continue;
      const file = path.join(uploadsRoot, 'custom-orders', basename(order[urlField]));
      addPlan('customOrders', order, {
        [urlField]: '<Cloudinary authenticated URL placeholder>',
        [idField]: '<Cloudinary public_id>',
        [formatField]: '<format>'
      }, file, 'authenticated');
    }
  }

  const orders = await Order.find({ paymentScreenshot: /^\/api\/uploads\// });
  for (const order of orders) {
    if (order.paymentScreenshotStorageId) continue;
    const file = path.join(uploadsRoot, 'payment-proofs', basename(order.paymentScreenshot));
    addPlan('orders', order, {
      paymentScreenshot: '<Cloudinary authenticated URL placeholder>',
      paymentScreenshotStorageId: '<Cloudinary public_id>',
      paymentScreenshotStorageFormat: '<format>'
    }, file, 'authenticated');
  }
};

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await findRecords();
  console.log(JSON.stringify({ mode: approve ? 'approved' : 'dry-run', plannedUpdates: planned }, null, 2));
  if (!approve) {
    console.log('Dry run only. Re-run with --approve to upload and update MongoDB.');
    return;
  }

  const staticResults = {};
  for (const asset of staticAssets) {
    const result = await migrateStaticAsset(asset);
    staticResults[asset.key] = result;
    if (result.status === 'missing-source') {
      throw new Error(`Missing approved static source: ${asset.file || asset.sourceUrl}`);
    }
    await SiteAsset.findOneAndUpdate(
      { key: asset.key },
      {
        key: asset.key,
        kind: asset.kind,
        label: asset.label,
        url: result.url,
        storageId: result.publicId,
        format: result.format,
        resourceType: 'image',
        alt: asset.alt,
        source: asset.file || asset.sourceUrl
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  for (const item of planned) {
    if (item.collection === 'siteAssets') continue;
    if (item.collection === 'products' || item.collection === 'categories') {
      const result = item.action === 'register-existing'
        ? { secure_url: item.current, public_id: item.updates.storageId, format: item.updates.format, resource_type: 'image' }
        : await uploadPublicSource(item.current, item.collection, item.updates.storageId.split('/').pop());
      const model = item.collection === 'products' ? Product : Category;
      const record = await model.findOne({ id: item.recordId });
      if (!record) throw new Error(`Record disappeared during migration: ${item.collection}/${item.recordId}`);
      if (item.collection === 'products') {
        const assets = [...(record.imageAssets || [])];
        assets[item.index] = { url: result.secure_url, storageId: result.public_id, format: result.format, resourceType: result.resource_type || 'image' };
        record.images[item.index] = result.secure_url;
        record.imageAssets = assets;
      } else {
        record.banner = result.secure_url;
        record.bannerStorageId = result.public_id;
        record.bannerStorageFormat = result.format;
        record.bannerResourceType = result.resource_type || 'image';
      }
      await record.save();
      continue;
    }
    const file = item.file;
    const result = await secureUpload(file, item.access === 'authenticated' ? 'migrated-private' : 'migrated-public', item.access === 'authenticated' ? 'authenticated' : 'upload', item.collection === 'customOrders' && path.extname(file).toLowerCase() === '.stl' ? 'raw' : 'image');
    const record = await { users: User, reviews: Review, customOrders: CustomOrder, orders: Order }[item.collection].findOne({ id: item.recordId });
      if (!record) throw new Error(`Record disappeared during migration: ${item.collection}/${item.recordId}`);
      if (item.collection === 'users') {
        if (record.profileImageStorageId) continue;
        record.profileImageStorageId = result.public_id;
        record.profileImageStorageFormat = path.extname(file).slice(1).toLowerCase();
        record.profileImage = result.secure_url;
      } else if (item.collection === 'reviews') {
        if (record.imageStorageIds?.[item.updates.index]) continue;
        const ids = [...(record.imageStorageIds || [])];
        const formats = [...(record.imageStorageFormats || [])];
        ids[item.updates.index] = result.public_id;
        formats[item.updates.index] = path.extname(file).slice(1).toLowerCase();
        record.imageStorageIds = ids;
        record.imageStorageFormats = formats;
        record.images[item.updates.index] = result.secure_url;
      } else if (item.collection === 'customOrders') {
        const kind = record.imageFile && basename(record.imageFile) === basename(file) ? 'image' : 'stl';
        if (record[`${kind}StorageId`]) continue;
        record[`${kind}StorageId`] = result.public_id;
        record[`${kind}StorageFormat`] = path.extname(file).slice(1).toLowerCase();
      } else if (item.collection === 'orders') {
        if (record.paymentScreenshotStorageId) continue;
        record.paymentScreenshotStorageId = result.public_id;
        record.paymentScreenshotStorageFormat = path.extname(file).slice(1).toLowerCase();
      }
      await record.save();
  }
  console.log(JSON.stringify({ staticResults }, null, 2));
};

try {
  await migrate();
} finally {
  await mongoose.disconnect().catch(() => {});
}

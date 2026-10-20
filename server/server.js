import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';

import { connectDb } from './config/db.js';
import { seedData } from './data/seedData.js';
import { authenticateOptionalToken, authenticateToken, authorizeAdmin, getJwtSecret, verifyAdminCredentials } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { User, Product, Blog, Faq, CustomOrder, Order, Category, Review, SiteAsset } from './models/index.js';
import { validateCheckoutPayload } from './utils/validation.js';
import { buildTrustedOrder, isSupportedPaymentMethod, reserveStock } from './utils/order.js';
import { validateProductPricing } from './utils/productPricing.js';
import { idLookup } from './utils/mongo.js';
import { assertProductionStorage, isCloudinaryConfigured } from './utils/storage.js';
import { getConfiguredAdmin, provisionConfiguredAdmin } from './utils/adminBootstrap.js';
import { normalizeHistoryIds } from './utils/history.js';

dotenv.config();

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && !configuredOrigins?.length) {
  throw new Error('ALLOWED_ORIGINS is required in production.');
}
const allowedOrigins = configuredOrigins?.length ? configuredOrigins : ['http://localhost:5173'];
const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;
const trustedProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
}
app.set('trust proxy', trustedProxyHops);
const firebaseAdminCredential = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const credentialPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    return cert(JSON.parse(fs.readFileSync(credentialPath, 'utf8')));
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  return null;
};

let firebaseAdmin = null;
let firebaseAdminError = '';
try {
  const credential = firebaseAdminCredential();
  if (credential) {
    firebaseAdmin = getFirebaseAdminAuth(getApps().length ? getApps()[0] : initializeApp({ credential }));
  } else {
    firebaseAdminError = 'Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON, or GOOGLE_APPLICATION_CREDENTIALS on the backend.';
  }
} catch (error) {
  firebaseAdminError = `Firebase Admin configuration could not be loaded: ${error.message}`;
  console.error(firebaseAdminError);
}
const uploadDir = path.join(process.cwd(), 'server', 'uploads');
const privateUploadDir = path.join(uploadDir, 'custom-orders');
const profileUploadDir = path.join(uploadDir, 'profile-images');
const reviewUploadDir = path.join(uploadDir, 'review-images');
const paymentUploadDir = path.join(uploadDir, 'payment-proofs');
if (process.env.NODE_ENV !== 'production') {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(privateUploadDir)) fs.mkdirSync(privateUploadDir, { recursive: true });
  if (!fs.existsSync(profileUploadDir)) fs.mkdirSync(profileUploadDir, { recursive: true });
  if (!fs.existsSync(reviewUploadDir)) fs.mkdirSync(reviewUploadDir, { recursive: true });
  if (!fs.existsSync(paymentUploadDir)) fs.mkdirSync(paymentUploadDir, { recursive: true });
}

const cloudinaryEnabled = isCloudinaryConfigured();
assertProductionStorage();
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_EXT_PATTERN = /\.(jpg|jpeg|png|webp)$/i;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const imageFileFilter = (_req, file, cb) => {
  const isAllowedMime = IMAGE_MIME_TYPES.includes(file.mimetype);
  const isAllowedExt = IMAGE_EXT_PATTERN.test(file.originalname || '');
  if (isAllowedMime && isAllowedExt) {
    return cb(null, true);
  }
  cb(new Error('Only jpg, jpeg, png, and webp files are allowed'));
};

const customOrderFileFilter = (_req, file, cb) => {
  if (file.fieldname === 'imageFile') {
    return imageFileFilter(_req, file, cb);
  }
  if (file.fieldname === 'stlFile' && /\.stl$/i.test(file.originalname || '') && ['model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'application/octet-stream'].includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Custom orders accept only jpg, jpeg, png, webp, and STL files'));
};

const safeFilename = (originalname) => `${Date.now()}-${path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '-')}`;

const imageStorageFor = (destination) => process.env.NODE_ENV === 'production' ? multer.memoryStorage() : multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, destination),
  filename: (_req, file, cb) => cb(null, safeFilename(file.originalname))
});

const productUpload = multer({ storage: imageStorageFor(uploadDir), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 }, fileFilter: imageFileFilter });
const privateStorage = process.env.NODE_ENV === 'production' ? multer.memoryStorage() : multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, privateUploadDir),
  filename: (_req, file, cb) => cb(null, safeFilename(file.originalname))
});
const privateUpload = multer({
  storage: privateStorage,
  limits: { fileSize: 25 * 1024 * 1024, files: 2, fields: 30, parts: 32 },
  fileFilter: customOrderFileFilter
});
const profileUpload = multer({ storage: imageStorageFor(profileUploadDir), limits: { fileSize: MAX_IMAGE_BYTES }, fileFilter: imageFileFilter });
const reviewUpload = multer({ storage: imageStorageFor(reviewUploadDir), limits: { fileSize: MAX_IMAGE_BYTES }, fileFilter: imageFileFilter });
const paymentScreenshotUpload = multer({ storage: imageStorageFor(paymentUploadDir), limits: { fileSize: MAX_IMAGE_BYTES }, fileFilter: imageFileFilter });

const uploadCloudinaryAsset = async (file, folderName, resourceType = 'image', type = 'upload', publicId = '') => {
  const data = file.buffer || fs.readFileSync(file.path);
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `reforgedx/${folderName}`,
      public_id: publicId || undefined,
      resource_type: resourceType,
      type
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(data);
  });
  if (file.path) fs.unlink(file.path, () => {});
  return uploadResult;
};

const deleteCloudinaryAsset = async (storageId, resourceType) => {
  if (!cloudinaryEnabled || !storageId) return;
  try {
    await cloudinary.uploader.destroy(storageId, { resource_type: resourceType, type: 'authenticated' });
  } catch (error) {
    console.error(`Cloudinary cleanup failed for ${resourceType} asset: ${error.message}`);
  }
};

const uploadImageAsset = async (file, folderName, localUrlPathPrefix) => {
  if (!file) return { url: '', fileName: '', storageId: '', format: '', resourceType: 'image' };

  if (cloudinaryEnabled) {
    const uploadResult = await uploadCloudinaryAsset(file, folderName);
    return {
      url: uploadResult.secure_url,
      fileName: file.originalname,
      storageId: uploadResult.public_id,
      format: uploadResult.format || path.extname(file.originalname).slice(1).toLowerCase(),
      resourceType: uploadResult.resource_type || 'image'
    };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cloudinary is required for production image uploads.');
  }

  return {
    url: `${localUrlPathPrefix}/${file.filename}`,
    fileName: file.originalname,
    storageId: '',
    format: path.extname(file.originalname).slice(1).toLowerCase(),
    resourceType: 'image'
  };
};

const uploadPrivateAsset = async (file, folderName, localUrlPathPrefix, resourceType) => {
  if (!file) return null;
  const fileName = file.filename || safeFilename(file.originalname);
  if (cloudinaryEnabled) {
    const publicId = path.parse(fileName).name;
    const uploadResult = await uploadCloudinaryAsset(file, folderName, resourceType, 'authenticated', publicId);
    return {
      url: `${localUrlPathPrefix}/${fileName}`,
      storageId: uploadResult.public_id,
      format: path.extname(file.originalname).slice(1).toLowerCase(),
      resourceType,
      fileName: file.originalname
    };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cloudinary is required for production file uploads.');
  }
  return { url: `${localUrlPathPrefix}/${fileName}`, storageId: '', format: '', resourceType, fileName: file.originalname };
};

const resolvePublicUrl = (req, value) => {
  if (!value) return '';
  if (value.startsWith('http')) {
    try {
      const parsedUrl = new URL(value);
      if (!parsedUrl.pathname.startsWith('/uploads/')) return value;
      return `${req.protocol}://${req.get('host')}${parsedUrl.pathname}`;
    } catch {
      return value;
    }
  }
  return `${req.protocol}://${req.get('host')}${value}`;
};

const serializeUser = (req, user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
  profileImage: resolvePublicUrl(req, user.profileImage),
  favourites: user.favourites || []
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use('/api', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many requests. Please try again later.',
  skip: (req) => req.path.startsWith('/auth')
}));
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.'
});
app.use('/uploads', (req, res, next) => {
  if (req.path.startsWith('/custom-orders/') || req.path.startsWith('/payment-proofs/')) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
}, express.static(uploadDir));
app.use(express.json());

const dbConnected = await connectDb();
const useDb = Boolean(dbConnected);

const users = [];

const categories = [...seedData.categories];
const products = [...seedData.products];
const blogs = [...seedData.blogs];
const faqs = [...seedData.faqs];
const customOrders = [...seedData.customOrders];
const orders = [...seedData.orders];
const reviews = [];

const provisionInMemoryAdmin = async () => {
  const configuredAdmin = getConfiguredAdmin();
  if (!configuredAdmin) return;
  const existing = users.find((user) => user.email === configuredAdmin.email);
  if (existing) {
    if (existing.role !== 'admin') {
      const configuredPasswordMatches = await bcrypt.compare(configuredAdmin.password, existing.password || '');
      if (configuredPasswordMatches || process.env.ADMIN_BOOTSTRAP === 'true') {
        existing.password = configuredPasswordMatches ? existing.password : bcrypt.hashSync(configuredAdmin.password, 10);
        existing.role = 'admin';
        return;
      }
      throw new Error('ADMIN_EMAIL belongs to a non-admin user. Set ADMIN_BOOTSTRAP=true for one startup to promote this exact account.');
    }
    return;
  }
  users.push({
    id: `admin-${Date.now()}`,
    name: 'Administrator',
    email: configuredAdmin.email,
    password: bcrypt.hashSync(configuredAdmin.password, 10),
    role: 'admin'
  });
};

if (useDb) {
  const seedDatabase = async () => {
    await provisionConfiguredAdmin(User);

    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      await Category.create(categories);
    }

    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.create(products);
    }

    const blogCount = await Blog.countDocuments();
    if (blogCount === 0) {
      await Blog.create(blogs);
    }

    const faqCount = await Faq.countDocuments();
    if (faqCount === 0) {
      await Faq.create(faqs);
    }
  };
  await seedDatabase();
} else {
  await provisionInMemoryAdmin();
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'ReforgedX API is live' });
});

app.get('/api/site-assets', async (_req, res) => {
  if (useDb) {
    return res.json(await SiteAsset.find().select('-__v').lean());
  }
  res.json([]);
});

app.get('/api/categories', async (_req, res) => {
  if (useDb) {
    const dbCategories = await Category.find();
    return res.json(dbCategories);
  }
  res.json(categories);
});

app.get('/api/products', async (req, res) => {
  const { category, q, sort } = req.query;
  let filtered = useDb ? await Product.find().lean() : [...products];

  if (category) {
    filtered = filtered.filter((item) => item.category === category);
  }

  if (q) {
    const term = q.toLowerCase();
    filtered = filtered.filter((item) =>
      item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
    );
  }

  if (sort === 'price') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === 'popularity') {
    filtered.sort((a, b) => b.popularity - a.popularity || String(b.id).localeCompare(String(a.id)));
  } else if (sort === 'newest') {
    filtered.sort((a, b) => b._id?.toString().localeCompare(a._id?.toString()) || b.id.localeCompare(a.id));
  }

  res.json(filtered.map((product) => ({ ...product, featured: product.featured === true })));
});

app.get('/api/products/:id', async (req, res) => {
  if (useDb) {
    const product = await Product.findOne(idLookup(req.params.id)).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json({ ...product, featured: product.featured === true });
  }

  const product = products.find((item) => item.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json({ ...product, featured: product.featured === true });
});

app.get('/api/products/:id/reviews', async (req, res) => {
  const productId = req.params.id;
  if (useDb) {
    const list = await Review.find({ productId, status: 'Approved' }).sort({ reviewedAt: -1 }).lean();
    const totalReviews = list.length;
    const averageRating = totalReviews ? Number((list.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews).toFixed(2)) : 0;
    return res.json({ reviews: list, averageRating, totalReviews });
  }
  const list = reviews.filter((item) => item.productId === productId && item.status === 'Approved');
  const totalReviews = list.length;
  const averageRating = totalReviews ? Number((list.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews).toFixed(2)) : 0;
  return res.json({ reviews: list, averageRating, totalReviews });
});

app.get('/api/reviews/approved', async (_req, res) => {
  if (useDb) {
    const approvedReviews = await Review.find({ status: 'Approved' }).sort({ reviewedAt: -1 }).limit(3).lean();
    return res.json(approvedReviews);
  }
  res.json(reviews.filter((review) => review.status === 'Approved').slice(0, 3));
});

app.get('/api/admin/products', authenticateToken, authorizeAdmin, async (_req, res) => {
  if (useDb) {
    const dbProducts = await Product.find().lean();
    return res.json(dbProducts.map((product) => ({ ...product, featured: product.featured === true })));
  }
  res.json(products.map((product) => ({ ...product, featured: product.featured === true })));
});

app.post('/api/admin/products/upload-image', authenticateToken, authorizeAdmin, productUpload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  const uploaded = await uploadImageAsset(req.file, 'product-images', '/uploads');
  res.json({
    imageUrl: resolvePublicUrl(req, uploaded.url),
    fileName: uploaded.fileName,
    storageId: uploaded.storageId,
    format: uploaded.format,
    resourceType: uploaded.resourceType
  });
});

app.post('/api/admin/products', authenticateToken, authorizeAdmin, async (req, res) => {
  const { name, category, price, discount, colors, dimensions, stock, popularity, images, imageAssets, description, reviews, featured } = req.body;
  const normalizedColors = Array.isArray(colors) ? colors : (typeof colors === 'string' ? colors.split(',').map((color) => color.trim()).filter(Boolean) : []);
  const normalizedImages = Array.isArray(images) ? images : (typeof images === 'string' ? images.split(',').map((item) => item.trim()).filter(Boolean) : []);
  const normalizedImageAssets = Array.isArray(imageAssets)
    ? imageAssets.filter((asset) => asset && typeof asset.url === 'string' && normalizedImages.includes(asset.url)).map((asset) => ({
      url: asset.url,
      storageId: typeof asset.storageId === 'string' ? asset.storageId : '',
      format: typeof asset.format === 'string' ? asset.format : '',
      resourceType: typeof asset.resourceType === 'string' ? asset.resourceType : 'image'
    }))
    : [];
  const numericStock = Number(stock) || 0;
  const payload = {
    id: `prod-${Date.now()}`,
    productId: `PRD-${Date.now().toString().slice(-6)}`,
    sku: `SKU-${Date.now().toString().slice(-6)}`,
    name,
    category,
    price: Number(price) || 0,
    discount: Number(discount) || 0,
    colors: normalizedColors,
    dimensions,
    stock: numericStock,
    popularity: Number(popularity) || 0,
    featured: Boolean(featured),
    images: normalizedImages,
    imageAssets: normalizedImageAssets,
    description,
    reviews: Number(reviews) || 0,
    status: numericStock > 0 ? (numericStock < 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock'
  };
  if (useDb) {
    const created = await Product.create(payload);
    return res.status(201).json(created);
  }
  products.unshift(payload);
  res.status(201).json(payload);
});

app.patch('/api/admin/products/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const allowedFields = ['name', 'category', 'colors', 'dimensions', 'stock', 'popularity', 'images', 'imageAssets', 'description', 'reviews', 'featured', 'status'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
  if (Object.prototype.hasOwnProperty.call(updates, 'featured') && typeof updates.featured !== 'boolean') {
    return res.status(400).json({ message: 'Featured status must be a boolean.' });
  }
  const pricing = validateProductPricing(req.body);
  if (Object.keys(pricing.errors).length > 0) {
    return res.status(400).json({ message: Object.values(pricing.errors).join(' ') });
  }
  Object.assign(updates, pricing.updates);
  if (typeof updates.stock === 'number') {
    updates.status = updates.stock > 0 ? (updates.stock < 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock';
  }
  if (useDb) {
    const product = await Product.findOneAndUpdate({ id: req.params.id }, updates, { new: true, runValidators: true }).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(product);
  }
  const product = products.find((item) => item.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  Object.assign(product, updates);
  res.json(product);
});

app.delete('/api/admin/products/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  if (useDb) {
    const deleted = await Product.findOneAndDelete({ id: req.params.id }).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json(deleted);
  }
  const index = products.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const deleted = products.splice(index, 1)[0];
  res.json(deleted);
});

app.get('/api/blogs', async (req, res) => {
  const { q } = req.query;
  let results = useDb ? await Blog.find().lean() : [...blogs];
  if (q) {
    const term = q.toLowerCase();
    results = results.filter((item) => item.title.toLowerCase().includes(term) || item.category.toLowerCase().includes(term));
  }
  res.json(results);
});

app.get('/api/faqs', async (_req, res) => {
  if (useDb) {
    const dbFaqs = await Faq.find().lean();
    return res.json(dbFaqs);
  }
  res.json(faqs);
});

app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  if (useDb) {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
  } else if (users.some((user) => user.email === email)) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userData = {
    id: `user-${Date.now()}`,
    name,
    email,
    password: hashedPassword,
    role: 'customer',
    phone: phone || '',
    address: address || ''
  };

  let user;
  if (useDb) {
    user = await User.create(userData);
  } else {
    users.push(userData);
    user = userData;
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.status(201).json({ token, user: serializeUser(req, user) });
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = useDb ? await User.findOne({ email }) : users.find((entry) => entry.email === email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token, user: serializeUser(req, user) });
});

app.post('/api/auth/admin-login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = useDb ? await User.findOne({ email: normalizedEmail }) : users.find((entry) => entry.email === normalizedEmail);

  if (!(await verifyAdminCredentials(user, password))) {
    return res.status(401).json({ message: 'Invalid administrator credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token, user: serializeUser(req, user) });
});

app.post('/api/auth/firebase', authRateLimiter, async (req, res) => {
  if (!firebaseAdmin) {
    return res.status(503).json({ message: firebaseAdminError || 'Firebase server authentication is not configured' });
  }

  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ message: 'Firebase ID token is required' });
  }

  try {
    const verified = await firebaseAdmin.verifyIdToken(idToken);
    const email = verified.email || `${verified.uid}@firebase.local`;
    const name = verified.name || verified.email?.split('@')[0] || 'Customer';
    const profileImage = verified.picture || '';
    const phone = verified.phone_number || '';
    const provider = verified.firebase?.sign_in_provider || 'firebase';
    let user;

    if (useDb) {
      user = await User.findOne({ $or: [{ firebaseUid: verified.uid }, { email }] });
      if (user?.role === 'admin') {
        return res.status(403).json({ message: 'Admin accounts must use administrator login' });
      }
      if (!user) {
        user = await User.create({ id: `user-${Date.now()}`, firebaseUid: verified.uid, name, email, phone, profileImage, authProvider: provider, role: 'customer' });
      } else {
        user.firebaseUid = verified.uid;
        user.name = name;
        user.phone = phone || user.phone;
        user.profileImage = profileImage || user.profileImage;
        user.authProvider = provider;
        await user.save();
      }
    } else {
      user = users.find((entry) => entry.firebaseUid === verified.uid || entry.email === email);
      if (user?.role === 'admin') {
        return res.status(403).json({ message: 'Admin accounts must use administrator login' });
      }
      if (!user) {
        user = { id: `user-${Date.now()}`, firebaseUid: verified.uid, name, email, password: '', phone, profileImage, authProvider: provider, role: 'customer' };
        users.push(user);
      } else {
        Object.assign(user, { firebaseUid: verified.uid, name, phone: phone || user.phone, profileImage: profileImage || user.profileImage, authProvider: provider });
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: 'customer' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, user: serializeUser(req, user) });
  } catch {
    res.status(401).json({ message: 'Invalid Firebase authentication token' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = useDb ? await User.findOne({ id: req.user.id }) : users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user: serializeUser(req, user) });
});

app.patch('/api/auth/profile', authenticateToken, async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();
  const errors = validateCheckoutPayload({ customerName: 'Profile', phone, address });
  delete errors.customerName;
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Please enter a valid phone number and address.', errors });
  }

  if (useDb) {
    const updatedUser = await User.findOneAndUpdate(
      { id: req.user.id },
      { phone, address },
      { new: true, runValidators: true }
    ).lean();
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: serializeUser(req, updatedUser) });
  }

  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  user.phone = phone;
  user.address = address;
  return res.json({ user: serializeUser(req, user) });
});

app.patch('/api/auth/profile-image', authenticateToken, profileUpload.single('profileImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Profile image file is required' });
  }

  const uploaded = await uploadImageAsset(req.file, 'profile-images', '/uploads/profile-images');
  const profileImageUrl = resolvePublicUrl(req, uploaded.url);

  if (useDb) {
    const updatedUser = await User.findOneAndUpdate(
      { id: req.user.id },
      {
        profileImage: profileImageUrl,
        profileImageName: uploaded.fileName,
        profileImageStorageId: uploaded.storageId,
        profileImageStorageFormat: uploaded.format
      },
      { new: true }
    ).lean();
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: serializeUser(req, updatedUser) });
  }

  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  user.profileImage = profileImageUrl;
  user.profileImageName = uploaded.fileName;
  return res.json({ user: serializeUser(req, user) });
});

app.delete('/api/auth/profile-image', authenticateToken, async (req, res) => {
  if (useDb) {
    const updatedUser = await User.findOneAndUpdate({ id: req.user.id }, { profileImage: '', profileImageName: '' }, { new: true }).lean();
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: serializeUser(req, updatedUser) });
  }

  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  user.profileImage = '';
  user.profileImageName = '';
  return res.json({ user: serializeUser(req, user) });
});

app.get('/api/favourites', authenticateToken, async (req, res) => {
  if (useDb) {
    const user = await User.findOne({ id: req.user.id }).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const favouriteIds = user.favourites || [];
    const favouriteProducts = await Product.find({ id: { $in: favouriteIds } }).lean();
    const ordered = favouriteIds.map((id) => favouriteProducts.find((product) => product.id === id)).filter(Boolean);
    return res.json({ favourites: favouriteIds, products: ordered });
  }

  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const favouriteIds = user.favourites || [];
  const favouriteProducts = products.filter((product) => favouriteIds.includes(product.id));
  return res.json({ favourites: favouriteIds, products: favouriteProducts });
});

app.post('/api/favourites/:productId', authenticateToken, async (req, res) => {
  const productId = req.params.productId;
  const productExists = useDb ? await Product.findOne({ id: productId }).lean() : products.some((product) => product.id === productId);
  if (!productExists) {
    return res.status(404).json({ message: 'Product not found' });
  }

  if (useDb) {
    const user = await User.findOne({ id: req.user.id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const current = new Set(user.favourites || []);
    let saved = false;
    if (current.has(productId)) {
      current.delete(productId);
      saved = false;
    } else {
      current.add(productId);
      saved = true;
    }
    user.favourites = Array.from(current);
    await user.save();
    return res.json({ saved, favourites: user.favourites });
  }

  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const current = new Set(user.favourites || []);
  let saved = false;
  if (current.has(productId)) {
    current.delete(productId);
    saved = false;
  } else {
    current.add(productId);
    saved = true;
  }
  user.favourites = Array.from(current);
  return res.json({ saved, favourites: user.favourites });
});

app.post('/api/custom-orders', authenticateOptionalToken, privateUpload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'stlFile', maxCount: 1 }]), async (req, res) => {
  const { name, email, description, quantity, colors, category, notes, selectedColor } = req.body;
  const imageFile = req.files?.imageFile?.[0];
  const stlFile = req.files?.stlFile?.[0];
  const municipality = req.body.municipality || req.body.city || '';
  const tole = req.body.tole || req.body.streetAddress || '';
  let imageAsset;
  let stlAsset;
  try {
    imageAsset = await uploadPrivateAsset(imageFile, 'custom-orders', '/api/uploads/custom-orders', 'image');
    stlAsset = await uploadPrivateAsset(stlFile, 'custom-orders', '/api/uploads/custom-orders', 'raw');
    const customerRecord = useDb && req.user ? await User.findOne({ id: req.user.id }).select('_id').lean() : null;
    const payload = {
    id: `custom-${Date.now()}`,
    customer: customerRecord?._id || (useDb ? undefined : req.user?.id),
    customerName: name,
    name,
    email,
    phone: req.body.phone || '',
    address: req.body.address || '',
    country: req.body.country || 'Nepal',
    province: req.body.province || '',
    district: req.body.district || '',
    municipality,
    city: municipality,
    streetAddress: tole,
    tole,
    postalCode: req.body.postalCode || '',
    description,
    quantity: Number(quantity),
    colors: colors ? colors.split(',').map((color) => color.trim()) : [],
    category,
    selectedColor: selectedColor || colors || '',
    notes: notes || '',
    imageFile: imageAsset?.url || '',
    imageStorageId: imageAsset?.storageId || '',
    imageStorageFormat: imageAsset?.format || '',
    stlFile: stlAsset?.url || '',
    stlStorageId: stlAsset?.storageId || '',
    stlStorageFormat: stlAsset?.format || '',
    imageFileName: imageFile?.originalname || '',
    stlFileName: stlFile?.originalname || '',
    status: 'Pending',
    estimatedDelivery: req.body.estimatedDelivery || '3-5 business days',
    orderType: 'Custom Order',
    orderDate: new Date()
    };
    if (useDb) {
      const created = await CustomOrder.create(payload);
      return res.status(201).json(created);
    }
    customOrders.unshift(payload);
    return res.status(201).json(payload);
  } catch (error) {
    await Promise.all([
      deleteCloudinaryAsset(imageAsset?.storageId, imageAsset?.resourceType),
      deleteCloudinaryAsset(stlAsset?.storageId, stlAsset?.resourceType)
    ]);
    throw error;
  }
});

app.get('/api/custom-orders', authenticateToken, async (req, res) => {
  if (useDb) {
    const userRecord = req.user.role === 'admin' ? null : await User.findOne({ id: req.user.id }).select('_id').lean();
    const dbOrders = await CustomOrder.find().populate('customer', 'name email phone address').lean();
    if (req.user.role === 'admin') {
      return res.json(dbOrders);
    }
    return res.json(dbOrders.filter((order) => order.customer?._id?.toString() === userRecord?._id?.toString() && !order.hiddenFromCustomer));
  }
  if (req.user.role === 'admin') return res.json(customOrders);
  res.json(customOrders.filter((order) => order.customer === req.user.id && !order.hiddenFromCustomer));
});

app.post('/api/orders/history/delete', authenticateToken, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'Administrators cannot use customer history deletion' });
  }

  const normalizedIds = normalizeHistoryIds(req.body?.orderIds);
  if (normalizedIds.error) {
    return res.status(400).json({ message: normalizedIds.error });
  }
  const requestedIds = normalizedIds.ids;

  const archivedIds = [];
  const failedIds = [];
  let userRecord = null;
  if (useDb) {
    userRecord = await User.findOne({ id: req.user.id }).select('_id').lean();
  }

  for (const orderId of requestedIds) {
    let archived = false;
    if (useDb) {
      const normalResult = await Order.updateOne(
        { ...idLookup(orderId), userId: req.user.id, hiddenFromCustomer: { $ne: true } },
        { $set: { hiddenFromCustomer: true, customerHistoryHiddenAt: new Date() } }
      );
      archived = normalResult.modifiedCount === 1;
      if (!archived && userRecord) {
        const customResult = await CustomOrder.updateOne(
          { ...idLookup(orderId), customer: userRecord._id, hiddenFromCustomer: { $ne: true } },
          { $set: { hiddenFromCustomer: true, customerHistoryHiddenAt: new Date() } }
        );
        archived = customResult.modifiedCount === 1;
      }
    } else {
      const normalOrder = orders.find((order) => (order.id === orderId || order._id?.toString() === orderId) && order.userId === req.user.id && !order.hiddenFromCustomer);
      const customOrder = customOrders.find((order) => (order.id === orderId || order._id?.toString() === orderId) && order.customer === req.user.id && !order.hiddenFromCustomer);
      const order = normalOrder || customOrder;
      if (order) {
        order.hiddenFromCustomer = true;
        order.customerHistoryHiddenAt = new Date();
        archived = true;
      }
    }
    (archived ? archivedIds : failedIds).push(orderId);
  }

  res.json({ archivedIds, failedIds });
});

app.delete('/api/custom-orders/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const lookupId = req.params.id;
  if (useDb) {
    const deleted = await CustomOrder.findOneAndDelete(idLookup(lookupId)).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Custom order not found' });
    }
    return res.json(deleted);
  }
  const index = customOrders.findIndex((item) => item.id === lookupId || item._id?.toString() === lookupId);
  if (index === -1) {
    return res.status(404).json({ message: 'Custom order not found' });
  }
  const deleted = customOrders.splice(index, 1)[0];
  res.json(deleted);
});

app.get('/api/uploads/custom-orders/:filename', authenticateToken, authorizeAdmin, async (req, res) => {
  const filename = path.basename(req.params.filename);
  const assetPath = `/api/uploads/custom-orders/${filename}`;
  const storedOrder = useDb
    ? await CustomOrder.findOne({ $or: [{ imageFile: assetPath }, { stlFile: assetPath }] }).lean()
    : customOrders.find((order) => order.imageFile === assetPath || order.stlFile === assetPath);
  const isStl = storedOrder?.stlFile === assetPath;
  const storageId = isStl ? storedOrder?.stlStorageId : storedOrder?.imageStorageId;
  if (cloudinaryEnabled && storageId) {
    const format = isStl ? storedOrder.stlStorageFormat : storedOrder.imageStorageFormat;
    const signedUrl = cloudinary.utils.private_download_url(storageId, format, {
      resource_type: isStl ? 'raw' : 'image',
      type: 'authenticated',
      attachment: false
    });
    return res.redirect(signedUrl);
  }
  const filePath = path.join(privateUploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  return res.sendFile(filePath);
});

app.patch('/api/custom-orders/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
  if (useDb) {
    const order = await CustomOrder.findOneAndUpdate({ id: req.params.id }, { status: req.body.status }, { new: true, runValidators: true }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Custom order not found' });
    }
    return res.json(order);
  }
  const order = customOrders.find((item) => item.id === req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Custom order not found' });
  }
  order.status = req.body.status;
  res.json(order);
});

app.delete('/api/orders/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const lookupId = req.params.id;
  if (useDb) {
    const deleted = await Order.findOneAndDelete(idLookup(lookupId)).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Order not found' });
    }
    return res.json(deleted);
  }
  const index = orders.findIndex((item) => item.id === lookupId || item._id?.toString() === lookupId);
  if (index === -1) {
    return res.status(404).json({ message: 'Order not found' });
  }
  const deleted = orders.splice(index, 1)[0];
  res.json(deleted);
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  const userRecord = useDb ? await User.findOne({ id: req.user.id }).lean() : users.find((user) => user.id === req.user.id);
  if (!userRecord) {
    return res.status(401).json({ message: 'Authenticated user no longer exists.' });
  }

  const validationErrors = validateCheckoutPayload({
    ...req.body,
    phone: req.body.phone || userRecord.phone,
    address: req.body.address || userRecord.address
  });
  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({ message: 'Please complete the required shipping details.', errors: validationErrors });
  }

  const requestedPaymentMethod = req.body.paymentMethod || 'Cash On Delivery';
  if (requestedPaymentMethod === 'FonePay') {
    return res.status(400).json({ message: 'This payment method is coming soon.' });
  }
  if (requestedPaymentMethod === 'Bank Transfer') {
    return res.status(400).json({ message: 'Bank Transfer will be available soon.' });
  }
  if (!isSupportedPaymentMethod(requestedPaymentMethod)) {
    return res.status(400).json({ message: 'Unsupported payment method' });
  }

  const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
  const catalog = useDb
    ? await Product.find({ id: { $in: requestedItems.map((item) => String(item?.id || '').trim()).filter(Boolean) } }).lean()
    : products;
  const trustedOrder = buildTrustedOrder(requestedItems, catalog);
  if (trustedOrder.error) {
    return res.status(400).json({ message: trustedOrder.error });
  }

  const stockReservation = await reserveStock(trustedOrder.items, { useDb, products, Product });
  if (stockReservation.error) {
    return res.status(409).json({ message: stockReservation.error });
  }

  const isCod = requestedPaymentMethod === 'Cash On Delivery';
  const paymentStatus = isCod ? 'Cash On Delivery Pending' : (req.body.paymentStatus || 'Pending');
  const payload = {
    id: `order-${Date.now()}`,
    customer: userRecord?._id || undefined,
    userId: req.user.id,
    items: trustedOrder.items,
    subtotal: trustedOrder.subtotal,
    discount: trustedOrder.discount,
    discountAmount: trustedOrder.discountAmount,
    total: trustedOrder.total,
    status: 'Pending',
    paymentStatus,
    amountPaid: 0,
    remainingAmount: trustedOrder.total,
    paymentScreenshot: '',
    paymentScreenshotName: '',
    estimatedDelivery: '3-5 business days',
    customerName: req.body.customerName || req.body.name || userRecord?.name || req.body.address?.split(',')[0] || '',
    email: req.body.email || userRecord?.email || '',
    phone: req.body.phone || userRecord?.phone || '',
    address: req.body.address || userRecord?.address || '',
    paymentMethod: requestedPaymentMethod,
    orderDate: new Date(),
    orderId: `order-${Date.now()}`
  };

  try {
    if (useDb) {
      const created = await Order.create(payload);
      return res.status(201).json(created);
    }
    orders.unshift(payload);
    return res.status(201).json(payload);
  } catch (error) {
    await stockReservation.release();
    throw error;
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  if (useDb) {
    const dbOrders = await Order.find().populate('customer', 'name email phone address').lean();
    if (req.user.role === 'admin') {
      return res.json(dbOrders);
    }
    const userOrders = dbOrders.filter((order) => order.userId === req.user.id && !order.hiddenFromCustomer);
    return res.json(userOrders);
  }

  if (req.user.role === 'admin') {
    return res.json(orders);
  }
  const userOrders = orders.filter((order) => order.userId === req.user.id && !order.hiddenFromCustomer);
  res.json(userOrders);
});

app.patch('/api/orders/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
  if (useDb) {
    const order = await Order.findOneAndUpdate({ id: req.params.id }, { status: req.body.status }, { new: true, runValidators: true }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    return res.json(order);
  }
  const order = orders.find((item) => item.id === req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  order.status = req.body.status;
  res.json(order);
});

app.post('/api/orders/:id/payment-screenshot', authenticateToken, paymentScreenshotUpload.single('paymentScreenshot'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Payment screenshot is required' });
  }

  const lookupId = req.params.id;
  if (useDb) {
    const order = await Order.findOne(idLookup(lookupId));
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (order.paymentMethod !== 'eSewa') {
      return res.status(400).json({ message: 'Payment screenshot is only required for eSewa payments' });
    }

    const previousStorageId = order.paymentScreenshotStorageId;
    const screenshotAsset = await uploadPrivateAsset(req.file, 'payment-proofs', '/api/uploads/payments', 'image');
    try {
      order.paymentScreenshot = screenshotAsset.url;
      order.paymentScreenshotStorageId = screenshotAsset.storageId;
      order.paymentScreenshotStorageFormat = screenshotAsset.format;
      order.paymentScreenshotName = req.file.originalname;
      await order.save();
    } catch (error) {
      await deleteCloudinaryAsset(screenshotAsset.storageId, screenshotAsset.resourceType);
      throw error;
    }
    if (previousStorageId && previousStorageId !== screenshotAsset.storageId) {
      await deleteCloudinaryAsset(previousStorageId, 'image');
    }
    return res.json(order.toObject());
  }

  const order = orders.find((item) => item.id === lookupId || item._id?.toString() === lookupId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  if (order.userId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (order.paymentMethod !== 'eSewa') {
    return res.status(400).json({ message: 'Payment screenshot is only required for eSewa payments' });
  }
  const previousStorageId = order.paymentScreenshotStorageId;
  const screenshotAsset = await uploadPrivateAsset(req.file, 'payment-proofs', '/api/uploads/payments', 'image');
  order.paymentScreenshot = screenshotAsset.url;
  order.paymentScreenshotStorageId = screenshotAsset.storageId;
  order.paymentScreenshotStorageFormat = screenshotAsset.format;
  order.paymentScreenshotName = req.file.originalname;
  if (previousStorageId && previousStorageId !== screenshotAsset.storageId) {
    await deleteCloudinaryAsset(previousStorageId, 'image');
  }
  return res.json(order);
});

app.get('/api/uploads/payments/:filename', authenticateToken, async (req, res) => {
  const filename = path.basename(req.params.filename);
  const assetPath = `/api/uploads/payments/${filename}`;
  let authorizedOrder = null;
  if (useDb) {
    authorizedOrder = await Order.findOne(req.user.role === 'admin' ? { paymentScreenshot: assetPath } : { userId: req.user.id, paymentScreenshot: assetPath }).lean();
  } else {
    authorizedOrder = orders.find((order) => order.paymentScreenshot === assetPath && (req.user.role === 'admin' || order.userId === req.user.id));
  }

  if (authorizedOrder && cloudinaryEnabled && authorizedOrder.paymentScreenshotStorageId) {
    const signedUrl = cloudinary.utils.private_download_url(
      authorizedOrder.paymentScreenshotStorageId,
      authorizedOrder.paymentScreenshotStorageFormat,
      { resource_type: 'image', type: 'authenticated', attachment: false }
    );
    return res.redirect(signedUrl);
  }

  const filePath = path.join(paymentUploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  const canAccess = Boolean(authorizedOrder);

  if (!canAccess) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  return res.sendFile(filePath);
});

app.patch('/api/orders/:id/payment-status', authenticateToken, authorizeAdmin, async (req, res) => {
  const { status, reason } = req.body;
  const lookupId = req.params.id;
  const allowed = ['Completed', 'Pending', 'Rejected', 'Cash On Delivery Pending'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid payment status' });
  }

  if (useDb) {
    const order = await Order.findOne(idLookup(lookupId));
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.paymentStatus = status;
    order.paymentRejectReason = status === 'Rejected' ? (reason || 'Rejected by admin') : '';
    if (status === 'Completed') {
      order.amountPaid = Number(order.total || 0);
      order.remainingAmount = 0;
      order.paymentApprovedAt = new Date();
      order.paymentApprovedBy = req.user.id;
    } else {
      order.amountPaid = 0;
      order.remainingAmount = Number(order.total || 0);
    }
    await order.save();
    return res.json(order.toObject());
  }

  const order = orders.find((item) => item.id === lookupId || item._id?.toString() === lookupId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  order.paymentStatus = status;
  order.paymentRejectReason = status === 'Rejected' ? (reason || 'Rejected by admin') : '';
  if (status === 'Completed') {
    order.amountPaid = Number(order.total || 0);
    order.remainingAmount = 0;
    order.paymentApprovedAt = new Date();
    order.paymentApprovedBy = req.user.id;
  } else {
    order.amountPaid = 0;
    order.remainingAmount = Number(order.total || 0);
  }
  return res.json(order);
});

app.post('/api/reviews', authenticateToken, reviewUpload.array('reviewImages', 4), async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'Only customers can submit reviews' });
  }

  const { productId, orderId, rating, title, description } = req.body;
  const numericRating = Number(rating);
  if (!productId || !orderId || Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Invalid review payload' });
  }

  const ownedDeliveredOrder = useDb
    ? await Order.findOne({ ...idLookup(orderId), userId: req.user.id, status: 'Delivered' }).lean()
    : orders.find((order) => (order.id === orderId || order._id?.toString() === orderId) && order.userId === req.user.id && order.status === 'Delivered');

  if (!ownedDeliveredOrder) {
    return res.status(403).json({ message: 'You can only review delivered orders that belong to you' });
  }

  if (useDb) {
    const existing = await Review.findOne({ userId: req.user.id, productId, orderId }).lean();
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this order item. Edit your existing review instead.', reviewId: existing.id || existing._id?.toString() });
    }

    const user = await User.findOne({ id: req.user.id }).lean();
    const uploadedImages = await Promise.all((req.files || []).map((file) => uploadImageAsset(file, 'review-images', '/uploads/review-images')));
    const review = await Review.create({
      id: `review-${Date.now()}`,
      productId,
      orderId,
      userId: req.user.id,
      customerName: user?.name || req.user.email,
      customerProfileImage: user?.profileImage || '',
      rating: numericRating,
      title: String(title || '').trim(),
      description: String(description || '').trim(),
      images: uploadedImages.map((entry) => entry.url),
      imageStorageIds: uploadedImages.map((entry) => entry.storageId),
      imageStorageFormats: uploadedImages.map((entry) => entry.format),
      imageNames: uploadedImages.map((entry) => entry.fileName),
      status: 'Pending',
      reviewedAt: new Date()
    });
    return res.status(201).json(review.toObject());
  }

  const existing = reviews.find((item) => item.userId === req.user.id && item.productId === productId && item.orderId === orderId);
  if (existing) {
    return res.status(409).json({ message: 'You have already reviewed this order item. Edit your existing review instead.', reviewId: existing.id });
  }
  const user = users.find((entry) => entry.id === req.user.id);
  const uploadedImages = await Promise.all((req.files || []).map((file) => uploadImageAsset(file, 'review-images', '/uploads/review-images')));
  const review = {
    id: `review-${Date.now()}`,
    productId,
    orderId,
    userId: req.user.id,
    customerName: user?.name || req.user.email,
    customerProfileImage: user?.profileImage || '',
    rating: numericRating,
    title: String(title || '').trim(),
    description: String(description || '').trim(),
    images: uploadedImages.map((entry) => entry.url),
    imageStorageIds: uploadedImages.map((entry) => entry.storageId),
    imageStorageFormats: uploadedImages.map((entry) => entry.format),
    imageNames: uploadedImages.map((entry) => entry.fileName),
    status: 'Pending',
    reviewedAt: new Date()
  };
  reviews.unshift(review);
  return res.status(201).json(review);
});

app.patch('/api/reviews/:id', authenticateToken, reviewUpload.array('reviewImages', 4), async (req, res) => {
  const lookupId = req.params.id;
  const { rating, title, description } = req.body;

  if (useDb) {
    const review = await Review.findOne(idLookup(lookupId));
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (review.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (rating !== undefined) {
      const parsed = Number(rating);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = parsed;
    }
    if (title !== undefined) review.title = String(title || '').trim();
    if (description !== undefined) review.description = String(description || '').trim();
    if ((req.files || []).length > 0) {
      const uploadedImages = await Promise.all((req.files || []).map((file) => uploadImageAsset(file, 'review-images', '/uploads/review-images')));
      review.images = uploadedImages.map((entry) => entry.url);
      review.imageStorageIds = uploadedImages.map((entry) => entry.storageId);
      review.imageStorageFormats = uploadedImages.map((entry) => entry.format);
      review.imageNames = uploadedImages.map((entry) => entry.fileName);
    }
    review.status = 'Pending';
    review.editedAt = new Date();
    await review.save();
    return res.json(review.toObject());
  }

  const review = reviews.find((item) => item.id === lookupId || item._id?.toString() === lookupId);
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }
  if (review.userId !== req.user.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (rating !== undefined) {
    const parsed = Number(rating);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    review.rating = parsed;
  }
  if (title !== undefined) review.title = String(title || '').trim();
  if (description !== undefined) review.description = String(description || '').trim();
  if ((req.files || []).length > 0) {
    const uploadedImages = await Promise.all((req.files || []).map((file) => uploadImageAsset(file, 'review-images', '/uploads/review-images')));
    review.images = uploadedImages.map((entry) => entry.url);
    review.imageStorageIds = uploadedImages.map((entry) => entry.storageId);
    review.imageStorageFormats = uploadedImages.map((entry) => entry.format);
    review.imageNames = uploadedImages.map((entry) => entry.fileName);
  }
  review.status = 'Pending';
  review.editedAt = new Date();
  return res.json(review);
});

app.get('/api/admin/reviews', authenticateToken, authorizeAdmin, async (req, res) => {
  const { q = '', status = '' } = req.query;
  const term = String(q).trim().toLowerCase();

  let list = useDb ? await Review.find().sort({ createdAt: -1 }).lean() : [...reviews];
  if (status) {
    list = list.filter((item) => item.status === status);
  }
  if (term) {
    list = list.filter((item) =>
      String(item.productId || '').toLowerCase().includes(term)
      || String(item.customerName || '').toLowerCase().includes(term)
      || String(item.title || '').toLowerCase().includes(term)
      || String(item.description || '').toLowerCase().includes(term)
    );
  }
  return res.json(list);
});

app.patch('/api/admin/reviews/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const lookupId = req.params.id;
  const { status, adminReply } = req.body;
  const allowed = ['Pending', 'Approved', 'Hidden'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ message: 'Invalid review status' });
  }

  if (useDb) {
    const review = await Review.findOne(idLookup(lookupId));
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (status) review.status = status;
    if (adminReply !== undefined) review.adminReply = String(adminReply || '').trim();
    await review.save();
    return res.json(review.toObject());
  }

  const review = reviews.find((item) => item.id === lookupId || item._id?.toString() === lookupId);
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }
  if (status) review.status = status;
  if (adminReply !== undefined) review.adminReply = String(adminReply || '').trim();
  return res.json(review);
});

app.delete('/api/admin/reviews/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const lookupId = req.params.id;
  if (useDb) {
    const deleted = await Review.findOneAndDelete(idLookup(lookupId)).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Review not found' });
    }
    return res.json(deleted);
  }
  const index = reviews.findIndex((item) => item.id === lookupId || item._id?.toString() === lookupId);
  if (index === -1) {
    return res.status(404).json({ message: 'Review not found' });
  }
  const deleted = reviews.splice(index, 1)[0];
  return res.json(deleted);
});

app.get('/api/analytics', authenticateToken, authorizeAdmin, async (_req, res) => {
  if (useDb) {
    const dbOrders = await Order.find().lean();
    const dbCustomers = await User.find({ role: 'customer' }).lean();
    const dbProducts = await Product.find().lean();
    const topSellingProducts = await Product.find().sort({ popularity: -1 }).limit(3).lean();
    const lowStockProducts = dbProducts.filter((product) => product.stock > 0 && product.stock < 5);
    return res.json({
      revenue: dbOrders.reduce((sum, order) => sum + (order.total || 0), 0),
      totalOrders: dbOrders.length,
      customerCount: dbCustomers.length,
      totalProducts: dbProducts.length,
      lowStockProducts: lowStockProducts.length,
      featuredProducts: dbProducts.filter((product) => product.featured).length,
      topSellingProducts: topSellingProducts.map((product) => ({ name: product.name, popularity: product.popularity }))
    });
  }
  res.json({
    revenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
    totalOrders: orders.length,
    customerCount: users.filter((user) => user.role === 'customer').length,
    totalProducts: products.length,
    lowStockProducts: products.filter((product) => product.stock > 0 && product.stock < 5).length,
    featuredProducts: products.filter((product) => product.featured).length,
    topSellingProducts: products.slice(0, 3).map((product) => ({ name: product.name, popularity: product.popularity }))
  });
});

app.use((err, _req, res, _next) => {
  void _next;
  console.error(err);
  if (err instanceof multer.MulterError || err.message?.includes('files are allowed')) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`ReforgedX server running on port ${PORT}`);
});

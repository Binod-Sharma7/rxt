import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: '' },
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  authProvider: String,
  role: { type: String, default: 'customer' },
  profileImage: String,
  profileImageName: String,
  profileImageStorageId: String,
  profileImageStorageFormat: String,
  favourites: [{ type: String, index: true }],
  phone: String,
  address: String,
  province: String,
  district: String,
  city: String,
  streetAddress: String,
  postalCode: String
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  description: String,
  banner: String,
  bannerStorageId: String,
  bannerStorageFormat: String,
  bannerResourceType: String
}, { timestamps: true });

const imageAssetSchema = new mongoose.Schema({
  url: String,
  storageId: String,
  format: String,
  resourceType: String
}, { _id: false });

const siteAssetSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  kind: { type: String, enum: ['logo', 'hero', 'team', 'qr', 'banner'], required: true },
  label: String,
  url: { type: String, required: true },
  storageId: String,
  format: String,
  resourceType: { type: String, default: 'image' },
  alt: String,
  source: String
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  id: { type: String, index: true },
  name: String,
  category: String,
  price: Number,
  discount: Number,
  colors: [String],
  dimensions: String,
  stock: Number,
  popularity: Number,
  featured: { type: Boolean, default: false },
  images: [String],
  imageAssets: [imageAssetSchema],
  description: String,
  reviews: Number
}, { timestamps: true });

const blogSchema = new mongoose.Schema({
  title: String,
  category: String,
  excerpt: String,
  content: String,
  image: String,
  imageStorageId: String,
  imageStorageFormat: String,
  imageResourceType: String
}, { timestamps: true });

const faqSchema = new mongoose.Schema({
  question: String,
  answer: String
}, { timestamps: true });

const customOrderSchema = new mongoose.Schema({
  id: { type: String, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  customerName: String,
  email: String,
  phone: String,
  address: String,
  country: String,
  province: String,
  district: String,
  municipality: String,
  city: String,
  streetAddress: String,
  tole: String,
  postalCode: String,
  description: String,
  quantity: Number,
  colors: [String],
  category: String,
  imageFile: String,
  imageStorageId: String,
  imageStorageFormat: String,
  imageFileName: String,
  stlFile: String,
  stlStorageId: String,
  stlStorageFormat: String,
  stlFileName: String,
  status: { type: String, default: 'Pending' },
  notes: String,
  selectedColor: String,
  estimatedDelivery: String,
  orderType: { type: String, default: 'Custom Order' },
  hiddenFromCustomer: { type: Boolean, default: false },
  customerHistoryHiddenAt: Date,
  orderDate: Date
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  id: { type: String, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userId: String,
  items: Array,
  subtotal: Number,
  discount: Number,
  discountAmount: Number,
  total: Number,
  paymentMethod: String,
  paymentStatus: { type: String, default: 'Pending' },
  amountPaid: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  paymentScreenshot: String,
  paymentScreenshotStorageId: String,
  paymentScreenshotStorageFormat: String,
  paymentScreenshotName: String,
  paymentApprovedAt: Date,
  paymentApprovedBy: String,
  paymentRejectReason: String,
  status: { type: String, default: 'Pending' },
  address: String,
  streetAddress: String,
  province: String,
  district: String,
  city: String,
  postalCode: String,
  phone: String,
  email: String,
  customerName: String,
  notes: String,
  estimatedDelivery: String,
  orderDate: Date,
  orderId: String,
  paymentDetails: Object,
  hiddenFromCustomer: { type: Boolean, default: false },
  customerHistoryHiddenAt: Date
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  id: { type: String, index: true },
  productId: { type: String, required: true, index: true },
  orderId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  customerName: String,
  customerProfileImage: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, maxlength: 120 },
  description: { type: String, maxlength: 2000 },
  images: [String],
  imageStorageIds: [String],
  imageStorageFormats: [String],
  imageNames: [String],
  status: { type: String, enum: ['Pending', 'Approved', 'Hidden'], default: 'Pending', index: true },
  adminReply: String,
  reviewedAt: { type: Date, default: Date.now },
  editedAt: Date
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
export const Faq = mongoose.models.Faq || mongoose.model('Faq', faqSchema);
export const CustomOrder = mongoose.models.CustomOrder || mongoose.model('CustomOrder', customOrderSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export const SiteAsset = mongoose.models.SiteAsset || mongoose.model('SiteAsset', siteAssetSchema);

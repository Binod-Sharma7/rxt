import dns from 'node:dns';
import mongoose from 'mongoose';

const DEVELOPMENT_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

export const connectDb = async () => {
  if (!process.env.MONGO_URI) {
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_IN_MEMORY_DB === 'true') {
      console.warn('MongoDB URI not set. Running with explicitly enabled in-memory development data.');
      return false;
    }
    throw new Error('MONGO_URI is required. Set ALLOW_IN_MEMORY_DB=true only for intentional local development.');
  }

  try {
    if (process.env.NODE_ENV !== 'production' && process.env.MONGO_URI.startsWith('mongodb+srv://')) {
      dns.setServers(DEVELOPMENT_DNS_SERVERS);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_IN_MEMORY_DB === 'true') {
      console.warn(`MongoDB connection failed. Running with explicitly enabled in-memory development data: ${error.message}`);
      return false;
    }
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

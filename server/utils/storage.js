export const isCloudinaryConfigured = (env = process.env) => Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

export const assertProductionStorage = (env = process.env) => {
  if (env.NODE_ENV === 'production' && !isCloudinaryConfigured(env)) {
    throw new Error('Cloudinary configuration is required in production for file storage.');
  }
};

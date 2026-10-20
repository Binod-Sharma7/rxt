export const createRateLimiter = ({ windowMs, max, message, skip = () => false }) => {
  const activeWindows = new Map();

  return (req, res, next) => {
  if (skip(req)) return next();

  const now = Date.now();
  for (const [key, entry] of activeWindows) {
    if (entry.resetAt <= now) activeWindows.delete(key);
  }

  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = activeWindows.get(key);
  const entry = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + windowMs };
  entry.count += 1;
  activeWindows.set(key, entry);

  res.setHeader('RateLimit-Limit', max);
  res.setHeader('RateLimit-Remaining', Math.max(0, max - entry.count));
  res.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
  if (entry.count > max) {
    return res.status(429).json({ message });
  }
  next();
  };
};

import bcrypt from 'bcryptjs';

export const getConfiguredAdmin = (env = process.env) => {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email && !password) return null;
  if (!email || !password || password.length < 12) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are both required; ADMIN_PASSWORD must be at least 12 characters.');
  }
  return { email, password };
};

export const provisionConfiguredAdmin = async (User, env = process.env) => {
  const configuredAdmin = getConfiguredAdmin(env);
  if (!configuredAdmin) return null;

  const existing = await User.findOne({ email: configuredAdmin.email });
  if (!existing) {
    await User.create({
      name: 'Administrator',
      email: configuredAdmin.email,
      password: await bcrypt.hash(configuredAdmin.password, 10),
      role: 'admin'
    });
    return 'created';
  }

  if (existing.role === 'admin') return 'existing-admin';
  const configuredPasswordMatches = await bcrypt.compare(configuredAdmin.password, existing.password || '');
  if (configuredPasswordMatches) {
    existing.role = 'admin';
    await existing.save();
    return 'promoted-matching-password';
  }
  if (env.ADMIN_BOOTSTRAP !== 'true') {
    throw new Error('ADMIN_EMAIL belongs to a non-admin user. Set ADMIN_BOOTSTRAP=true for one startup to promote this exact account.');
  }

  existing.password = await bcrypt.hash(configuredAdmin.password, 10);
  existing.role = 'admin';
  await existing.save();
  return 'promoted';
};

export function validateConfiguration(config: Record<string, unknown>): Record<string, unknown> {
  const jwtSecret = typeof config.JWT_SECRET === 'string'
    ? config.JWT_SECRET.trim()
    : '';

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET est obligatoire et doit contenir au moins 32 caractères.');
  }

  return {
    ...config,
    JWT_SECRET: jwtSecret,
  };
}
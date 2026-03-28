import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Gerekli ortam degiskeni eksik: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

const config = {
  server: {
    port: parseInt(optionalEnv('PORT', '3001'), 10),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
    frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:3000'),
    isProduction: optionalEnv('NODE_ENV', 'development') === 'production',
  },

  database: {
    url: requireEnv('DATABASE_URL'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: optionalEnv('JWT_EXPIRES_IN', '15m'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    refreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  redis: {
    url: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
    enabled: optionalEnv('REDIS_ENABLED', 'false') === 'true',
  },

  whatsapp: {
    apiUrl: optionalEnv('WHATSAPP_API_URL', ''),
    apiToken: optionalEnv('WHATSAPP_API_TOKEN', ''),
    phoneNumberId: optionalEnv('WHATSAPP_PHONE_NUMBER_ID', ''),
    enabled: optionalEnv('WHATSAPP_ENABLED', 'false') === 'true',
  },

  sms: {
    provider: optionalEnv('SMS_PROVIDER', 'netgsm'), // netgsm, iletimerkezi, etc.
    apiKey: optionalEnv('SMS_API_KEY', ''),
    apiSecret: optionalEnv('SMS_API_SECRET', ''),
    sender: optionalEnv('SMS_SENDER', ''),
    enabled: optionalEnv('SMS_ENABLED', 'false') === 'true',
  },

  email: {
    host: optionalEnv('EMAIL_HOST', 'smtp.gmail.com'),
    port: parseInt(optionalEnv('EMAIL_PORT', '587'), 10),
    secure: optionalEnv('EMAIL_SECURE', 'false') === 'true',
    user: optionalEnv('EMAIL_USER', ''),
    password: optionalEnv('EMAIL_PASSWORD', ''),
    from: optionalEnv('EMAIL_FROM', 'noreply@emlak-crm.com'),
    enabled: optionalEnv('EMAIL_ENABLED', 'false') === 'true',
  },

  portal: {
    sahibinden: {
      apiKey: optionalEnv('SAHIBINDEN_API_KEY', ''),
      apiSecret: optionalEnv('SAHIBINDEN_API_SECRET', ''),
      enabled: optionalEnv('SAHIBINDEN_ENABLED', 'false') === 'true',
    },
    hepsiemlak: {
      apiKey: optionalEnv('HEPSIEMLAK_API_KEY', ''),
      apiSecret: optionalEnv('HEPSIEMLAK_API_SECRET', ''),
      enabled: optionalEnv('HEPSIEMLAK_ENABLED', 'false') === 'true',
    },
    emlakjet: {
      apiKey: optionalEnv('EMLAKJET_API_KEY', ''),
      apiSecret: optionalEnv('EMLAKJET_API_SECRET', ''),
      enabled: optionalEnv('EMLAKJET_ENABLED', 'false') === 'true',
    },
  },

  maps: {
    googleApiKey: optionalEnv('GOOGLE_MAPS_API_KEY', ''),
    provider: optionalEnv('MAPS_PROVIDER', 'google'), // google, yandex
  },

  upload: {
    maxFileSize: parseInt(optionalEnv('UPLOAD_MAX_FILE_SIZE', '10485760'), 10), // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    uploadsDir: optionalEnv('UPLOADS_DIR', path.join(process.cwd(), 'uploads')),
  },
} as const;

export type Config = typeof config;
export default config;

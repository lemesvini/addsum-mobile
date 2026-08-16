const LEGAL_BASE_URL = (
  process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://addsum-web.vercel.app'
).replace(/\/$/, '');

export const env = {
  API_URL: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  TERMS_OF_USE_URL: `${LEGAL_BASE_URL}/terms-of-use`,
  PRIVACY_POLICY_URL: `${LEGAL_BASE_URL}/privacy-policy`,
};

import qs from 'qs';
import crypto from 'crypto';


function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const vnpayConfig = {
  tmnCode: getRequiredEnv('VNP_TMN_CODE'),
  hashSecret: getRequiredEnv('VNP_HASH_SECRET'),
  url: getRequiredEnv('VNP_URL'),
  returnUrl:
    process.env.VNP_RETURN_URL ||
    'http://localhost:3000/payment/vnpay-return',
};

export function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, any> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
}

export function createVnpaySecureHash(
  params: Record<string, any>
) {
  const sortedParams = sortObject(params);

  const signData = qs.stringify(sortedParams, {
    encode: false, 
  });

  return crypto
    .createHmac('sha512', vnpayConfig.hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

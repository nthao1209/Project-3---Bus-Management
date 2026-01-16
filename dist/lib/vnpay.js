import qs from 'qs';
import crypto from 'crypto';
/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}
/**
 * VNPay configuration object
 */
export const vnpayConfig = {
    tmnCode: getRequiredEnv('VNP_TMN_CODE'),
    hashSecret: getRequiredEnv('VNP_HASH_SECRET'),
    url: getRequiredEnv('VNP_URL'),
    returnUrl: process.env.VNP_RETURN_URL ||
        'http://localhost:3000/payment/vnpay-return',
};
/**
 * Sort object keys alphabetically
 */
export function sortObject(obj) {
    const sorted = {};
    Object.keys(obj)
        .sort()
        .forEach((key) => {
        sorted[key] = obj[key];
    });
    return sorted;
}
/**
 * Create VNPay secure hash using HMAC-SHA512
 * @param params - Parameters to sign
 * @returns Hex encoded signature
 */
export function createVnpaySecureHash(params) {
    const sortedParams = sortObject(params);
    const signData = qs.stringify(sortedParams, {
        encode: false,
    });
    return crypto
        .createHmac('sha512', vnpayConfig.hashSecret)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');
}
/**
 * Verify VNPay return signature
 * @param params - Parameters from VNPay callback
 * @param secureHash - Signature from VNPay
 * @returns true if signature is valid
 */
export function verifyVnpaySignature(params, secureHash) {
    const computedHash = createVnpaySecureHash(params);
    return computedHash === secureHash;
}
/**
 * Encode parameters for VNPay URL
 * VNPay requires special encoding: spaces become '+' instead of '%20'
 */
export function encodeVnpayParams(params) {
    return Object.keys(params)
        .map(key => {
        return `${key}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`;
    })
        .join('&');
}
/**
 * VNPay response codes mapping
 */
export const vnpayResponseCodes = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng thanh toán đang bảo trì',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định',
    '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
};
/**
 * Get human-readable message for VNPay response code
 */
export function getVnpayResponseMessage(code) {
    return vnpayResponseCodes[code] || 'Lỗi không xác định';
}

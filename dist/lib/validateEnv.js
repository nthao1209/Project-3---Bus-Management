const envConfigs = [
    {
        name: 'MONGODB_URI',
        required: true,
        description: 'MongoDB connection string',
        validate: (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')
    },
    {
        name: 'JWT_SECRET',
        required: true,
        description: 'JWT secret key for authentication',
        validate: (value) => value.length >= 32
    },
    {
        name: 'VNP_TMN_CODE',
        required: true,
        description: 'VNPay Terminal/Merchant code'
    },
    {
        name: 'VNP_HASH_SECRET',
        required: true,
        description: 'VNPay Hash Secret for signing transactions',
        validate: (value) => value.length >= 16
    },
    {
        name: 'VNP_URL',
        required: true,
        description: 'VNPay payment gateway URL',
        validate: (value) => value.startsWith('https://')
    },
    {
        name: 'VNP_RETURN_URL',
        required: false,
        description: 'VNPay return URL (defaults to http://localhost:3000/payment/vnpay-return)'
    },
    {
        name: 'PORT',
        required: false,
        description: 'Server port (defaults to 3000)'
    },
    {
        name: 'NODE_ENV',
        required: false,
        description: 'Node environment (development/production)'
    }
];
/**
 * Validate all environment variables
 */
export function validateEnv() {
    const errors = [];
    const warnings = [];
    for (const config of envConfigs) {
        const value = process.env[config.name];
        // Check if required variable is missing
        if (config.required && !value) {
            errors.push(`❌ Missing required environment variable: ${config.name}\n` +
                `   Description: ${config.description}`);
            continue;
        }
        // Warn about optional missing variables
        if (!config.required && !value) {
            warnings.push(`⚠️  Optional environment variable not set: ${config.name}\n` +
                `   Description: ${config.description}`);
            continue;
        }
        // Run custom validation if provided
        if (value && config.validate) {
            if (!config.validate(value)) {
                errors.push(`❌ Invalid value for ${config.name}\n` +
                    `   Description: ${config.description}\n` +
                    `   Current value: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
/**
 * Validate environment and exit if critical errors found
 */
export function validateEnvOrExit() {
    console.log('🔍 Validating environment configuration...\n');
    const result = validateEnv();
    // Display warnings
    if (result.warnings.length > 0) {
        console.log('⚠️  WARNINGS:\n');
        result.warnings.forEach(warning => console.log(warning + '\n'));
    }
    // Display errors
    if (result.errors.length > 0) {
        console.error('ENVIRONMENT VALIDATION FAILED:\n');
        result.errors.forEach(error => console.error(error + '\n'));
        console.error('Please check your .env file and ensure all required variables are set.');
        console.error('Refer to .env.example for the required configuration.\n');
        process.exit(1);
    }
    console.log('Environment validation passed!\n');
}
/**
 * Check if VNPay is properly configured
 */
export function isVnpayConfigured() {
    return !!(process.env.VNP_TMN_CODE &&
        process.env.VNP_HASH_SECRET &&
        process.env.VNP_URL);
}
/**
 * Get environment info for debugging
 */
export function getEnvInfo() {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        vnpayConfigured: isVnpayConfigured(),
        vnpayUrl: process.env.VNP_URL || 'not set',
        vnpayReturnUrl: process.env.VNP_RETURN_URL || 'http://localhost:3000/payment/vnpay-return',
        mongoConfigured: !!process.env.MONGODB_URI,
        jwtConfigured: !!process.env.JWT_SECRET
    };
}

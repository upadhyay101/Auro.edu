const config = {
    apiKeys: {
        gemini: process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY',
    },
    endpoints: {
        baseUrl: process.env.BASE_URL || 'http://localhost:8000',
        api: {
            interview: '/api/interview',
            results: '/api/results',
            auth: '/api/auth'
        }
    },
    settings: {
        maxRetries: 3,
        timeout: 30000,
        errorMessages: {
            apiKeyExpired: 'API key has expired. Please contact support.',
            apiKeyInvalid: 'Invalid API key. Please check your configuration.',
            networkError: 'Network error. Please check your connection.',
            serverError: 'Server error. Please try again later.'
        }
    }
};

module.exports = config; 
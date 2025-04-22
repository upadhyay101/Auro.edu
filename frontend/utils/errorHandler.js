const config = require('../config/config');

class ErrorHandler {
    static handleApiError(error) {
        console.error('API Error:', error);

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 400:
                    if (data.message?.includes('API key expired')) {
                        return {
                            type: 'API_KEY_EXPIRED',
                            message: config.settings.errorMessages.apiKeyExpired
                        };
                    }
                    if (data.message?.includes('API key invalid')) {
                        return {
                            type: 'API_KEY_INVALID',
                            message: config.settings.errorMessages.apiKeyInvalid
                        };
                    }
                    return {
                        type: 'BAD_REQUEST',
                        message: data.message || 'Invalid request'
                    };
                case 401:
                    return {
                        type: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    };
                case 403:
                    return {
                        type: 'FORBIDDEN',
                        message: 'Access denied'
                    };
                case 404:
                    return {
                        type: 'NOT_FOUND',
                        message: 'Resource not found'
                    };
                case 500:
                    return {
                        type: 'SERVER_ERROR',
                        message: config.settings.errorMessages.serverError
                    };
                default:
                    return {
                        type: 'UNKNOWN_ERROR',
                        message: 'An unexpected error occurred'
                    };
            }
        } else if (error.request) {
            // The request was made but no response was received
            return {
                type: 'NETWORK_ERROR',
                message: config.settings.errorMessages.networkError
            };
        } else {
            // Something happened in setting up the request that triggered an Error
            return {
                type: 'REQUEST_ERROR',
                message: error.message || 'Error setting up the request'
            };
        }
    }

    static showErrorToast(message) {
        // You can implement a toast notification system here
        console.error('Error:', message);
        // For now, we'll just alert the user
        alert(message);
    }

    static handleError(error) {
        const errorInfo = this.handleApiError(error);
        this.showErrorToast(errorInfo.message);
        return errorInfo;
    }
}

module.exports = ErrorHandler; 
const config = require('../config/config');
const ErrorHandler = require('./errorHandler');

class ApiClient {
    constructor() {
        this.baseUrl = config.endpoints.baseUrl;
        this.maxRetries = config.settings.maxRetries;
        this.timeout = config.settings.timeout;
    }

    async request(endpoint, options = {}) {
        let retries = 0;
        const url = `${this.baseUrl}${endpoint}`;

        while (retries < this.maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const error = new Error(`HTTP error! status: ${response.status}`);
                    error.response = response;
                    throw error;
                }

                return await response.json();
            } catch (error) {
                retries++;
                
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }

                if (retries === this.maxRetries) {
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
            }
        }
    }

    async getPreviousResults() {
        try {
            return await this.request(config.endpoints.api.results);
        } catch (error) {
            return ErrorHandler.handleError(error);
        }
    }

    async startInterview(domain) {
        try {
            return await this.request(config.endpoints.api.interview, {
                method: 'POST',
                body: JSON.stringify({ domain })
            });
        } catch (error) {
            return ErrorHandler.handleError(error);
        }
    }

    async saveResults(results) {
        try {
            return await this.request(config.endpoints.api.results, {
                method: 'POST',
                body: JSON.stringify(results)
            });
        } catch (error) {
            return ErrorHandler.handleError(error);
        }
    }
}

module.exports = new ApiClient(); 
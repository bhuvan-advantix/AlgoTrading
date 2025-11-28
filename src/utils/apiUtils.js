// API utilities for Advantix AGI Trading Platform
import { TRADING_WINDOW, API_CONFIG } from './constants';

/**
 * Checks if the current time is within the trading window
 * @returns {boolean}
 */
export const isWithinTradingWindow = () => {
    const now = new Date();
    const istTime = new Intl.DateTimeFormat('en-US', {
        timeZone: TRADING_WINDOW.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(now);

    const [currentHour, currentMinute] = istTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = TRADING_WINDOW.start.split(':').map(Number);
    const [endHour, endMinute] = TRADING_WINDOW.end.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

/**
 * Common error handler for API requests
 * @param {Error} error The error object
 * @param {string} context The context where the error occurred
 * @returns {string} Error message
 */
export const handleApiError = (error, context) => {
    const message = error.message || 'An unexpected error occurred';
    console.error(`${context} error:`, error);
    return `${context}: ${message}`;
};

/**
 * Parse API response and handle common error cases
 * @param {Response} response The fetch response object
 * @param {string} context The context for error messages
 * @returns {Promise} Parsed response data
 */
export const handleApiResponse = async (response, context) => {
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || `${context} failed with status ${response.status}`);
    }
    
    if (!data.success) {
        throw new Error(data.error || `${context} operation failed`);
    }
    
    return data.data;
};

/**
 * Constants for API interaction
 */
export const API_CONSTANTS = {
    BASE_URL: API_CONFIG.baseUrl,
    REQUEST_TIMEOUT: API_CONFIG.timeout,
    RETRY_COUNT: API_CONFIG.retryCount,
    RETRY_DELAY: API_CONFIG.retryDelay,
};

/**
 * Create headers with authentication
 * @param {string} userId User ID from context
 * @param {string} token Authentication token
 * @returns {Headers} Headers object for fetch
 */
export const createAuthHeaders = (userId, token) => {
    const headers = new Headers({
        'Content-Type': 'application/json',
        'x-user-id': userId || '',
    });

    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    return headers;
};

export default {
    isWithinTradingWindow,
    handleApiError,
    handleApiResponse,
    API_CONSTANTS,
    createAuthHeaders,
};
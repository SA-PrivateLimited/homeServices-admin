/**
 * API Configuration
 * Centralized configuration for backend API
 */

// Base API URL - Update this for production deployment
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-production-url.com/api';  // Production - UPDATE THIS

// API timeout in milliseconds
export const API_TIMEOUT = 30000;

// Request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

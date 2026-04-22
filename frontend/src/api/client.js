// API Client for AI API Rental SaaS Frontend
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses — clears session and redirects to login
// This also handles the single-device kick: when another device logs in,
// the next API call returns 401 with "Session expired" detail.
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const detail = error.response?.data?.detail || '';
            localStorage.removeItem('auth_token');
            // Show kicked-out message if it was a session conflict
            if (detail.includes('another device')) {
                sessionStorage.setItem('auth_notice', 'You were logged out because your account was accessed from another device.');
            }
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (email, password) =>
        apiClient.post('/auth/register', { email, password }),

    login: (email, password) =>
        apiClient.post('/auth/login', { email, password }),

    logout: () =>
        apiClient.post('/auth/logout'),

    getMe: () =>
        apiClient.get('/auth/me'),

    refreshToken: () =>
        apiClient.post('/auth/refresh'),
};

// Providers API (public — no auth needed)
export const providersAPI = {
    getActiveProviders: () =>
        apiClient.get('/api/active-providers'),
};

// Marketplace API
export const marketplaceAPI = {
    getPlans: () =>
        apiClient.get('/api/plans'),

    purchaseRental: (planId, paymentMethodId) =>
        apiClient.post('/api/rentals/purchase', {
            plan_id: planId,
            payment_method_id: paymentMethodId
        }),

    getActiveRentals: () =>
        apiClient.get('/api/rentals/active'),

    getRentalHistory: () =>
        apiClient.get('/api/rentals/history'),

    getUsageStats: (rentalId) =>
        apiClient.get(`/api/rentals/${rentalId}/usage`),
};

// Payment API
export const paymentAPI = {
    createCheckoutSession: (planId, provider, customerPhone = '9999999999') =>
        apiClient.post('/api/checkout/session', { plan_id: planId, provider, customer_phone: customerPhone }),

    verifyOrder: (orderId) =>
        apiClient.get(`/api/checkout/verify/${orderId}`),
};

// Admin API
export const adminAPI = {
    getUsers: () =>
        apiClient.get('/admin/users'),

    suspendUser: (userId) =>
        apiClient.post(`/admin/users/${userId}/suspend`),

    activateUser: (userId) =>
        apiClient.post(`/admin/users/${userId}/activate`),

    injectCredits: (userId, credits, reason) =>
        apiClient.post(`/admin/users/${userId}/credit`, {
            user_id: userId,
            credits,
            reason
        }),

    getStats: () =>
        apiClient.get('/admin/stats'),

    getSpendingAlerts: () =>
        apiClient.get('/admin/spending-alerts'),

    getAnalytics: (hours = 24) =>
        apiClient.get(`/admin/analytics?hours=${hours}`),

    // Plan management
    getPlans: () =>
        apiClient.get('/admin/plans'),

    createPlan: (planData) =>
        apiClient.post('/admin/plans', planData),

    updatePlan: (planId, planData) =>
        apiClient.put(`/admin/plans/${planId}`, planData),

    deletePlan: (planId) =>
        apiClient.delete(`/admin/plans/${planId}`),

    // Provider key management
    getProviderKeys: () =>
        apiClient.get('/admin/provider-keys'),

    addProviderKey: (provider, apiKey) =>
        apiClient.post('/admin/provider-keys', { provider, api_key: apiKey }),

    deleteProviderKey: (keyId) =>
        apiClient.delete(`/admin/provider-keys/${keyId}`),

    // Capacity management
    getCapacity: () =>
        apiClient.get('/admin/capacity'),

    setCapacity: (config) =>
        apiClient.post('/admin/capacity', config),

    // Refund
    refundTransaction: (transactionId, reason = 'Admin initiated refund') =>
        apiClient.post(`/admin/refund/${transactionId}`, { reason }),

    // CSV Export
    getExportCsv: (hours = 24) =>
        apiClient.get(`/admin/export/csv?hours=${hours}`, { responseType: 'blob' }),

    // Impersonation
    impersonateUser: (userId) =>
        apiClient.get(`/admin/impersonate/${userId}`),
};

// Invoice API
export const invoiceAPI = {
    getInvoice: (rentalId) =>
        apiClient.get(`/api/invoice/${rentalId}`),

    getInvoiceHtml: (rentalId) =>
        apiClient.get(`/api/invoice/${rentalId}/html`, { responseType: 'text' }),
};

// Status API
export const statusAPI = {
    getStatus: () =>
        apiClient.get('/status/'),
};

export default apiClient;

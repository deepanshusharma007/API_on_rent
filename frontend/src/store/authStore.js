import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../api/client';

/**
 * Human-readable message for a failed API call. FastAPI validation errors (422)
 * return a list of objects, which must never be passed to toast/React directly.
 */
export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
    if (!error?.response) {
        return "Can't reach the server. Check your connection and try again — the server may take up to a minute to wake up.";
    }
    const detail = error.response.data?.detail;
    if (typeof detail === 'string' && detail) return detail;
    if (Array.isArray(detail) && detail.length) {
        const loc = detail[0]?.loc || [];
        const field = loc[loc.length - 1];
        if (field === 'email') return 'Please enter a valid email address.';
        if (field === 'otp') return 'Enter the 6-digit code from the email.';
        if (field === 'password') return 'Please enter a password.';
    }
    return fallback;
}

const useAuthStore = create(
    persist(
        (set) => {
            // Store the token and load the profile (role) — shared by every sign-in path
            const startSession = async (access_token) => {
                localStorage.setItem('auth_token', access_token);

                // Fetch user profile so role is available for UI gating
                let user = null;
                try {
                    const meResponse = await authAPI.getMe();
                    user = meResponse.data;
                } catch { /* profile is optional here */ }

                set({
                    user,
                    token: access_token,
                    isAuthenticated: true
                });
            };

            return {
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (email, password, rememberMe = false) => {
                try {
                    const response = await authAPI.login(email, password, rememberMe);
                    await startSession(response.data.access_token);
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: apiErrorMessage(error, 'Login failed')
                    };
                }
            },

            googleLogin: async (credential, rememberMe = false) => {
                try {
                    const response = await authAPI.googleLogin(credential, rememberMe);
                    await startSession(response.data.access_token);
                    return { success: true };
                } catch (error) {
                    return { success: false, error: apiErrorMessage(error, 'Google sign-in failed') };
                }
            },

            requestSignupOtp: async (email) => {
                try {
                    const response = await authAPI.requestSignupOtp(email);
                    return { success: true, ...response.data };
                } catch (error) {
                    const retryAfter = Number(error.response?.headers?.['retry-after']) || null;
                    return { success: false, error: apiErrorMessage(error, "Couldn't send the code"), retryAfter };
                }
            },

            verifySignupOtp: async (email, otp) => {
                try {
                    const response = await authAPI.verifySignupOtp(email, otp);
                    return { success: true, signupToken: response.data.signup_token };
                } catch (error) {
                    return {
                        success: false,
                        error: apiErrorMessage(error, "Couldn't verify the code"),
                        mustRestart: error.response?.status === 429,
                    };
                }
            },

            completeSignup: async (signupToken, password) => {
                try {
                    const response = await authAPI.completeSignup(signupToken, password);
                    await startSession(response.data.access_token);
                    return { success: true };
                } catch (error) {
                    const status = error.response?.status;
                    return {
                        success: false,
                        error: apiErrorMessage(error, "Couldn't create the account"),
                        // Expired/used verification or account already exists: start over / sign in
                        mustRestart: status === 409 || (status === 400 && /verification/i.test(error.response?.data?.detail || '')),
                    };
                }
            },

            forgotPassword: async (email) => {
                try {
                    const response = await authAPI.forgotPassword(email);
                    return { success: true, message: response.data.message };
                } catch (error) {
                    return { success: false, error: apiErrorMessage(error, "Couldn't send the reset email") };
                }
            },

            resetPassword: async (token, password) => {
                try {
                    const response = await authAPI.resetPassword(token, password);
                    return { success: true, message: response.data.message };
                } catch (error) {
                    return {
                        success: false,
                        error: apiErrorMessage(error, "Couldn't reset the password"),
                        linkInvalid: /invalid or has expired/i.test(error.response?.data?.detail || ''),
                    };
                }
            },

            register: async (email, password) => {
                try {
                    await authAPI.register(email, password);
                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: apiErrorMessage(error, 'Registration failed')
                    };
                }
            },

            logout: async () => {
                // Tell backend to delete the Redis session (best-effort)
                try { await authAPI.logout(); } catch { /* best-effort */ }
                localStorage.removeItem('auth_token');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false
                });
            },
            };
        },
        {
            name: 'auth-storage',
        }
    )
);

export default useAuthStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../api/client';

const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (email, password) => {
                try {
                    const response = await authAPI.login(email, password);
                    const { access_token } = response.data;

                    localStorage.setItem('auth_token', access_token);

                    // Fetch user profile so role is available for UI gating
                    let user = null;
                    try {
                        const meResponse = await authAPI.getMe();
                        user = meResponse.data;
                    } catch (_) {}

                    set({
                        user,
                        token: access_token,
                        isAuthenticated: true
                    });

                    return { success: true };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.detail || 'Login failed'
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
                        error: error.response?.data?.detail || 'Registration failed'
                    };
                }
            },

            logout: () => {
                localStorage.removeItem('auth_token');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false
                });
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);

export default useAuthStore;

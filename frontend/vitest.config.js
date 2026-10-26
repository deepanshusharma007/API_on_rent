import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/tests/setup.js',
        // tests/ holds the Playwright e2e specs, which run with `npx playwright test`
        exclude: [...configDefaults.exclude, 'tests/**'],
    },
});

import { test, expect } from '@playwright/test';

// Use fake test data generator for unique emails to prevent unique constraint failures
const uniqueId = Date.now();
const testEmail = `testuser${uniqueId}@example.com`;
const testPassword = 'TestPassword123!';

test.describe('E2End Browser Testing for AI API Rental SaaS', () => {

  test('01. Should register a new user successfully', async ({ page }) => {
    await page.goto('http://localhost:5173/register');
    
    // Fill the registration form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    const passwordInputs = await page.locator('input[type="password"]').all();
    await passwordInputs[0].fill(testPassword);
    if (passwordInputs.length > 1) {
       await passwordInputs[1].fill(testPassword);
    }
    
    // Submit
    await page.click('button:has-text("Register")');
    
    // Check if redirect successful by looking for Login button
    await page.waitForURL('**/login', { timeout: 10000 });
  });

  test('02. Should login with the registered user', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submit
    await page.click('button:has-text("Login")');
    
    // Expect redirection to marketplace
    await page.waitForURL('**/marketplace');
    await expect(page.locator('h1')).toContainText('Marketplace');
  });

  test('03. Dashboard should be initially empty', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    await page.waitForURL('**/marketplace');

    // Go to dashboard
    await page.goto('http://localhost:5173/dashboard');
    
    // Check if there are no active rentals
    await expect(page.locator('text=No active rentals')).toBeVisible();
  });

});

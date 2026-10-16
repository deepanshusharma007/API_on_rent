import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const store = vi.hoisted(() => ({
  login: null, googleLogin: null, requestSignupOtp: null, verifySignupOtp: null,
  completeSignup: null, forgotPassword: null, resetPassword: null,
}));

const authConfigState = vi.hoisted(() => ({ current: { loading: false, config: { email_enabled: true, google_client_id: null }, error: false } }));

vi.mock('../lib/authConfig', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuthConfig: () => authConfigState.current };
});

vi.mock('../store/authStore', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: (selector) => (selector ? selector(store) : store) };
});

import { apiErrorMessage } from '../store/authStore';
import { passwordScore, meetsPasswordPolicy } from '../lib/passwordPolicy';
import PasswordStrength from '../components/PasswordStrength';
import Register from '../pages/Register';
import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split('#')[0].split('?')[0]} element={element} />
        <Route path="/dashboard" element={<div>DASHBOARD PAGE</div>} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authConfigState.current = { loading: false, config: { email_enabled: true, google_client_id: null }, error: false };
  for (const key of Object.keys(store)) store[key] = vi.fn();
  window.history.replaceState(null, '', '/');
});

describe('apiErrorMessage', () => {
  it('turns FastAPI 422 lists into readable text (no objects reach React)', () => {
    const err = { response: { status: 422, data: { detail: [{ loc: ['body', 'email'], msg: 'bad', type: 'value_error' }] } } };
    expect(apiErrorMessage(err, 'x')).toBe('Please enter a valid email address.');
    const otp = { response: { status: 422, data: { detail: [{ loc: ['body', 'otp'], msg: 'bad' }] } } };
    expect(apiErrorMessage(otp)).toBe('Enter the 6-digit code from the email.');
  });

  it('passes server messages through and explains network failures', () => {
    expect(apiErrorMessage({ response: { data: { detail: 'Incorrect email or password' } } })).toBe('Incorrect email or password');
    expect(apiErrorMessage({ message: 'Network Error' })).toMatch(/Can't reach the server/);
    expect(apiErrorMessage({ response: { data: {} } }, 'Fallback')).toBe('Fallback');
  });
});

describe('password policy and strength', () => {
  it('mirrors the server rules', () => {
    expect(meetsPasswordPolicy('short1')).toBe(false);
    expect(meetsPasswordPolicy('onlyletters')).toBe(false);
    expect(meetsPasswordPolicy('12345678')).toBe(false);
    expect(meetsPasswordPolicy('a1' + 'é'.repeat(40))).toBe(false);
    expect(meetsPasswordPolicy('letters123')).toBe(true);
  });

  it('scores and renders an accessible meter', () => {
    expect(passwordScore('letters123')).toBe(1);
    expect(passwordScore('Letters123!xyz')).toBe(4);
    render(<PasswordStrength password="Letters123!xyz" />);
    const meter = screen.getByRole('meter', { name: 'Password strength' });
    expect(meter).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});

describe('Register (email signup)', () => {
  it('goes email -> code -> password -> dashboard', async () => {
    store.requestSignupOtp.mockResolvedValue({ success: true, expires_in: 600, resend_after: 60 });
    store.verifySignupOtp.mockResolvedValue({ success: true, signupToken: 'signup-token-123' });
    store.completeSignup.mockResolvedValue({ success: true });
    renderAt('/register', <Register />);

    expect(screen.getByText('STEP 1 OF 3')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('SYSTEM.USER_EMAIL'), { target: { value: ' New@Example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: /Send verification code/ }));
    await screen.findByText('STEP 2 OF 3');
    expect(store.requestSignupOtp).toHaveBeenCalledWith('New@Example.com');
    expect(screen.getByText(/Code expires in 10:00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend code in 1:00/ })).toBeDisabled();

    const codeInput = screen.getByLabelText('VERIFICATION CODE');
    fireEvent.change(codeInput, { target: { value: '12a3456' } });
    expect(codeInput).toHaveValue('123456');
    fireEvent.click(screen.getByRole('button', { name: /Verify email/ }));
    await screen.findByText('STEP 3 OF 3');
    expect(store.verifySignupOtp).toHaveBeenCalledWith('New@Example.com', '123456');

    fireEvent.change(screen.getByLabelText('SYSTEM.ACCESS_KEY'), { target: { value: 'Letters123' } });
    fireEvent.change(screen.getByLabelText('CONFIRM.ACCESS_KEY'), { target: { value: 'Letters124' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Passwords don't match.");
    expect(store.completeSignup).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('CONFIRM.ACCESS_KEY'), { target: { value: 'Letters123' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }));
    await screen.findByText('DASHBOARD PAGE');
    expect(store.completeSignup).toHaveBeenCalledWith('signup-token-123', 'Letters123');
  });

  it('shows server errors inline and stays on the step', async () => {
    store.requestSignupOtp.mockResolvedValue({ success: true, expires_in: 600, resend_after: 60 });
    store.verifySignupOtp.mockResolvedValue({ success: false, error: 'Incorrect code. Please check the email and try again.' });
    renderAt('/register', <Register />);
    fireEvent.change(screen.getByLabelText('SYSTEM.USER_EMAIL'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send verification code/ }));
    await screen.findByText('STEP 2 OF 3');
    fireEvent.change(screen.getByLabelText('VERIFICATION CODE'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify email/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect code');
    expect(screen.getByText('STEP 2 OF 3')).toBeInTheDocument();
  });

  it('rate-limit and service errors on send are shown', async () => {
    store.requestSignupOtp.mockResolvedValue({ success: false, error: 'Email delivery is not configured on this server. Please contact support.' });
    renderAt('/register', <Register />);
    fireEvent.change(screen.getByLabelText('SYSTEM.USER_EMAIL'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send verification code/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email delivery is not configured');
    expect(screen.getByText('STEP 1 OF 3')).toBeInTheDocument();
  });

  it('expired verification sends the user back to the email step', async () => {
    store.requestSignupOtp.mockResolvedValue({ success: true, expires_in: 600, resend_after: 60 });
    store.verifySignupOtp.mockResolvedValue({ success: true, signupToken: 't' });
    store.completeSignup.mockResolvedValue({ success: false, error: 'Your email verification has expired. Please start again.', mustRestart: true });
    renderAt('/register', <Register />);
    fireEvent.change(screen.getByLabelText('SYSTEM.USER_EMAIL'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send verification code/ }));
    await screen.findByText('STEP 2 OF 3');
    fireEvent.change(screen.getByLabelText('VERIFICATION CODE'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify email/ }));
    await screen.findByText('STEP 3 OF 3');
    fireEvent.change(screen.getByLabelText('SYSTEM.ACCESS_KEY'), { target: { value: 'Letters123' } });
    fireEvent.change(screen.getByLabelText('CONFIRM.ACCESS_KEY'), { target: { value: 'Letters123' } });
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }));
    await screen.findByText('STEP 1 OF 3');
    expect(screen.getByRole('alert')).toHaveTextContent('verification has expired');
  });

  it('says upfront when email delivery is not configured, and blocks the send', async () => {
    authConfigState.current = { loading: false, config: { email_enabled: false, google_client_id: null }, error: false };
    renderAt('/register', <Register />);
    expect(screen.getByRole('alert')).toHaveTextContent("Email sign-up is temporarily unavailable on this server (email delivery isn't set up yet). Please try again later.");
    expect(screen.getByRole('button', { name: /Send verification code/ })).toBeDisabled();
    expect(store.requestSignupOtp).not.toHaveBeenCalled();
  });

  it('suggests Google only when Google sign-in is available', () => {
    authConfigState.current = { loading: false, config: { email_enabled: false, google_client_id: 'abc.apps.googleusercontent.com' }, error: false };
    renderAt('/register', <Register />);
    expect(screen.getByRole('alert')).toHaveTextContent('Please use Google sign-in, or try again later.');
  });

  it('uses the Google client ID from the backend when the build has none', () => {
    authConfigState.current = { loading: false, config: { email_enabled: true, google_client_id: 'abc.apps.googleusercontent.com' }, error: false };
    renderAt('/register', <Register />);
    expect(screen.getByText(/Loading Google sign-in/)).toBeInTheDocument();  // configured: loads Google's script
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).toBeNull();
  });

  it('explains when the sign-in options cannot be loaded', async () => {
    authConfigState.current = { loading: false, config: null, error: true };
    renderAt('/register', <Register />);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load Google sign-in");
  });

  it('explains when Google sign-in is not configured', async () => {
    renderAt('/register', <Register />);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Google sign-in isn't configured yet");
  });
});

describe('Login', () => {
  it('sends Remember Me and shows errors inline', async () => {
    store.login.mockResolvedValue({ success: false, error: 'Incorrect email or password' });
    renderAt('/login', <Login />);
    fireEvent.change(screen.getByLabelText('SYSTEM.USER_EMAIL'), { target: { value: 'a@example.com ' } });
    fireEvent.change(screen.getByLabelText('SYSTEM.ACCESS_KEY'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Remember me/ }));
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
    expect(store.login).toHaveBeenCalledWith('a@example.com', 'secret123', true);
  });

  it('navigates to the dashboard on success', async () => {
    store.login.mockResolvedValue({ success: true });
    renderAt('/login', <Login />);
    fireEvent.change(screen.getByLabelText('SYSTEM.USER_EMAIL'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('SYSTEM.ACCESS_KEY'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Authenticate/ }));
    await screen.findByText('DASHBOARD PAGE');
    expect(store.login).toHaveBeenCalledWith('a@example.com', 'secret123', false);
  });

  it('has show/hide password and a Forgot password link', () => {
    renderAt('/login', <Login />);
    const pw = screen.getByLabelText('SYSTEM.ACCESS_KEY');
    expect(pw).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(pw).toHaveAttribute('type', 'text');
    expect(screen.getByRole('link', { name: 'FORGOT?' })).toHaveAttribute('href', '/forgot-password');
  });
});

describe('Forgot / reset password', () => {
  it('forgot password says upfront when email delivery is not configured', () => {
    authConfigState.current = { loading: false, config: { email_enabled: false, google_client_id: null }, error: false };
    renderAt('/forgot-password', <ForgotPassword />);
    expect(screen.getByRole('alert')).toHaveTextContent('Password reset is temporarily unavailable on this server');
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeDisabled();
  });

  it('shows the generic confirmation after requesting a link', async () => {
    store.forgotPassword.mockResolvedValue({ success: true, message: 'ok' });
    renderAt('/forgot-password', <ForgotPassword />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists for a@example.com');
    expect(store.forgotPassword).toHaveBeenCalledWith('a@example.com');
  });

  it('uses the token from the link fragment and returns to sign in', async () => {
    window.history.replaceState(null, '', '/reset-password#token=reset-token-abcdefghijklmnop');
    store.resetPassword.mockResolvedValue({ success: true, message: 'updated' });
    renderAt('/reset-password', <ResetPassword />);
    await waitFor(() => expect(window.location.hash).toBe(''));  // token removed from the address bar
    fireEvent.change(screen.getByLabelText('NEW PASSWORD'), { target: { value: 'Letters123' } });
    fireEvent.change(screen.getByLabelText('CONFIRM PASSWORD'), { target: { value: 'Letters123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    await screen.findByText('LOGIN PAGE');
    expect(store.resetPassword).toHaveBeenCalledWith('reset-token-abcdefghijklmnop', 'Letters123');
  });

  it('explains an invalid or expired link', async () => {
    window.history.replaceState(null, '', '/reset-password#token=old-token-abcdefghijklmnop');
    store.resetPassword.mockResolvedValue({ success: false, error: 'This reset link is invalid or has expired. Please request a new one.', linkInvalid: true });
    renderAt('/reset-password', <ResetPassword />);
    fireEvent.change(screen.getByLabelText('NEW PASSWORD'), { target: { value: 'Letters123' } });
    fireEvent.change(screen.getByLabelText('CONFIRM PASSWORD'), { target: { value: 'Letters123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Link expired')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Request a new link/ })).toHaveAttribute('href', '/forgot-password');
  });

  it('shows the invalid-link screen when there is no token', () => {
    renderAt('/reset-password', <ResetPassword />);
    expect(screen.getByText('Link expired')).toBeInTheDocument();
  });
});

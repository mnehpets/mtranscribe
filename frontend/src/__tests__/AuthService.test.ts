import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService, AuthError } from '../AuthService';

describe('AuthError', () => {
  it('creates error with message only', () => {
    const error = new AuthError('Authentication failed');
    expect(error.message).toBe('Authentication failed');
    expect(error.name).toBe('AuthError');
    expect(error.oauthError).toBeUndefined();
    expect(error.errorDescription).toBeUndefined();
  });

  it('creates error with oauthError', () => {
    const error = new AuthError('Authentication failed', { oauthError: 'access_denied' });
    expect(error.message).toBe('Authentication failed');
    expect(error.oauthError).toBe('access_denied');
    expect(error.errorDescription).toBeUndefined();
  });

  it('creates error with errorDescription', () => {
    const error = new AuthError('Authentication failed', { errorDescription: 'User denied access' });
    expect(error.message).toBe('Authentication failed');
    expect(error.oauthError).toBeUndefined();
    expect(error.errorDescription).toBe('User denied access');
  });

  it('creates error with both oauthError and errorDescription', () => {
    const error = new AuthError('Authentication failed', { 
      oauthError: 'invalid_scope',
      errorDescription: 'The requested scope is invalid'
    });
    expect(error.message).toBe('Authentication failed');
    expect(error.oauthError).toBe('invalid_scope');
    expect(error.errorDescription).toBe('The requested scope is invalid');
  });

  it('is an instance of Error', () => {
    const error = new AuthError('Test');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('AuthService', () => {
  // Reset singleton between tests
  beforeEach(() => {
    // @ts-ignore - accessing private property for testing
    AuthService.instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('returns a singleton instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkAuth()', () => {
    it('returns true when user is authenticated (200 response)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ logged_in: true, services: [] }),
      });

      const authService = AuthService.getInstance();
      const result = await authService.checkAuth();
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
    });

    it('returns false when user is not authenticated (401 response)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      const authService = AuthService.getInstance();
      const result = await authService.checkAuth();
      
      expect(result).toBe(false);
    });

    it('throws error on other failure responses (403, 500, etc.)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const authService = AuthService.getInstance();
      await expect(authService.checkAuth()).rejects.toThrow('Auth check failed with status: 500');
    });

    it('throws error when fetch fails (network error)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const authService = AuthService.getInstance();
      await expect(authService.checkAuth()).rejects.toThrow('Network error');
    });

    it('throws generic error on unknown fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue('unknown error');

      const authService = AuthService.getInstance();
      await expect(authService.checkAuth()).rejects.toThrow('Failed to check authentication status');
    });
  });

  describe('loginWithPopup()', () => {
    let mockWindow: any;
    let mockPopup: any;
    let originalWindow: any;

    beforeEach(() => {
      // Store original window
      originalWindow = global.window;
      
      // Create mock popup
      mockPopup = {
        closed: false,
        close: vi.fn(),
      };

      // Create mock window
      mockWindow = {
        open: vi.fn().mockReturnValue(mockPopup),
        location: { origin: 'http://localhost' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setInterval: vi.fn().mockReturnValue(123),
        clearInterval: vi.fn(),
        close: vi.fn(),
      };

      // Replace global window
      global.window = mockWindow;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('opens popup to correct URL', async () => {
      const authService = AuthService.getInstance();
      
      // Start login but don't await yet so we can verify popup opened
      const loginPromise = authService.loginWithPopup();
      
      expect(mockWindow.open).toHaveBeenCalledWith(
        '/auth/login/notion?next_url=%2Fu%2Fauth-callback',
        'authPopup',
        'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
      );

      // Simulate successful auth
      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'auth-result', success: true });

      await expect(loginPromise).resolves.toBeUndefined();
    });

    it('throws error when popup is blocked', async () => {
      mockWindow.open = vi.fn().mockReturnValue(null);
      
      const authService = AuthService.getInstance();
      await expect(authService.loginWithPopup()).rejects.toThrow('Popup was blocked by the browser');
    });

    it('prevents concurrent login flows', async () => {
      const authService = AuthService.getInstance();
      
      // Start first login
      const firstLogin = authService.loginWithPopup();
      
      // Try to start second login while first is active
      await expect(authService.loginWithPopup()).rejects.toThrow('Login flow already in progress');
      
      // Clean up first login
      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'auth-result', success: true });

      await firstLogin;
    });

    it('resolves on successful auth callback', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'auth-result', success: true });

      await expect(loginPromise).resolves.toBeUndefined();
      expect(mockPopup.close).toHaveBeenCalled();
    });

    it('rejects with AuthError on failed auth callback', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'auth-result', success: false, errorDescription: 'Invalid credentials' });

      await expect(loginPromise).rejects.toThrow(AuthError);
      await expect(loginPromise).rejects.toThrow('Invalid credentials');
      expect(mockPopup.close).toHaveBeenCalled();
    });

    it('rejects with AuthError containing OAuth error details', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ 
        type: 'auth-result', 
        success: false, 
        errorCode: 'access_denied',
        errorDescription: 'User denied access to the application'
      });

      try {
        await loginPromise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect(error).toHaveProperty('message', 'User denied access to the application');
        expect(error).toHaveProperty('oauthError', 'access_denied');
        expect(error).toHaveProperty('errorDescription', 'User denied access to the application');
      }
      expect(mockPopup.close).toHaveBeenCalled();
    });

    it('rejects with AuthError having only oauthError', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ 
        type: 'auth-result', 
        success: false, 
        errorCode: 'invalid_request'
      });

      try {
        await loginPromise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect(error).toHaveProperty('message', 'Authentication failed');
        expect(error).toHaveProperty('oauthError', 'invalid_request');
        expect(error).toHaveProperty('errorDescription', undefined);
      }
    });

    it('rejects when popup is closed before completion', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // Get the interval callback
      const intervalCallback = mockWindow.setInterval.mock.calls[0][0];
      
      // Simulate popup being closed
      mockPopup.closed = true;
      intervalCallback();

      await expect(loginPromise).rejects.toThrow('Popup was closed before authentication completed');
    });


    it('ignores messages with wrong type', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      
      // Simulate message with wrong type - should be ignored
      channel.postMessage({ type: 'some-other-type', success: true });

      // Login should still be pending
      expect(authService.isLoginInProgress()).toBe(true);

      // Now send valid message
      channel.postMessage({ type: 'auth-result', success: true });

      await loginPromise;
    });

    it('cleans up event listeners and intervals on completion', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'auth-result', success: true });

      await loginPromise;

      expect(mockWindow.clearInterval).toHaveBeenCalledWith(123);
      expect(authService.isLoginInProgress()).toBe(false);
    });

    it('cleans up event listeners and intervals on error', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'auth-result', success: false, error: 'Auth failed' });

      await expect(loginPromise).rejects.toThrow(AuthError);

      expect(mockWindow.clearInterval).toHaveBeenCalledWith(123);
      expect(authService.isLoginInProgress()).toBe(false);
    });
  });

  describe('isLoginInProgress()', () => {
    let mockWindow: any;
    let mockPopup: any;

    beforeEach(() => {
      mockPopup = {
        closed: false,
        close: vi.fn(),
      };

      mockWindow = {
        open: vi.fn().mockReturnValue(mockPopup),
        location: { origin: 'http://localhost' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setInterval: vi.fn().mockReturnValue(123),
        clearInterval: vi.fn(),
      };

      global.window = mockWindow;
    });

    it('returns false when no login is in progress', () => {
      const authService = AuthService.getInstance();
      expect(authService.isLoginInProgress()).toBe(false);
    });

    it('returns true when login is in progress', () => {
      const authService = AuthService.getInstance();
      authService.loginWithPopup();
      expect(authService.isLoginInProgress()).toBe(true);
    });

    it('returns false after login completes', async () => {
      const authService = AuthService.getInstance();
      const loginPromise = authService.loginWithPopup();

      // @ts-ignore
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'auth-result', success: true });

      await loginPromise;
      expect(authService.isLoginInProgress()).toBe(false);
    });
  });
});

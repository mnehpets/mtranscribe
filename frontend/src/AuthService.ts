import { I } from "vue-router/dist/router-CWoNjPRp.mjs";

/**
 * Custom error class for authentication failures with OAuth error details.
 * Extends Error to provide additional OAuth-specific error information.
 */
export class AuthError extends Error {
  /** OAuth error code (e.g., 'access_denied', 'invalid_request') */
  public oauthError?: string;
  /** Human-readable error description from OAuth provider */
  public errorDescription?: string;

  constructor(
    message: string,
    options?: { oauthError?: string; errorDescription?: string }
  ) {
    super(message);
    this.name = 'AuthError';
    this.oauthError = options?.oauthError;
    this.errorDescription = options?.errorDescription;
  }
}

/**
 * Authentication service for checking login status and initiating popup-based login flows.
 * 
 * This service provides a simple API for checking if a user is authenticated and
 * initiating a popup-based login flow. It is designed to be caller-driven, meaning
 * the caller decides when to check auth and when to trigger a login flow.
 * 
 * ## Usage Examples
 * 
 * ### Check authentication status
 * ```typescript
 * const authService = AuthService.getInstance();
 * const isAuthenticated = await authService.checkAuth();
 * if (isAuthenticated) {
 *   // User is logged in, proceed with authenticated action
 * } else {
 *   // User is not logged in
 * }
 * ```
 * 
 * ### Login with popup
 * ```typescript
 * const authService = AuthService.getInstance();
 * try {
 *   const result = await authService.loginWithPopup();
 *   console.log('Login successful:', result);
 * } catch (error) {
 *   if (error instanceof AuthError) {
 *     console.error('Login failed:', error.message);
 *     if (error.oauthError) {
 *       console.error('OAuth error code:', error.oauthError);
 *     }
 *     if (error.errorDescription) {
 *       console.error('Description:', error.errorDescription);
 *     }
 *   }
 * }
 * ```
 * 
 * ### Check auth and conditionally login
 * ```typescript
 * const authService = AuthService.getInstance();
 * const isAuthenticated = await authService.checkAuth();
 * if (!isAuthenticated) {
 *   try {
 *     await authService.loginWithPopup();
 *     // Retry the authenticated action
 *   } catch (error) {
 *     // Handle login failure
 *   }
 * }
 * ```
 */
export class AuthService {
  private static instance: AuthService;
  private activeLoginFlow: boolean = false;
  private popupCheckInterval: number | null = null;
  private services: string[] = [];

  private constructor() {}

  /**
   * Gets the singleton instance of AuthService.
   * @returns The AuthService instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Checks the current authentication status by calling the backend `/auth/me` endpoint.
   * 
   * @returns Promise that resolves to `true` if authenticated, `false` if not authenticated,
   *          or rejects with an error if the request fails
   * 
   * @example
   * ```typescript
   * const authService = AuthService.getInstance();
   * const isLoggedIn = await authService.checkAuth();
   * if (isLoggedIn) {
   *   // Proceed with authenticated operation
   * }
   * ```
   */
  async checkAuth(): Promise<boolean> {
    try {
      const response = await fetch('/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.services = data.services || [];
        return data.logged_in === true;
      } else if (response.status === 401) {
        this.services = [];
        return false;
      } else {
        throw new Error(`Auth check failed with status: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to check authentication status');
    }
  }

  /**
   * Checks if the user is authenticated with a specific service.
   * 
   * @param service The service identifier (e.g., 'notion')
   * @returns `true` if the user is authenticated with the service, `false` otherwise
   */
  hasService(service: string): boolean {
    return this.services.includes(service);
  }

  /**
   * Initiates a popup-based login flow.
   * 
   * Opens a popup window to the backend login endpoint with a callback URL parameter.
   * The popup will redirect to the callback route after authentication, which will
   * communicate the result back to this window and close itself.
   * 
   * Only one login flow can be active at a time. Subsequent calls while a flow is
   * in progress will be rejected with an error.
   * 
   * @returns Promise that resolves when login is successful, or rejects with an `AuthError`
   *          if the login fails, popup is blocked, or popup is closed before completion.
   *          The `AuthError` includes `oauthError` and `errorDescription` properties when
   *          available from the OAuth provider.
   * 
   * @throws {Error} If a login flow is already in progress
   * @throws {Error} If the popup is blocked by the browser
   * @throws {Error} If the popup is closed before authentication completes
   * @throws {AuthError} If authentication fails, with optional `oauthError` and `errorDescription`
   * 
   * @example
   * ```typescript
   * const authService = AuthService.getInstance();
   * try {
   *   await authService.loginWithPopup();
   *   console.log('Successfully logged in');
   * } catch (error) {
   *   if (error instanceof AuthError) {
   *     console.error('Login failed:', error.message);
   *     if (error.oauthError) {
   *       console.error('OAuth error code:', error.oauthError);
   *     }
   *     if (error.errorDescription) {
   *       console.error('Description:', error.errorDescription);
   *     }
   *   }
   * }
   * ```
   */
  async loginWithPopup(): Promise<void> {
    if (this.activeLoginFlow) {
      throw new Error('Login flow already in progress');
    }

    this.activeLoginFlow = true;

    try {
      const callbackUrl = encodeURIComponent('/u/auth-callback');
      const loginUrl = `/auth/login/notion?next_url=${callbackUrl}`;
      
      const popup = window.open(
        loginUrl,
        'authPopup',
        'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popup) {
        throw new Error('Popup was blocked by the browser');
      }

      return new Promise((resolve, reject) => {
        const channel = new BroadcastChannel('auth_channel');

        const channelHandler = (event: MessageEvent) => {
          // Check if this is an auth result message
          if (event.data && event.data.type === 'auth-result') {
            cleanup();
            
            if (event.data.success) {
              resolve();
            } else {
              // Create detailed AuthError with OAuth error information
              const error = new AuthError(
                event.data.errorDescription || 'Authentication failed',
                {
                  oauthError: event.data.errorCode,
                  errorDescription: event.data.errorDescription
                }
              );
              reject(error);
            }
          }
        }

        const cleanup = () => {
          channel.removeEventListener('message', channelHandler);
          channel.close();

          if (this.popupCheckInterval !== null) {
            window.clearInterval(this.popupCheckInterval);
            this.popupCheckInterval = null;
          }
          this.activeLoginFlow = false;
          if (popup && !popup.closed) {
            popup.close();
          }
        };

        // Listen for messages via BroadcastChannel
        channel.addEventListener('message', channelHandler);

        // Monitor popup closure
        this.popupCheckInterval = window.setInterval(() => {
          if (popup.closed) {
            cleanup();
            reject(new Error('Popup was closed before authentication completed'));
          }
        }, 500);
      });
    } catch (error) {
      this.activeLoginFlow = false;
      throw error;
    }
  }

  /**
   * Checks if a login flow is currently in progress.
   * 
   * @returns `true` if a login flow is active, `false` otherwise
   */
  isLoginInProgress(): boolean {
    return this.activeLoginFlow;
  }
}

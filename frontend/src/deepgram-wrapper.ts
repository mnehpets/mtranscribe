import { createClient as createRealClient, LiveTranscriptionEvents as RealLiveTranscriptionEvents } from "@deepgram/sdk";
import type { LiveClient } from "@deepgram/sdk";

// Re-export types
export type { LiveClient };

/**
 * Wrapper for createClient that checks for a mock implementation on the window object.
 * This allows end-to-end tests to inject a mock SDK.
 */
export const createClient = (apiKey: string) => {
  const win = typeof window !== 'undefined' ? window as any : null;
  const mockSdk = win?.__deepgramSdkMock;

  if (mockSdk) {
    return mockSdk.createClient(apiKey);
  }

  return createRealClient(apiKey);
};

/**
 * Wrapper for LiveTranscriptionEvents that checks for a mock implementation.
 * Uses a Proxy to ensure we check for the mock at runtime when properties are accessed.
 */
export const LiveTranscriptionEvents = new Proxy({}, {
  get: (_target, prop) => {
    const win = typeof window !== 'undefined' ? window as any : null;
    const mockSdk = win?.__deepgramSdkMock;
    const events = mockSdk ? mockSdk.LiveTranscriptionEvents : RealLiveTranscriptionEvents;
    return events[prop as keyof typeof RealLiveTranscriptionEvents];
  }
}) as typeof RealLiveTranscriptionEvents;

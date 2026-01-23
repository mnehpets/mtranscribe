import { describe, it, expect, beforeEach } from 'vitest';
import { AppConfig } from '../Config';

describe('AppConfig', () => {
  // Reset singleton between tests
  beforeEach(() => {
    // @ts-ignore - accessing private property for testing
    AppConfig.instance = undefined;
  });

  it('returns a singleton instance', () => {
    const instance1 = AppConfig.getInstance();
    const instance2 = AppConfig.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('initializes with empty API key', () => {
    const config = AppConfig.getInstance();
    expect(config.deepgramApiKey).toBe('');
  });

  it('allows setting the API key', () => {
    const config = AppConfig.getInstance();
    config.deepgramApiKey = 'test-api-key';
    expect(config.deepgramApiKey).toBe('test-api-key');
  });

  it('persists API key across getInstance calls', () => {
    const config1 = AppConfig.getInstance();
    config1.deepgramApiKey = 'test-api-key';

    const config2 = AppConfig.getInstance();
    expect(config2.deepgramApiKey).toBe('test-api-key');
  });
});

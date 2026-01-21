import { describe, it, expect, beforeEach } from 'vitest'
import { AppConfig } from '../Config'

describe('AppConfig', () => {
  beforeEach(() => {
    // Reset singleton instance for testing
    AppConfig.resetInstance()
  })

  it('returns the same instance on multiple calls', () => {
    const instance1 = AppConfig.getInstance()
    const instance2 = AppConfig.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('initializes with empty deepgramApiKey', () => {
    const config = AppConfig.getInstance()
    expect(config.deepgramApiKey).toBe('')
  })

  it('allows setting and getting the deepgramApiKey', () => {
    const config = AppConfig.getInstance()
    const testKey = 'test-api-key-123'
    config.deepgramApiKey = testKey
    expect(config.deepgramApiKey).toBe(testKey)
  })

  it('persists the deepgramApiKey across getInstance calls', () => {
    const config1 = AppConfig.getInstance()
    config1.deepgramApiKey = 'test-key-456'
    
    const config2 = AppConfig.getInstance()
    expect(config2.deepgramApiKey).toBe('test-key-456')
  })
})

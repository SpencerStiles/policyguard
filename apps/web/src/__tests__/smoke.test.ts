import { describe, it, expect } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'

describe('logger', () => {
  it('creates a logger with expected methods', async () => {
    const { logger } = await import('../lib/logger')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('logs without throwing', async () => {
    const { logger } = await import('../lib/logger')
    expect(() => logger.info('test')).not.toThrow()
  })
})

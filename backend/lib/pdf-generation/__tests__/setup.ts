import '@testing-library/jest-dom'

// Mock Next.js Request/Response for testing
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(input: any, init?: any) {
      this.url = input
      this.method = init?.method || 'GET'
    }
  }
})

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(body?: any, init?: any) {
      this.status = init?.status || 200
      this.body = body
    }
  }
})

// Mock Puppeteer for testing
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setViewport: jest.fn(),
      setContent: jest.fn(),
      evaluate: jest.fn().mockResolvedValue(2), // Mock page count
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      emulateMediaType: jest.fn(),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}))

// Mock console methods to reduce test noise
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
}
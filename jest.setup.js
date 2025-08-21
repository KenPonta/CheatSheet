// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js Request/Response for testing
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(input, init = {}) {
      this.url = input
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this._body = init.body
    }
    
    async json() {
      return typeof this._body === 'string' ? JSON.parse(this._body) : this._body
    }
  }
})

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(body, init = {}) {
      this.status = init.status || 200
      this.body = body
      this.headers = new Map(Object.entries(init.headers || {}))
    }
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
  }
})

// Mock File and FileReader for Node.js environment
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.chunks = chunks;
    this.name = filename;
    this.size = chunks.reduce((acc, chunk) => acc + (chunk.byteLength || chunk.length || 0), 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }

  text() {
    return Promise.resolve(this.chunks.join(''));
  }
};

global.FileReader = class FileReader {
  readAsArrayBuffer() {
    setTimeout(() => {
      this.onload({ target: { result: new ArrayBuffer(0) } });
    }, 0);
  }
};

// Mock Puppeteer for testing
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setViewport: jest.fn(),
      setContent: jest.fn(),
      evaluate: jest.fn().mockResolvedValue(2),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      emulateMediaType: jest.fn(),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}))

// Mock console methods to reduce test noise
const originalConsole = global.console
global.console = {
  ...originalConsole,
  warn: jest.fn(),
  error: jest.fn()
}
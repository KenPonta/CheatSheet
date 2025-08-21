/**
 * Test setup for layout system tests
 */

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console.warn and console.error during tests unless needed
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  Object.assign(console, originalConsole);
});

// Global test utilities
global.testUtils = {
  /**
   * Create a mock content block for testing
   */
  createMockBlock: (overrides = {}) => ({
    id: 'test-block',
    content: 'Test content',
    type: 'paragraph' as const,
    priority: 5,
    estimatedHeight: 0,
    ...overrides,
  }),

  /**
   * Create multiple mock content blocks
   */
  createMockBlocks: (count: number, baseOverrides = {}) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-block-${i}`,
      content: `Test content ${i}`,
      type: 'paragraph' as const,
      priority: 5,
      estimatedHeight: 0,
      ...baseOverrides,
    }));
  },

  /**
   * Assert that a value is within a reasonable range
   */
  expectInRange: (value: number, min: number, max: number) => {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  },

  /**
   * Assert that CSS variable has correct format
   */
  expectValidCSSVariable: (value: string, unit?: string) => {
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
    
    if (unit) {
      expect(value).toMatch(new RegExp(`\\d+(\\.\\d+)?${unit}$`));
    }
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDimension(): R;
      toBeValidCSSValue(): R;
    }
  }
  
  var testUtils: {
    createMockBlock: (overrides?: any) => any;
    createMockBlocks: (count: number, baseOverrides?: any) => any[];
    expectInRange: (value: number, min: number, max: number) => void;
    expectValidCSSVariable: (value: string, unit?: string) => void;
  };
}

// Custom Jest matchers
expect.extend({
  toBeValidDimension(received) {
    const pass = typeof received === 'object' &&
                 received !== null &&
                 typeof received.width === 'number' &&
                 typeof received.height === 'number' &&
                 typeof received.unit === 'string' &&
                 received.width > 0 &&
                 received.height > 0;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid dimension`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid dimension with width, height, and unit properties`,
        pass: false,
      };
    }
  },

  toBeValidCSSValue(received) {
    const pass = typeof received === 'string' &&
                 received.length > 0 &&
                 (received.match(/^\d+(\.\d+)?(px|mm|in|em|rem|%)$/) !== null ||
                  received.match(/^[\w-]+$/) !== null); // For non-numeric values like font names

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid CSS value`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid CSS value`,
        pass: false,
      };
    }
  },
});

export {};
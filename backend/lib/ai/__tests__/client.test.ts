import { OpenAIClient } from '../client';
import { AIServiceError } from '../types';

// Mock OpenAI
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

describe('OpenAIClient', () => {
  let client: OpenAIClient;

  beforeEach(() => {
    // Set up environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Reset mocks
    jest.clearAllMocks();
    mockCreate.mockClear();
    
    client = new OpenAIClient();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIClient()).toThrow('OPENAI_API_KEY environment variable is required');
    });

    it('should initialize successfully with API key', () => {
      expect(() => new OpenAIClient()).not.toThrow();
    });
  });

  describe('createChatCompletion', () => {
    it('should return content from successful API call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response content'
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      const result = await client.createChatCompletion(messages);

      expect(result).toBe('Test response content');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages,
        temperature: 0.1,
        max_tokens: 4000,
        response_format: undefined,
      });
    });

    it('should use custom options when provided', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Custom response'
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      const options = {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000,
        responseFormat: { type: 'json_object' as const }
      };

      await client.createChatCompletion(messages, options);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages,
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
    });

    it('should throw AIServiceError for empty response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      
      await expect(client.createChatCompletion(messages)).rejects.toThrow(AIServiceError);
    });

    it('should retry on rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      
      const mockResponse = {
        choices: [{
          message: {
            content: 'Success after retry'
          }
        }]
      };

      mockCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockResponse);

      // Mock the sleep function to avoid actual delays
      const originalSleep = (client as any).sleep;
      (client as any).sleep = jest.fn().mockResolvedValue(undefined);

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      const result = await client.createChatCompletion(messages);

      expect(result).toBe('Success after retry');
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Restore original sleep
      (client as any).sleep = originalSleep;
    });

    it('should retry on server errors', async () => {
      const serverError = new Error('Internal server error');
      (serverError as any).status = 500;
      
      const mockResponse = {
        choices: [{
          message: {
            content: 'Success after retry'
          }
        }]
      };

      mockCreate
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(mockResponse);

      // Mock the sleep function to avoid actual delays
      const originalSleep = (client as any).sleep;
      (client as any).sleep = jest.fn().mockResolvedValue(undefined);

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      const result = await client.createChatCompletion(messages);

      expect(result).toBe('Success after retry');
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Restore original sleep
      (client as any).sleep = originalSleep;
    });

    it('should not retry on non-retryable errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;

      mockCreate.mockRejectedValueOnce(authError);

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      
      await expect(client.createChatCompletion(messages)).rejects.toThrow(AIServiceError);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw final error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      mockCreate.mockRejectedValue(rateLimitError);

      // Mock the sleep function to avoid actual delays
      const originalSleep = (client as any).sleep;
      (client as any).sleep = jest.fn().mockResolvedValue(undefined);

      const messages = [{ role: 'user' as const, content: 'Test message' }];
      
      await expect(client.createChatCompletion(messages)).rejects.toThrow(AIServiceError);
      expect(mockCreate).toHaveBeenCalledTimes(3); // maxRetries = 3

      // Restore original sleep
      (client as any).sleep = originalSleep;
    }, 10000);
  });
});
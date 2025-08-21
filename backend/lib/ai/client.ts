import OpenAI from 'openai';
import { AIServiceError } from './types';

export class OpenAIClient {
  public client: OpenAI; // Make client public for image generation access
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey,
      maxRetries: 0, // We handle retries manually
    });
  }

  async createChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: { type: 'json_object' };
    } = {}
  ): Promise<string> {
    const {
      model = 'gpt-4o', // Using GPT-4o as GPT-5 isn't available yet
      temperature = 0.1,
      maxTokens = 4000,
      responseFormat
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: responseFormat,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new AIServiceError('Empty response from OpenAI API', {
            code: 'INVALID_RESPONSE',
            retryable: true
          });
        }

        return content;
      } catch (error) {
        lastError = error as Error;
        
        if (this.isRateLimitError(error)) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        if (!this.isRetryableError(error)) {
          break;
        }

        if (attempt < this.maxRetries - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(`API error, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries}):`, error);
          await this.sleep(delay);
        }
      }
    }

    // Convert the final error to our custom error type
    throw this.convertToAIServiceError(lastError!);
  }

  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || error?.code === 'rate_limit_exceeded';
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, server errors, and rate limits
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error?.status) || 
           error?.code === 'ECONNRESET' || 
           error?.code === 'ETIMEDOUT';
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private convertToAIServiceError(error: Error): AIServiceError {
    if (this.isRateLimitError(error)) {
      return new AIServiceError(error.message, {
        code: 'RATE_LIMIT',
        retryable: true,
        details: error
      });
    } else if ((error as any)?.status >= 500) {
      return new AIServiceError(error.message, {
        code: 'API_ERROR',
        retryable: true,
        details: error
      });
    } else {
      return new AIServiceError(error.message, {
        code: 'API_ERROR',
        retryable: false,
        details: error
      });
    }
  }
}

// Singleton instance
let openAIClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openAIClient) {
    openAIClient = new OpenAIClient();
  }
  return openAIClient;
}
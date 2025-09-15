// Content Modification System
// Provides backend services for modifying study materials after generation

export * from './types';
export * from './validation-service';
export * from './storage-service';
export * from './content-modification-service';

// Main service export for easy importing
export { ContentModificationService } from './content-modification-service';
export { ContentValidationService } from './validation-service';
export { FileSystemStorageService, InMemoryStorageService } from './storage-service';

// Error types
export { ContentModificationError } from './types';
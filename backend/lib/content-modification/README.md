# Content Modification System

A comprehensive backend service for handling study material modifications, including adding, removing, and editing content sections and images.

## Features

- **Content Management**: Add, edit, remove, and reorder sections
- **Image Management**: Add, remove, and regenerate images
- **Validation**: Comprehensive validation for all operations
- **Persistence**: File system and in-memory storage options
- **History Tracking**: Complete modification history
- **Export**: Export materials to HTML, Markdown, and PDF formats
- **Dependency Management**: Handle section dependencies and conflicts

## API Endpoints

### Main Content Modification API

- `GET /api/content-modification` - List materials or get specific material
- `POST /api/content-modification` - Create new material or modify existing
- `DELETE /api/content-modification` - Delete material

### Section Management

- `POST /api/content-modification/sections` - Add, edit, or reorder sections
- `DELETE /api/content-modification/sections` - Remove section

### Image Management

- `POST /api/content-modification/images` - Add or regenerate images
- `DELETE /api/content-modification/images` - Remove image

## Usage Examples

### Creating a New Material

```typescript
import { ContentModificationService } from '@/backend/lib/content-modification';

const contentService = new ContentModificationService();

const material = await contentService.createMaterial(
  'My Study Guide',
  [
    {
      type: 'heading',
      content: 'Chapter 1: Introduction',
      order: 0,
      editable: true,
      dependencies: []
    }
  ]
);
```

### Adding a Section

```typescript
await contentService.modifyContent({
  materialId: 'material-id',
  operation: {
    type: 'add_section',
    data: {
      section: {
        type: 'text',
        content: 'This is a new section',
        order: 1,
        editable: true,
        dependencies: []
      },
      position: 1
    }
  },
  userId: 'user-id',
  timestamp: new Date()
});
```

### Editing a Section

```typescript
await contentService.modifyContent({
  materialId: 'material-id',
  operation: {
    type: 'edit_section',
    targetId: 'section-id',
    data: {
      content: 'Updated content'
    }
  },
  userId: 'user-id',
  timestamp: new Date()
});
```

### Exporting Material

```typescript
const exportResult = await contentService.exportMaterial('material-id', {
  format: 'html',
  includeImages: true,
  includeMetadata: true
});
```

## Validation

The system includes comprehensive validation for:

- Content integrity
- Dependency relationships
- Operation permissions
- Data format validation
- Section ordering constraints

## Storage

Two storage implementations are provided:

1. **FileSystemStorageService**: Persistent storage using JSON files
2. **InMemoryStorageService**: In-memory storage for testing

## Error Handling

All operations use structured error handling with specific error codes:

- `MATERIAL_NOT_FOUND`: Material doesn't exist
- `VALIDATION_FAILED`: Operation validation failed
- `DEPENDENCY_CONFLICT`: Dependency constraints violated
- `STORAGE_ERROR`: Storage operation failed
- `PERMISSION_DENIED`: Operation not permitted

## Testing

Run the test suite to verify functionality:

```bash
npx tsx backend/lib/content-modification/test-content-modification.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **4.1**: Backend service for handling study material modifications
- **4.2**: API endpoints for adding, removing, and editing content sections
- **4.3**: Validation for content changes and dependencies
- **4.6**: Persistence layer for saving modified study materials
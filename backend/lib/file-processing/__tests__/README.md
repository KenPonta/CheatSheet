# PDF Processor Tests

This directory contains comprehensive tests for the PDF processing functionality implemented as part of Task 2.

## Test Files

### `pdf-processor-simple.test.ts`
- **Purpose**: Unit tests for the PDFProcessor class
- **Coverage**: Basic functionality, validation, utility methods, structure analysis, and error handling
- **Test Count**: 18 tests
- **Key Features Tested**:
  - File type identification and validation
  - File size and format validation
  - Word counting and text processing
  - Heading detection (numbered, all caps, title case)
  - Structure analysis methods
  - Error handling and validation

### `pdf-integration.test.ts`
- **Purpose**: Integration tests for the complete PDF processing workflow
- **Coverage**: End-to-end processing through the FileProcessorFactory
- **Test Count**: 9 tests
- **Key Features Tested**:
  - Complete file processing workflow
  - Content extraction (text, metadata, structure)
  - Multiple file processing
  - File validation
  - Error handling in real scenarios

### `test-data/sample-pdf-content.ts`
- **Purpose**: Mock data and utility functions for testing
- **Contents**:
  - Sample PDF content structures
  - Mock file creation utilities
  - Test data for different PDF scenarios (basic, with images, structured, scanned, empty)

## Test Coverage

The tests cover all major aspects of the PDF processor implementation:

1. **File Validation**
   - MIME type validation
   - File extension validation
   - File size limits
   - Empty file detection

2. **Content Extraction**
   - Text extraction from PDF
   - Metadata extraction (title, author, page count, etc.)
   - Document structure analysis
   - Image detection and OCR preparation

3. **Structure Analysis**
   - Heading detection with multiple patterns
   - Section creation
   - Hierarchy calculation
   - Content organization

4. **Error Handling**
   - Validation errors
   - Processing errors
   - Graceful degradation

5. **Integration**
   - Factory pattern usage
   - Multiple file processing
   - Configuration management

## Running Tests

```bash
# Run all PDF processor tests
npm test -- lib/file-processing/__tests__/

# Run specific test file
npm test -- lib/file-processing/__tests__/pdf-processor-simple.test.ts
npm test -- lib/file-processing/__tests__/pdf-integration.test.ts

# Run with coverage
npm run test:coverage -- lib/file-processing/__tests__/
```

## Mock Strategy

The tests use Jest mocking for external dependencies:
- `pdf-parse`: Mocked to return controlled test data
- `tesseract.js`: Mocked for OCR functionality testing
- File objects: Custom mock implementations for consistent testing

## Test Data

The test data includes various PDF scenarios:
- Basic documents with simple structure
- Documents with images and visual content
- Highly structured documents with multiple heading levels
- Scanned documents (minimal text)
- Empty documents

This ensures comprehensive coverage of real-world PDF processing scenarios.
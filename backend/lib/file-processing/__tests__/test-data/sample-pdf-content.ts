// Sample PDF content for testing

export const samplePDFContent = {
  basicDocument: {
    text: `Sample PDF Document

1. Introduction
This is a sample document for testing PDF processing capabilities.

2. Main Content
Here we have the main content of the document with various formatting.

2.1 Subsection
This is a subsection with more detailed information.

3. Conclusion
This concludes our sample document.`,
    numpages: 3,
    version: '1.4',
    info: {
      Title: 'Sample Document',
      Author: 'Test Author',
      Subject: 'Testing',
      Creator: 'Test Creator',
      Producer: 'Test Producer',
      CreationDate: new Date('2023-01-01'),
      ModDate: new Date('2023-01-02'),
      IsEncrypted: false
    }
  },

  documentWithImages: {
    text: `Document with Visual Content

Figure 1: Process Flow Diagram
[This would be an image in the actual PDF]

For example, the diagram above shows the workflow process.

Chart 2: Performance Metrics
[Another image reference]

The chart illustrates the performance improvements over time.`,
    numpages: 2,
    info: {
      Title: 'Visual Document',
      Author: 'Visual Author'
    }
  },

  structuredDocument: {
    text: `CHAPTER 1: FUNDAMENTALS

Introduction to the Topic

This chapter covers the basic concepts.

1.1 Basic Concepts
Here are the fundamental ideas.

1.1.1 Definition
A definition of the key term.

1.1.2 Examples
Some examples to illustrate the concept.

1.2 Advanced Topics
More complex material follows.

CHAPTER 2: APPLICATIONS

Practical Applications

This chapter shows real-world usage.

2.1 Case Studies
Several case studies are presented.

2.2 Best Practices
Recommended approaches are outlined.`,
    numpages: 5,
    info: {
      Title: 'Structured Document',
      Author: 'Structure Author'
    }
  },

  scannedDocument: {
    text: 'OCR text with l1m1ted qu4l1ty and 3rr0rs', // Minimal text for scanned PDF
    numpages: 10,
    version: '1.3',
    info: {
      Title: 'Scanned Document',
      IsEncrypted: false
    }
  },

  technicalDocument: {
    text: `Technical Documentation

1. API Overview
This document describes the REST API endpoints for user authentication.

1.1 Authentication Methods
• OAuth 2.0 implementation
• JWT token validation
• API key authentication

function authenticate(token) {
  return validateJWT(token);
}

Figure 1: Authentication Flow Diagram
[Diagram showing OAuth flow]

2. Code Examples
Here are some implementation examples:

const API_URL = "https://api.example.com/v1";
const response = await fetch(API_URL + "/auth", {
  method: "POST",
  headers: { "Authorization": "Bearer " + token }
});

Mathematical formula: hash = SHA256(password + salt)

Chart 2: Performance Metrics
Response times: 95th percentile < 200ms`,
    numpages: 5,
    version: '1.7',
    info: {
      Title: 'Technical API Documentation',
      Author: 'Engineering Team',
      Subject: 'API Documentation',
      Creator: 'Documentation Generator',
      Producer: 'PDF Creator v2.1',
      CreationDate: new Date('2024-01-15'),
      ModDate: new Date('2024-01-20'),
      IsEncrypted: false
    }
  },

  emptyDocument: {
    text: '',
    numpages: 1,
    info: {}
  }
};

export const createMockFile = (name: string, type: string = 'application/pdf', size: number = 1024): File => {
  const content = new Uint8Array(size);
  // Add PDF header bytes
  content[0] = 37; // %
  content[1] = 80; // P
  content[2] = 68; // D
  content[3] = 70; // F
  
  return new File([content], name, {
    type,
    lastModified: Date.now()
  });
};

export const createLargeFile = (name: string, sizeMB: number): File => {
  const size = sizeMB * 1024 * 1024;
  return createMockFile(name, 'application/pdf', size);
};
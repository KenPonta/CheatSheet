/**
 * Example usage of the Compact Study Generation API
 * 
 * This file demonstrates how to use the /api/generate-compact-study endpoint
 * to generate compact study guides from PDF files.
 */

// Example request payload
const exampleRequest = {
  files: [
    {
      name: 'discrete-probability.pdf',
      type: 'probability' as const,
      content: 'base64EncodedPDFContent...' // Base64 encoded PDF content
    },
    {
      name: 'relations.pdf',
      type: 'relations' as const,
      content: 'base64EncodedPDFContent...' // Base64 encoded PDF content
    }
  ],
  config: {
    // Layout configuration
    layout: 'compact' as const,        // 'compact' | 'standard'
    columns: 2 as const,               // 1 | 2 | 3
    
    // Content configuration
    equations: 'all' as const,         // 'all' | 'key' | 'minimal'
    examples: 'full' as const,         // 'full' | 'summary' | 'references'
    answers: 'inline' as const,        // 'inline' | 'appendix' | 'separate'
    
    // Typography configuration
    fontSize: '10pt',                  // '9pt', '10pt', '11pt', '12pt'
    margins: 'narrow' as const,        // 'narrow' | 'normal' | 'wide'
    
    // Output configuration
    outputFormat: 'html' as const,     // 'html' | 'pdf' | 'markdown' | 'all'
    paperSize: 'a4' as const,          // 'a4' | 'letter' | 'legal'
    orientation: 'portrait' as const,   // 'portrait' | 'landscape'
    
    // Metadata
    title: 'Discrete Probability & Relations Study Guide',
    
    // Processing options
    enableProgressTracking: true,
    enableErrorRecovery: true
  }
};

// Example function to call the API
async function generateCompactStudy(files: File[], config: any) {
  try {
    // Convert files to base64
    const filePromises = files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      
      return {
        name: file.name,
        type: determineFileType(file.name),
        content: base64
      };
    });
    
    const processedFiles = await Promise.all(filePromises);
    
    // Make API request
    const response = await fetch('/api/generate-compact-study', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: processedFiles,
        config
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Generation failed: ${result.message}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error generating compact study:', error);
    throw error;
  }
}

// Helper function to determine file type from filename
function determineFileType(filename: string): 'probability' | 'relations' | 'general' {
  const name = filename.toLowerCase();
  
  if (name.includes('probability') || name.includes('prob')) {
    return 'probability';
  }
  
  if (name.includes('relation') || name.includes('rel')) {
    return 'relations';
  }
  
  return 'general';
}

// Example usage with different configurations
export const exampleConfigurations = {
  // Compact layout for maximum density
  compact: {
    layout: 'compact' as const,
    columns: 2,
    equations: 'all' as const,
    examples: 'full' as const,
    answers: 'inline' as const,
    fontSize: '10pt',
    margins: 'narrow' as const,
    outputFormat: 'pdf' as const
  },
  
  // Standard layout for better readability
  standard: {
    layout: 'standard' as const,
    columns: 1,
    equations: 'key' as const,
    examples: 'summary' as const,
    answers: 'appendix' as const,
    fontSize: '11pt',
    margins: 'normal' as const,
    outputFormat: 'html' as const
  },
  
  // Print-optimized layout
  print: {
    layout: 'compact' as const,
    columns: 2,
    equations: 'all' as const,
    examples: 'full' as const,
    answers: 'inline' as const,
    fontSize: '9pt',
    margins: 'narrow' as const,
    outputFormat: 'pdf' as const,
    paperSize: 'a4' as const,
    orientation: 'portrait' as const
  },
  
  // Web-optimized layout
  web: {
    layout: 'standard' as const,
    columns: 1,
    equations: 'all' as const,
    examples: 'full' as const,
    answers: 'inline' as const,
    fontSize: '11pt',
    margins: 'normal' as const,
    outputFormat: 'html' as const
  },
  
  // All formats for maximum flexibility
  all: {
    layout: 'compact' as const,
    columns: 2,
    equations: 'all' as const,
    examples: 'full' as const,
    answers: 'inline' as const,
    fontSize: '10pt',
    margins: 'narrow' as const,
    outputFormat: 'all' as const
  }
};

// Example response handling
export function handleCompactStudyResponse(response: any) {
  console.log(`✅ Generated study guide: ${response.message}`);
  console.log(`📊 Stats: ${response.metadata.stats.totalSections} sections, ${response.metadata.stats.totalFormulas} formulas`);
  console.log(`⏱️ Processing time: ${response.processingTime}ms`);
  console.log(`📄 Estimated print pages: ${response.metadata.stats.estimatedPrintPages}`);
  console.log(`🎯 Content preservation: ${Math.round(response.metadata.preservationScore * 100)}%`);
  
  if (response.warnings && response.warnings.length > 0) {
    console.warn('⚠️ Warnings:', response.warnings);
  }
  
  // Handle different output formats
  if (response.html) {
    console.log('📄 HTML output available');
    // You can display the HTML or save it to a file
  }
  
  if (response.pdf) {
    console.log('📄 PDF output available');
    // Convert base64 to blob for download
    const pdfBlob = new Blob([Buffer.from(response.pdf, 'base64')], { type: 'application/pdf' });
    // Create download link or display PDF
  }
  
  if (response.markdown) {
    console.log('📄 Markdown output available');
    // You can save the markdown or process it further
  }
  
  return response;
}

// Example error handling
export function handleCompactStudyError(error: any) {
  console.error('❌ Compact study generation failed:', error);
  
  if (error.response) {
    // API returned an error response
    console.error('API Error:', error.response.data);
  } else if (error.request) {
    // Request was made but no response received
    console.error('Network Error: No response received');
  } else {
    // Something else happened
    console.error('Error:', error.message);
  }
  
  throw error;
}

// Export the main function and examples
export {
  generateCompactStudy,
  exampleRequest,
  determineFileType
};
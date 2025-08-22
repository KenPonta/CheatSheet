// File Processing Diagnostic Tool
// Run this in your browser console to debug file upload issues

function debugFileProcessing(files) {
  console.log('=== File Processing Debug ===');
  
  if (!files || files.length === 0) {
    console.log('❌ No files provided');
    return;
  }

  files.forEach((file, index) => {
    console.log(`\n--- File ${index + 1}: ${file.name} ---`);
    console.log(`Size: ${formatFileSize(file.size)}`);
    console.log(`Type: ${file.type || 'Unknown'}`);
    console.log(`Extension: .${getFileExtension(file.name)}`);
    
    // Check file type support
    const extension = getFileExtension(file.name);
    const supportedExtensions = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    
    if (!supportedExtensions.includes(extension)) {
      console.log('❌ UNSUPPORTED FILE TYPE');
      console.log('💡 Supported: PDF, DOCX, XLSX, PPTX, TXT, JPG, PNG, etc.');
      
      // Check for legacy Office formats
      if (['doc', 'ppt', 'xls'].includes(extension)) {
        console.log('🔄 LEGACY OFFICE FORMAT DETECTED');
        console.log(`💡 Convert .${extension} to .${extension}x format`);
      }
      return;
    }
    
    // Check file size limits
    const sizeLimits = {
      pdf: 50 * 1024 * 1024,
      docx: 25 * 1024 * 1024,
      xlsx: 25 * 1024 * 1024,
      pptx: 50 * 1024 * 1024,
      txt: 5 * 1024 * 1024,
      jpg: 10 * 1024 * 1024,
      jpeg: 10 * 1024 * 1024,
      png: 10 * 1024 * 1024,
      gif: 10 * 1024 * 1024,
      bmp: 10 * 1024 * 1024,
      webp: 10 * 1024 * 1024
    };
    
    const maxSize = sizeLimits[extension];
    if (maxSize && file.size > maxSize) {
      console.log(`❌ FILE TOO LARGE: ${formatFileSize(file.size)} > ${formatFileSize(maxSize)}`);
      console.log('💡 Compress the file or split into smaller parts');
      return;
    }
    
    // Check for empty files
    if (file.size === 0) {
      console.log('❌ EMPTY FILE');
      console.log('💡 File has no content');
      return;
    }
    
    // Check MIME type
    const expectedMimeTypes = {
      pdf: ['application/pdf'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      txt: ['text/plain'],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      png: ['image/png'],
      gif: ['image/gif'],
      bmp: ['image/bmp'],
      webp: ['image/webp']
    };
    
    const expected = expectedMimeTypes[extension];
    if (expected && file.type && !expected.includes(file.type)) {
      console.log(`⚠️  MIME TYPE MISMATCH: ${file.type}`);
      console.log(`💡 Expected: ${expected.join(' or ')}`);
    }
    
    console.log('✅ File appears valid for processing');
  });
}

function getFileExtension(filename) {
  return filename.toLowerCase().split('.').pop() || '';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Usage: debugFileProcessing(Array.from(fileInput.files))
console.log('File Processing Debugger loaded!');
console.log('Usage: debugFileProcessing(Array.from(fileInput.files))');
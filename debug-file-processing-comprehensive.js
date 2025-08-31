#!/usr/bin/env node

// Comprehensive File Processing Debugger
// This script will test every possible failure point in the file processing pipeline

const fs = require('fs');
const path = require('path');

class ComprehensiveFileProcessingDebugger {
  constructor() {
    this.results = {
      dependencies: {},
      fileValidation: {},
      fileReading: {},
      processing: {},
      memoryUsage: {},
      errors: []
    };
  }

  async runFullDiagnostic(filePath) {
    console.log('🔍 Starting Comprehensive File Processing Diagnostic\n');
    
    try {
      // Step 1: Check dependencies
      await this.checkDependencies();
      
      // Step 2: Validate file
      await this.validateFile(filePath);
      
      // Step 3: Test file reading
      await this.testFileReading(filePath);
      
      // Step 4: Test processing libraries
      await this.testProcessingLibraries(filePath);
      
      // Step 5: Test memory constraints
      await this.testMemoryConstraints();
      
      // Step 6: Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      this.results.errors.push({
        stage: 'diagnostic',
        error: error.message,
        stack: error.stack
      });
    }
  }

  async checkDependencies() {
    console.log('📦 Checking Dependencies...');
    
    const dependencies = ['pdf-parse', 'mammoth', 'tesseract.js'];
    
    for (const dep of dependencies) {
      try {
        const module = require(dep);
        this.results.dependencies[dep] = {
          status: 'available',
          version: this.getModuleVersion(dep),
          module: !!module
        };
        console.log(`  ✅ ${dep}: Available`);
      } catch (error) {
        this.results.dependencies[dep] = {
          status: 'missing',
          error: error.message
        };
        console.log(`  ❌ ${dep}: Missing - ${error.message}`);
      }
    }
    console.log('');
  }

  async validateFile(filePath) {
    console.log('📄 Validating File...');
    
    try {
      const stats = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      this.results.fileValidation = {
        exists: true,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        extension: extension,
        isReadable: fs.constants.R_OK,
        lastModified: stats.mtime
      };
      
      console.log(`  ✅ File exists: ${path.basename(filePath)}`);
      console.log(`  📏 Size: ${this.formatFileSize(stats.size)}`);
      console.log(`  📝 Extension: ${extension}`);
      
      // Check file size limits
      const sizeLimits = {
        '.pdf': 50 * 1024 * 1024,
        '.docx': 25 * 1024 * 1024,
        '.txt': 5 * 1024 * 1024
      };
      
      const limit = sizeLimits[extension];
      if (limit && stats.size > limit) {
        console.log(`  ⚠️  File size exceeds recommended limit of ${this.formatFileSize(limit)}`);
        this.results.fileValidation.sizeWarning = true;
      }
      
      // Check if file is empty
      if (stats.size === 0) {
        console.log(`  ❌ File is empty`);
        this.results.fileValidation.isEmpty = true;
      }
      
    } catch (error) {
      console.log(`  ❌ File validation failed: ${error.message}`);
      this.results.fileValidation = {
        exists: false,
        error: error.message
      };
    }
    console.log('');
  }

  async testFileReading(filePath) {
    console.log('📖 Testing File Reading...');
    
    try {
      // Test basic file reading
      const buffer = fs.readFileSync(filePath);
      
      this.results.fileReading = {
        canRead: true,
        bufferSize: buffer.length,
        firstBytes: buffer.slice(0, 16).toString('hex'),
        isValidBuffer: Buffer.isBuffer(buffer)
      };
      
      console.log(`  ✅ File readable: ${buffer.length} bytes`);
      console.log(`  🔍 First 16 bytes: ${buffer.slice(0, 16).toString('hex')}`);
      
      // Test file signature detection
      const signature = this.detectFileSignature(buffer);
      this.results.fileReading.detectedType = signature;
      console.log(`  🔍 Detected type: ${signature}`);
      
      // Test chunked reading (simulate browser File API)
      await this.testChunkedReading(filePath);
      
    } catch (error) {
      console.log(`  ❌ File reading failed: ${error.message}`);
      this.results.fileReading = {
        canRead: false,
        error: error.message
      };
    }
    console.log('');
  }

  async testChunkedReading(filePath) {
    console.log('  🔄 Testing chunked reading...');
    
    try {
      const chunkSize = 32 * 1024; // 32KB chunks
      const fileSize = fs.statSync(filePath).size;
      const chunks = [];
      let offset = 0;
      
      while (offset < fileSize) {
        const buffer = Buffer.alloc(Math.min(chunkSize, fileSize - offset));
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, offset);
        fs.closeSync(fd);
        
        chunks.push(buffer.slice(0, bytesRead));
        offset += bytesRead;
      }
      
      const reconstructed = Buffer.concat(chunks);
      const original = fs.readFileSync(filePath);
      
      const isIdentical = reconstructed.equals(original);
      
      this.results.fileReading.chunkedReading = {
        success: true,
        chunks: chunks.length,
        totalSize: reconstructed.length,
        isIdentical: isIdentical
      };
      
      console.log(`    ✅ Chunked reading: ${chunks.length} chunks, ${isIdentical ? 'identical' : 'different'}`);
      
    } catch (error) {
      console.log(`    ❌ Chunked reading failed: ${error.message}`);
      this.results.fileReading.chunkedReading = {
        success: false,
        error: error.message
      };
    }
  }

  async testProcessingLibraries(filePath) {
    console.log('⚙️  Testing Processing Libraries...');
    
    const extension = path.extname(filePath).toLowerCase();
    
    if (extension === '.docx') {
      await this.testMammothProcessing(filePath);
    } else if (extension === '.pdf') {
      await this.testPDFProcessing(filePath);
    } else if (extension === '.txt') {
      await this.testTextProcessing(filePath);
    }
    
    console.log('');
  }

  async testMammothProcessing(filePath) {
    console.log('  📝 Testing Mammoth (DOCX) processing...');
    
    try {
      const mammoth = require('mammoth');
      const buffer = fs.readFileSync(filePath);
      
      console.log(`    📊 Buffer size: ${buffer.length} bytes`);
      
      // Test with minimal options first
      const startTime = Date.now();
      const result = await mammoth.extractRawText({ buffer });
      const processingTime = Date.now() - startTime;
      
      this.results.processing.mammoth = {
        success: true,
        textLength: result.value.length,
        wordCount: result.value.split(/\s+/).filter(w => w.length > 0).length,
        messages: result.messages.length,
        processingTime: processingTime,
        hasContent: result.value.trim().length > 0
      };
      
      console.log(`    ✅ Extraction successful: ${result.value.length} characters`);
      console.log(`    📊 Word count: ${result.value.split(/\s+/).filter(w => w.length > 0).length}`);
      console.log(`    ⏱️  Processing time: ${processingTime}ms`);
      console.log(`    📋 Messages: ${result.messages.length}`);
      
      if (result.messages.length > 0) {
        console.log(`    ⚠️  Messages from Mammoth:`);
        result.messages.forEach(msg => {
          console.log(`      - ${msg.type}: ${msg.message}`);
        });
      }
      
      // Test first 200 characters of extracted text
      const preview = result.value.substring(0, 200).replace(/\s+/g, ' ').trim();
      console.log(`    📖 Text preview: "${preview}${result.value.length > 200 ? '...' : ''}"`);
      
      if (result.value.trim().length === 0) {
        console.log(`    ⚠️  WARNING: No text content extracted!`);
      }
      
    } catch (error) {
      console.log(`    ❌ Mammoth processing failed: ${error.message}`);
      this.results.processing.mammoth = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  async testPDFProcessing(filePath) {
    console.log('  📄 Testing PDF-Parse processing...');
    
    try {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      
      const startTime = Date.now();
      const data = await pdfParse(buffer);
      const processingTime = Date.now() - startTime;
      
      this.results.processing.pdfParse = {
        success: true,
        textLength: data.text.length,
        pages: data.numpages,
        processingTime: processingTime,
        hasContent: data.text.trim().length > 0
      };
      
      console.log(`    ✅ Extraction successful: ${data.text.length} characters`);
      console.log(`    📊 Pages: ${data.numpages}`);
      console.log(`    ⏱️  Processing time: ${processingTime}ms`);
      
    } catch (error) {
      console.log(`    ❌ PDF processing failed: ${error.message}`);
      this.results.processing.pdfParse = {
        success: false,
        error: error.message
      };
    }
  }

  async testTextProcessing(filePath) {
    console.log('  📝 Testing text processing...');
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      this.results.processing.text = {
        success: true,
        textLength: content.length,
        lineCount: (content.match(/\n/g) || []).length,
        wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
        hasContent: content.trim().length > 0
      };
      
      console.log(`    ✅ Text reading successful: ${content.length} characters`);
      
    } catch (error) {
      console.log(`    ❌ Text processing failed: ${error.message}`);
      this.results.processing.text = {
        success: false,
        error: error.message
      };
    }
  }

  async testMemoryConstraints() {
    console.log('💾 Testing Memory Constraints...');
    
    const memoryUsage = process.memoryUsage();
    
    this.results.memoryUsage = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      heapUsedFormatted: this.formatFileSize(memoryUsage.heapUsed),
      heapTotalFormatted: this.formatFileSize(memoryUsage.heapTotal),
      memoryPressure: memoryUsage.heapUsed / memoryUsage.heapTotal
    };
    
    console.log(`  📊 Heap used: ${this.formatFileSize(memoryUsage.heapUsed)}`);
    console.log(`  📊 Heap total: ${this.formatFileSize(memoryUsage.heapTotal)}`);
    console.log(`  📊 Memory pressure: ${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`);
    
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8) {
      console.log(`  ⚠️  High memory pressure detected!`);
    }
    
    console.log('');
  }

  detectFileSignature(buffer) {
    const signatures = {
      'PDF': [0x25, 0x50, 0x44, 0x46], // %PDF
      'DOCX': [0x50, 0x4B, 0x03, 0x04], // ZIP signature (DOCX is a ZIP file)
      'DOC': [0xD0, 0xCF, 0x11, 0xE0], // OLE signature
    };
    
    for (const [type, sig] of Object.entries(signatures)) {
      if (buffer.length >= sig.length) {
        let matches = true;
        for (let i = 0; i < sig.length; i++) {
          if (buffer[i] !== sig[i]) {
            matches = false;
            break;
          }
        }
        if (matches) return type;
      }
    }
    
    return 'Unknown';
  }

  getModuleVersion(moduleName) {
    try {
      const packagePath = require.resolve(`${moduleName}/package.json`);
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    } catch {
      return 'unknown';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    console.log('📋 DIAGNOSTIC REPORT');
    console.log('='.repeat(50));
    
    // Dependencies Report
    console.log('\n📦 DEPENDENCIES:');
    Object.entries(this.results.dependencies).forEach(([dep, result]) => {
      const status = result.status === 'available' ? '✅' : '❌';
      console.log(`  ${status} ${dep}: ${result.status} ${result.version ? `(v${result.version})` : ''}`);
    });
    
    // File Validation Report
    console.log('\n📄 FILE VALIDATION:');
    if (this.results.fileValidation.exists) {
      console.log(`  ✅ File exists and readable`);
      console.log(`  📏 Size: ${this.results.fileValidation.sizeFormatted}`);
      console.log(`  📝 Extension: ${this.results.fileValidation.extension}`);
      if (this.results.fileValidation.isEmpty) {
        console.log(`  ❌ File is empty!`);
      }
    } else {
      console.log(`  ❌ File validation failed: ${this.results.fileValidation.error}`);
    }
    
    // Processing Report
    console.log('\n⚙️  PROCESSING RESULTS:');
    Object.entries(this.results.processing).forEach(([processor, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${processor}: ${result.success ? 'Success' : 'Failed'}`);
      if (result.success) {
        if (result.textLength !== undefined) {
          console.log(`    📊 Text extracted: ${result.textLength} characters`);
        }
        if (result.processingTime !== undefined) {
          console.log(`    ⏱️  Processing time: ${result.processingTime}ms`);
        }
        if (result.hasContent === false) {
          console.log(`    ⚠️  WARNING: No content extracted!`);
        }
      } else {
        console.log(`    ❌ Error: ${result.error}`);
      }
    });
    
    // Memory Report
    console.log('\n💾 MEMORY USAGE:');
    console.log(`  📊 Current usage: ${this.results.memoryUsage.heapUsedFormatted} / ${this.results.memoryUsage.heapTotalFormatted}`);
    console.log(`  📊 Memory pressure: ${Math.round(this.results.memoryUsage.memoryPressure * 100)}%`);
    
    // Errors Report
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.stage}: ${error.error}`);
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    this.generateRecommendations();
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check dependencies
    Object.entries(this.results.dependencies).forEach(([dep, result]) => {
      if (result.status !== 'available') {
        recommendations.push(`Install missing dependency: npm install ${dep}`);
      }
    });
    
    // Check file issues
    if (this.results.fileValidation.isEmpty) {
      recommendations.push('File is empty - please upload a file with content');
    }
    
    if (this.results.fileValidation.sizeWarning) {
      recommendations.push('File size is large - consider compressing or splitting the file');
    }
    
    // Check processing issues
    Object.entries(this.results.processing).forEach(([processor, result]) => {
      if (!result.success) {
        if (result.error.includes('Cannot read properties')) {
          recommendations.push(`${processor}: Possible corrupted file or unsupported format`);
        } else if (result.error.includes('memory')) {
          recommendations.push(`${processor}: Increase memory limits or reduce file size`);
        } else {
          recommendations.push(`${processor}: ${result.error}`);
        }
      } else if (result.hasContent === false) {
        recommendations.push(`${processor}: File processed but no content extracted - check if file contains readable text`);
      }
    });
    
    // Memory recommendations
    if (this.results.memoryUsage.memoryPressure > 0.8) {
      recommendations.push('High memory usage detected - consider processing smaller files or increasing memory limits');
    }
    
    if (recommendations.length === 0) {
      console.log('  ✅ No issues detected - file should process successfully');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }
}

// Usage
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Usage: node debug-file-processing-comprehensive.js <file-path>');
    console.log('Example: node debug-file-processing-comprehensive.js "./Psychology in communication week 3.docx"');
    process.exit(1);
  }
  
  const diagnostic = new ComprehensiveFileProcessingDebugger();
  diagnostic.runFullDiagnostic(filePath).catch(console.error);
}

module.exports = ComprehensiveFileProcessingDebugger;
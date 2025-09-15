# Compact Study Generator - Troubleshooting Guide

## Common Issues and Solutions

### 1. "Processing Errors - Failed to generate compact study guide"

This error can occur for several reasons. Here are the most common causes and solutions:

#### **Issue: File Format Problems**
**Symptoms:** Error occurs immediately after file upload
**Solutions:**
- ✅ **Use PDF files only** - The system is optimized for PDF documents
- ✅ **Check file size** - Maximum file size is 50MB per file
- ✅ **Verify file integrity** - Ensure PDFs are not corrupted
- ✅ **Try fewer files** - Start with 1-2 files to test

#### **Issue: Configuration Problems**
**Symptoms:** Error occurs during processing setup
**Solutions:**
- ✅ **Use valid configuration options:**
  - Layout: `compact` or `standard`
  - Columns: `1`, `2`, or `3`
  - Output Format: `html`, `pdf`, `markdown`, or `all`
  - Font Size: `9pt`, `10pt`, `11pt`, or `12pt`
- ✅ **Try default settings first** - Use the preset configurations before customizing

#### **Issue: Content Processing Problems**
**Symptoms:** Error occurs during mathematical content extraction
**Solutions:**
- ✅ **Ensure PDFs contain text** - Scanned images won't work well
- ✅ **Check mathematical notation** - Use standard mathematical symbols
- ✅ **Try simpler content first** - Test with basic probability/relations content

### 2. Recommended Troubleshooting Steps

#### **Step 1: Test with Minimal Configuration**
```json
{
  "files": [
    {
      "name": "test.pdf",
      "type": "probability",
      "content": "[base64_content]"
    }
  ],
  "config": {
    "layout": "compact",
    "columns": 2,
    "equations": "all",
    "examples": "full",
    "answers": "inline",
    "fontSize": "10pt",
    "margins": "narrow",
    "outputFormat": "html"
  }
}
```

#### **Step 2: Check File Content**
- Ensure your PDF contains actual text (not just images)
- Verify mathematical content is present
- Check that formulas use standard notation (P(A), E[X], etc.)

#### **Step 3: Try Different File Types**
- **Probability files**: Should contain probability formulas, Bayes' theorem, etc.
- **Relations files**: Should contain relation definitions, properties, etc.
- **General files**: Can contain any mathematical content

#### **Step 4: Use Progressive Configuration**
Start simple and add complexity:
1. Single file, HTML output only
2. Add PDF output
3. Add multiple files
4. Customize layout options

### 3. File Requirements

#### **Supported Content Types**
- ✅ **Discrete Probability**: P(A), conditional probability, Bayes' theorem
- ✅ **Relations**: Reflexive, symmetric, transitive properties
- ✅ **Mathematical Formulas**: LaTeX-compatible notation
- ✅ **Worked Examples**: Step-by-step solutions

#### **File Format Requirements**
- ✅ **Format**: PDF only
- ✅ **Size**: Maximum 50MB per file
- ✅ **Content**: Text-based (not scanned images)
- ✅ **Encoding**: UTF-8 compatible

### 4. Configuration Options

#### **Layout Settings**
- `compact`: Dense, two-column layout (recommended)
- `standard`: Traditional single-column layout

#### **Column Options**
- `1`: Single column (good for mobile)
- `2`: Two columns (optimal for most content)
- `3`: Three columns (for very dense content)

#### **Content Preservation**
- `equations: "all"`: Preserve all mathematical formulas
- `examples: "full"`: Include complete worked examples
- `answers: "inline"`: Show solutions immediately

#### **Output Formats**
- `html`: Web-ready format with responsive design
- `pdf`: Print-ready format with LaTeX backend
- `markdown`: Pandoc-compatible for further processing
- `all`: Generate all formats simultaneously

### 5. Testing the System

#### **Health Check**
Test if the service is running:
```bash
GET /api/generate-compact-study
```
Should return: `{"status": "healthy", "service": "compact-study-generator"}`

#### **Simple Test**
Use the test endpoint:
```bash
GET /api/generate-compact-study/test
POST /api/generate-compact-study/test
```

### 6. Common Error Messages

#### **"No files provided"**
- **Cause**: Empty files array in request
- **Solution**: Include at least one file in the request

#### **"Configuration is required"**
- **Cause**: Missing config object in request
- **Solution**: Include complete configuration object

#### **"Pipeline processing failed"**
- **Cause**: Error in mathematical content extraction
- **Solution**: Check file content, try fallback processing

#### **"Output generation failed"**
- **Cause**: Error in HTML/PDF/Markdown generation
- **Solution**: Try different output format, check content complexity

### 7. Performance Optimization

#### **For Large Files**
- Process files sequentially (one at a time)
- Use `html` output format first (fastest)
- Enable error recovery: `enableErrorRecovery: true`

#### **For Multiple Files**
- Limit to 5 files maximum per request
- Use consistent file types (all probability or all relations)
- Consider splitting very large documents

### 8. Getting Help

#### **Debug Information**
In development mode, responses include debug logs:
```json
{
  "success": false,
  "errors": ["..."],
  "debugLogs": [
    {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "stage": "file_processing",
      "details": {...},
      "error": "..."
    }
  ]
}
```

#### **Error Recovery**
The system includes automatic fallback processing:
- If main pipeline fails, fallback processing attempts basic extraction
- If advanced output generation fails, simple HTML/Markdown is generated
- Warnings indicate when fallback processing was used

### 9. Best Practices

#### **File Preparation**
1. ✅ Use high-quality PDF files with clear text
2. ✅ Ensure mathematical notation is standard
3. ✅ Include worked examples with step-by-step solutions
4. ✅ Organize content with clear headings and sections

#### **Configuration**
1. ✅ Start with default settings
2. ✅ Test with single files before batch processing
3. ✅ Use `compact` layout for optimal space usage
4. ✅ Enable error recovery for robust processing

#### **Content Organization**
1. ✅ Separate probability and relations content into different files
2. ✅ Use clear section headings (1.1, 1.2, etc.)
3. ✅ Include complete worked examples
4. ✅ Use standard mathematical notation

### 10. System Status

The compact study generator includes:
- ✅ **Robust error handling** with fallback processing
- ✅ **Multiple output formats** (HTML, PDF, Markdown)
- ✅ **Configurable layouts** with compact typography
- ✅ **Mathematical content preservation** with LaTeX rendering
- ✅ **Academic structure organization** with cross-references
- ✅ **Performance optimization** for large documents

If you continue to experience issues after following this guide, the system includes automatic fallback processing that should still generate usable output, even if some advanced features are not available.
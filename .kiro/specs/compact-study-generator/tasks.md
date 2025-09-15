# Implementation Plan

- [x] 1. Create core mathematical content types and interfaces
  - Define TypeScript interfaces for Formula, WorkedExample, Definition, and Theorem types
  - Create MathematicalContent interface with proper type definitions
  - Implement SolutionStep interface for step-by-step worked examples
  - _Requirements: 1.1, 4.1, 4.4_

- [x] 2. Implement enhanced content extractor for mathematical content
  - Extend existing file processing to detect and extract mathematical formulas from PDFs
  - Create LaTeX/MathJax pattern recognition for formula identification
  - Implement worked example detection and parsing logic
  - Add mathematical content preservation validation
  - _Requirements: 1.1, 1.2, 4.1, 7.5_

- [x] 3. Build academic structure organizer
  - Create AcademicDocument, DocumentPart, and AcademicSection interfaces
  - Implement content organization logic for Part I (Discrete Probability) and Part II (Relations)
  - Build section numbering system (1.1, 1.2, 2.1, etc.)
  - Create table of contents generation with page anchors
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Develop cross-reference system
  - Implement CrossReference interface and reference tracking
  - Create automatic cross-reference generation for examples, formulas, and sections
  - Build reference formatting system ("see Ex. 3.2" format)
  - Add reference validation and link integrity checking
  - _Requirements: 2.5_

- [x] 5. Create compact layout engine core
  - Implement CompactLayoutConfig interface with typography and spacing settings
  - Build TypographyConfig with font size (10-11pt) and line height (1.15-1.25) controls
  - Create SpacingConfig for paragraph (≤0.35em) and list (≤0.25em) spacing
  - Implement two-column layout calculation and distribution logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

- [x] 6. Implement mathematical content rendering system
  - Create MathRenderingConfig for display and inline equation handling
  - Build LaTeX/MathJax/KaTeX rendering pipeline
  - Implement equation numbering and centering for display equations
  - Add full-width equation support for column overflow scenarios
  - _Requirements: 3.5, 4.2, 4.3_

- [x] 7. Build HTML output generator with compact CSS
  - Create HTMLOutput interface and generation logic
  - Implement compact.css with two-column layout and dense typography rules
  - Remove all card/box UI components and replace with continuous text layout
  - Add MathJax configuration for mathematical content rendering
  - _Requirements: 6.1, 6.4_

- [x] 8. Develop PDF output generator
  - Implement PDFOutput interface with LaTeX backend support
  - Create LaTeX template with article/scrartcl class and \twocolumn layout
  - Add compact spacing settings and widow/orphan control
  - Implement page break optimization to avoid splitting examples
  - _Requirements: 6.2, 6.5_

- [x] 9. Create Markdown output generator
  - Implement MarkdownOutput interface with Pandoc template support
  - Build Pandoc-compatible Markdown generation with mathematical content
  - Create compact template for PDF generation pipeline
  - Add metadata and front matter generation
  - _Requirements: 6.3_

- [x] 10. Implement CLI configuration system
  - Create CLIConfig interface with all required flags (--layout, --columns, --equations, etc.)
  - Build ConfigValidator for input validation and default application
  - Implement command-line argument parsing and processing
  - Add configuration file support for persistent settings
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. Build content processing pipeline
  - Create ProcessingPipeline interface and orchestration logic
  - Implement SourceDocument processing for probability and relations content
  - Build ProcessingStage system with dependency management
  - Add pipeline error handling and recovery mechanisms
  - _Requirements: 1.1, 7.1, 7.2, 7.3, 8.1, 8.2_

- [x] 12. Implement discrete probability content processing
  - Create specialized extractors for probability basics, conditional probability, and Bayes' theorem
  - Build Bernoulli trials and random variables content processors
  - Implement expected value, variance, and standard deviation formula extraction
  - Add practice problems and worked solutions processing
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 13. Implement relations content processing
  - Create extractors for relation definitions and property types (reflexive, symmetric, etc.)
  - Build combining relations and n-ary relations content processors
  - Implement SQL-style operations formatting with proper code layout
  - Add relation property check examples and exercise processing
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Create comprehensive error handling system
  - Implement MathContentError and LayoutError classes with recovery strategies
  - Build formula extraction fallback mechanisms (OCR to code blocks)
  - Add layout overflow detection and automatic spacing adjustment
  - Create cross-reference failure handling with warning generation
  - _Requirements: 4.1, 4.5_

- [x] 15. Build API endpoint for compact study generation
  - Create new API route `/api/generate-compact-study` with file upload support
  - Implement request validation for PDF files and configuration options
  - Add processing pipeline orchestration and progress tracking
  - Build response formatting with multiple output format support
  - _Requirements: 1.5, 5.4, 6.1, 6.2, 6.3_

- [x] 16. Create comprehensive test suite
  - Write unit tests for mathematical content extraction and formula detection
  - Implement integration tests for end-to-end PDF processing pipeline
  - Create layout engine tests for two-column generation and typography rules
  - Add output format tests for HTML, PDF, and Markdown generation consistency
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 4.1, 4.2_

- [x] 17. Implement content preservation validation
  - Create validation system to ensure all source formulas are preserved
  - Build worked example completeness verification
  - Implement cross-reference link integrity checking
  - Add mathematical content rendering accuracy validation
  - _Requirements: 1.2, 1.3, 4.1, 4.4_

- [x] 18. Build performance optimization system
  - Implement memory-efficient processing for large PDF files
  - Create concurrent processing capabilities for multiple documents
  - Add page count reduction measurement and reporting
  - Build content density optimization algorithms
  - _Requirements: 1.1, 3.1_

- [x] 19. Create frontend integration components
  - Remove existing card/box UI components from study generator interface
  - Implement new compact layout preview system
  - Add CLI configuration interface for web users
  - Create output format selection and download functionality
  - _Requirements: 1.4, 5.1, 5.2, 6.4_

- [x] 20. Integrate and test complete system
  - Wire together all components into cohesive compact study generator
  - Test end-to-end workflow from PDF upload to compact output generation
  - Validate all acceptance criteria with real discrete probability and relations PDFs
  - Perform final optimization and error handling verification
  - _Requirements: 1.5, 2.1, 2.2, 3.1, 4.1, 5.5, 6.1, 6.2, 6.3, 7.1, 8.1_

- [x] 21. Fix pipeline dependency and execution issues
  - Resolve "Dependency stage 'math-extraction' not completed" error in processing pipeline
  - Fix HTML generation metadata handling error ("Cannot read properties of undefined (reading 'generatedAt')")
  - Debug and fix PDF generation complete failure
  - Ensure proper stage dependency resolution in ContentProcessingPipeline
  - _Requirements: 1.1, 6.1, 6.2, 7.1, 8.1_

- [x] 22. Enhance pipeline resilience and error recovery
  - Add comprehensive logging to content processors for better debugging
  - Implement fallback content creation when file processing fails
  - Improve error handling in FileProcessingProcessor to continue with partial content
  - Add minimal academic document creation when structure organization fails
  - Reduce error severities to allow pipeline continuation with warnings
  - _Requirements: 1.1, 7.1, 7.2, 7.3, 8.1_

- [x] 23. Fix PDF generation system with robust fallback mechanisms
  - Implement LaTeX compilation with proper error handling and system dependency checks
  - Add Puppeteer-based HTML-to-PDF fallback when LaTeX is unavailable
  - Create simple text-based PDF generation as final fallback option
  - Enhance PDF generation logging and error reporting for better debugging
  - Increase timeout and improve error messages in API route for PDF generation
  - _Requirements: 6.2, 6.5_

- [x] 24. Create comprehensive PDF generation documentation and configuration
  - Remove corrupt simple PDF fallback and improve Puppeteer reliability
  - Create detailed LaTeX installation guide for different operating systems
  - Add environment variable configuration for PDF generation settings
  - Create comprehensive PDF generation documentation with troubleshooting
  - Implement proper error handling with informative messages when PDF generation fails
  - _Requirements: 6.2, 6.5_

- [x] 25. Fix PDF generation temp directory and metadata errors
  - Fix ENOENT error by ensuring temp directory exists before LaTeX compilation
  - Add automatic temp directory creation with fallback to system temp directory
  - Fix "No output metadata available" error by providing fallback metadata
  - Disable LaTeX by default in development to avoid temp directory issues
  - Implement direct Puppeteer PDF generation without LaTeX dependency
  - Add comprehensive error messages with setup instructions
  - _Requirements: 6.2, 6.5_

- [x] 26. Verify and configure MacTeX installation for optimal PDF generation
  - Test MacTeX installation and verify pdflatex functionality
  - Confirm all required LaTeX packages are available (amsmath, geometry, etc.)
  - Enable LaTeX PDF generation in environment configuration
  - Simplify LaTeX template to avoid package conflicts (remove titlesec, fancyhdr)
  - Configure local temp directory for LaTeX compilation
  - _Requirements: 6.2, 6.5_

- [x] 27. Debug and fix LaTeX PDF file reading issue
  - LaTeX compilation is successful (verified PDF files are created)
  - Issue appears to be in PDF file reading after compilation
  - Add comprehensive debugging to PDF file path resolution
  - Fix error handling in htmlToPDF method (remove createPDFErrorFallback call)
  - Change temp directory to absolute path to avoid path resolution issues
  - _Requirements: 6.2, 6.5_

- [x] 28. Fix LaTeX template syntax errors and Puppeteer compatibility
  - Add missing titlesec package for section formatting commands
  - Fix unmatched braces in workedexample environment definition
  - Remove undefined LaTeX commands (keepexample, keepformula)
  - Fix counter dependencies (remove example counter reference)
  - Replace deprecated page.waitForTimeout with setTimeout in Puppeteer
  - Add margin value validation to prevent geometry errors
  - _Requirements: 6.2, 6.5_
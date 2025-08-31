# Requirements Document

## Introduction

This feature enables users to create customized cheat sheets from multiple file formats (Word, Excel, PowerPoint, PDF, images, and text) by leveraging AI to extract, organize, and format content into concise study materials. The system will transcribe text from images, organize content by topics, recreate visual examples when needed, and allow users to customize the final output while maintaining fidelity to the original source material.

## Requirements

### Requirement 1

**User Story:** As a student, I want to upload multiple file types (Word, Excel, PowerPoint, PDF, images, text) so that I can create a comprehensive cheat sheet from all my study materials.

#### Acceptance Criteria

1. WHEN a user uploads a file THEN the system SHALL accept Word (.docx), Excel (.xlsx), PowerPoint (.pptx), PDF (.pdf), image files (.jpg, .png, .gif, .bmp), and plain text (.txt) formats
2. WHEN a user uploads multiple files THEN the system SHALL process all files and combine their content
3. WHEN a user uploads an unsupported file format THEN the system SHALL display an error message and reject the file
4. WHEN file upload exceeds size limits THEN the system SHALL notify the user of the size restriction

### Requirement 2

**User Story:** As a user, I want to specify how many pages my cheat sheet should be so that I can control the length and density of information.

#### Acceptance Criteria

1. WHEN a user selects page count THEN the system SHALL offer options from 1 to 10 pages
2. WHEN a user specifies page count THEN the system SHALL optimize content distribution across the specified number of pages
3. WHEN content exceeds specified page limit THEN the system SHALL warn the user about missing content
4. WHEN a user changes page count THEN the system SHALL recalculate content distribution

### Requirement 3

**User Story:** As a user, I want the system to transcribe text from images and extract content from all file types so that no information is lost during processing.

#### Acceptance Criteria

1. WHEN an image file is uploaded THEN the system SHALL use OCR to extract all visible text
2. WHEN a PDF file is uploaded THEN the system SHALL extract both text and images with OCR processing for image content
3. WHEN a Word document is uploaded THEN the system SHALL extract text, formatting, and embedded images
4. WHEN an Excel file is uploaded THEN the system SHALL extract data from all sheets and preserve table structures
5. WHEN a PowerPoint file is uploaded THEN the system SHALL extract text from all slides and process embedded images

### Requirement 4

**User Story:** As a user, I want content organized by topics and subtopics with intelligent space utilization so that my cheat sheet maximizes information density without over-extraction.

#### Acceptance Criteria

1. WHEN content is extracted THEN the system SHALL use AI to identify and categorize topics with consideration for available page space
2. WHEN topics are identified THEN the system SHALL create a hierarchical structure with main topics and granular subtopics that can be individually selected
3. WHEN organizing content THEN the system SHALL calculate optimal topic count based on page limits and reference formatting patterns
4. WHEN content has overlapping topics THEN the system SHALL merge related information intelligently while preserving subtopic granularity
5. WHEN available space exceeds extracted content THEN the system SHALL suggest including additional relevant subtopics or expanding existing content rather than leaving empty space
6. WHEN reference formatting is provided THEN the system SHALL adjust topic extraction to match the reference's content density and organization style

### Requirement 5

**User Story:** As a user, I want to see all identified topics with their subtopics and prioritize them based on importance so that I can create a focused cheat sheet that fits within my page limits.

#### Acceptance Criteria

1. WHEN topic organization is complete THEN the system SHALL display all topics and subtopics in a hierarchical structure with preview content
2. WHEN a user views topics THEN the system SHALL show priority controls (high, medium, low) for each topic and individual subtopic selection
3. WHEN a user sets topic priorities THEN the system SHALL automatically select high-priority topics first and fill remaining space with medium and low priority content
4. WHEN a user adjusts priorities THEN the system SHALL update page count estimates and content fit warnings in real-time
5. WHEN space is limited THEN the system SHALL allow users to choose specific subtopics within a topic rather than including entire topics
6. WHEN the system detects available space THEN it SHALL suggest including additional lower-priority topics instead of leaving pages partially empty

### Requirement 6

**User Story:** As a user, I want visual examples and diagrams recreated when necessary so that my cheat sheet maintains educational value.

#### Acceptance Criteria

1. WHEN the system identifies example questions or diagrams THEN it SHALL recreate them using AI image generation
2. WHEN recreating images THEN the system SHALL maintain the educational purpose and accuracy of the original
3. WHEN images cannot be recreated THEN the system SHALL preserve the original image if quality is sufficient
4. WHEN recreated images are generated THEN the system SHALL ensure they fit within the cheat sheet layout

### Requirement 7

**User Story:** As a user, I want to control the page size and text sizing so that my cheat sheet meets my specific needs.

#### Acceptance Criteria

1. WHEN a user selects page size THEN the system SHALL offer standard options (A4, Letter, Legal, A3)
2. WHEN a user adjusts text size THEN the system SHALL provide options from small to large while maintaining readability
3. WHEN page size or text size changes THEN the system SHALL recalculate content fit and warn of overflow
4. WHEN formatting is applied THEN the system SHALL ensure text is neither too small to read nor too large for efficient space usage

### Requirement 8

**User Story:** As a user, I want to use another cheat sheet as a reference template so that my generated cheat sheet closely resembles the reference format and style.

#### Acceptance Criteria

1. WHEN a user uploads a reference cheat sheet THEN the system SHALL analyze its visual layout, typography, spacing, color scheme, and content organization patterns
2. WHEN a reference is provided THEN the system SHALL extract specific formatting elements including font sizes, column layouts, section headers, bullet styles, and visual hierarchy
3. WHEN applying reference formatting THEN the system SHALL adapt the user's content to match the reference's structure while preserving content accuracy
4. WHEN the reference has specific content density patterns THEN the system SHALL adjust topic selection and content length to match the reference's information density
5. WHEN reference formatting conflicts with content THEN the system SHALL provide user options to modify content or adjust formatting while maintaining reference similarity

### Requirement 9

**User Story:** As a user, I want the final cheat sheet to use wording as close as possible to my original materials so that I maintain familiarity with the source content.

#### Acceptance Criteria

1. WHEN generating cheat sheet content THEN the system SHALL preserve original wording and terminology from source materials
2. WHEN condensing content THEN the system SHALL only remove redundant words while maintaining meaning
3. WHEN the system processes content THEN it SHALL NOT add information not present in the original sources
4. WHEN paraphrasing is necessary for space THEN the system SHALL maintain technical accuracy and original intent

### Requirement 10

**User Story:** As a user, I want intelligent space management that warns about overflow and suggests optimal content utilization so that I can make informed decisions about content inclusion.

#### Acceptance Criteria

1. WHEN content exceeds page limits THEN the system SHALL display a warning with specific details about overflow and suggest priority-based content reduction
2. WHEN warning is shown THEN the system SHALL indicate which topics or subtopics will be truncated based on priority levels
3. WHEN content doesn't fill available space THEN the system SHALL suggest including additional lower-priority topics or expanding existing content
4. WHEN user proceeds with content decisions THEN the system SHALL optimize layout to maximize space utilization while maintaining readability
5. WHEN reference formatting is used THEN the system SHALL match the reference's space utilization patterns and content density

### Requirement 11

**User Story:** As a user, I want granular control over topic and subtopic selection with priority-based auto-filling so that I can create focused cheat sheets that make optimal use of available space.

#### Acceptance Criteria

1. WHEN viewing topics THEN the system SHALL display each topic with its individual subtopics as selectable items
2. WHEN setting priorities THEN the system SHALL allow priority assignment (high, medium, low) at both topic and subtopic levels
3. WHEN auto-filling content THEN the system SHALL first include all high-priority items, then medium-priority items until space is optimally utilized
4. WHEN space remains after priority selection THEN the system SHALL suggest specific subtopics to include rather than leaving pages partially empty
5. WHEN reference formatting provides content density guidance THEN the system SHALL adjust auto-filling to match reference patterns
# Requirements Document

## Introduction

This feature transforms the existing Study_1 generator from a boxy, card-based layout to a dense, print-ready academic study handout format. The system will preserve all mathematical formulas and worked examples from source PDFs while eliminating wasted space through compact typography and two-column layouts. The focus is on creating comprehensive study materials for discrete probability and relations topics that maintain academic rigor while maximizing information density.

## Requirements

### Requirement 1

**User Story:** As a student, I want to generate compact study handouts from my PDF materials, so that I can have all formulas and examples in a print-friendly format without wasted space.

#### Acceptance Criteria

1. WHEN a user uploads discrete probability and relations PDFs THEN the system SHALL extract all mathematical formulas, definitions, and worked examples
2. WHEN generating output THEN the system SHALL preserve every important formula found in the source materials
3. WHEN creating the study handout THEN the system SHALL include at least one fully worked example per subtopic with complete solution steps
4. WHEN formatting content THEN the system SHALL eliminate all card/box UI elements and use continuous academic text layout
5. WHEN producing final output THEN the system SHALL generate study_compact.[pdf|html|md] with dense typography

### Requirement 2

**User Story:** As a student, I want my study materials organized in a logical academic structure, so that I can easily navigate between related concepts and cross-reference examples.

#### Acceptance Criteria

1. WHEN organizing content THEN the system SHALL structure Part I as Discrete Probability with 8 numbered subsections
2. WHEN organizing content THEN the system SHALL structure Part II as Relations with 5 numbered subsections
3. WHEN generating output THEN the system SHALL include a table of contents with page anchors
4. WHEN numbering elements THEN the system SHALL provide numbered theorems, definitions, and examples
5. WHEN creating references THEN the system SHALL include cross-references between sections using format "see Ex. 3.2"

### Requirement 3

**User Story:** As a student, I want compact typography and layout, so that I can fit maximum content on each page while maintaining readability.

#### Acceptance Criteria

1. WHEN formatting text THEN the system SHALL use two-column layout for A4/Letter paper size
2. WHEN setting typography THEN the system SHALL use line-height between 1.15-1.25
3. WHEN spacing paragraphs THEN the system SHALL use paragraph spacing ≤ 0.35em
4. WHEN formatting lists THEN the system SHALL use list spacing ≤ 0.25em
5. WHEN displaying equations THEN the system SHALL center display equations with numbering and allow full-width for overflow
6. WHEN formatting headings THEN the system SHALL use compact H2/H3 headings with minimal top margin

### Requirement 4

**User Story:** As a student, I want all mathematical content preserved and properly formatted, so that I can reference exact formulas and follow worked solution steps.

#### Acceptance Criteria

1. WHEN processing source PDFs THEN the system SHALL never drop formulas, identities, or probability laws
2. WHEN formatting mathematics THEN the system SHALL render equations using LaTeX/MathJax/KaTeX
3. WHEN displaying equations THEN the system SHALL keep inline math inline and display math centered
4. WHEN including examples THEN the system SHALL show complete solution steps for each worked example
5. WHEN handling multiple similar problems THEN the system SHALL include one fully worked example and list others as exercises with answers

### Requirement 5

**User Story:** As a user, I want configurable output options, so that I can adjust density and formatting without modifying code.

#### Acceptance Criteria

1. WHEN using CLI THEN the system SHALL support --layout=compact flag
2. WHEN configuring output THEN the system SHALL support --columns=2, --equations=all, --examples=full flags
3. WHEN setting typography THEN the system SHALL support --font-size=10-11pt and --margins=narrow flags
4. WHEN organizing content THEN the system SHALL support --answers=appendix flag
5. WHEN no flags provided THEN the system SHALL use compact, non-box layout as default

### Requirement 6

**User Story:** As a developer, I want multiple output format support, so that I can generate HTML, PDF, or Markdown based on user needs.

#### Acceptance Criteria

1. WHEN generating HTML THEN the system SHALL include compact.css with density and two-column layout rules
2. WHEN generating LaTeX THEN the system SHALL use article/scrartcl with \twocolumn and compact spacing settings
3. WHEN generating Markdown THEN the system SHALL target Pandoc pipeline with compact template
4. WHEN creating any format THEN the system SHALL remove all Card/Box UI components
5. WHEN outputting PDF THEN the system SHALL implement widow/orphan control and avoid splitting examples across pages

### Requirement 7

**User Story:** As a student, I want comprehensive coverage of discrete probability topics, so that I have all essential concepts, formulas, and examples in one document.

#### Acceptance Criteria

1. WHEN processing probability content THEN the system SHALL include probability basics, complements/unions, conditional probability
2. WHEN extracting content THEN the system SHALL preserve Bayes' theorem, independence, and Bernoulli trials sections
3. WHEN organizing material THEN the system SHALL include random variables, expected value & variance, and standard deviation
4. WHEN adding examples THEN the system SHALL include practice problems with worked solutions
5. WHEN formatting math THEN the system SHALL preserve all probability laws and statistical formulas from source

### Requirement 8

**User Story:** As a student, I want complete relations content coverage, so that I understand all relation properties and operations with practical examples.

#### Acceptance Criteria

1. WHEN processing relations content THEN the system SHALL include definitions and all property types (reflexive, irreflexive, symmetric, antisymmetric, transitive)
2. WHEN extracting operations THEN the system SHALL preserve combining relations and n-ary relations content
3. WHEN including SQL content THEN the system SHALL format SQL-style operations with proper code layout
4. WHEN adding exercises THEN the system SHALL include relation property check examples with complete solutions
5. WHEN organizing content THEN the system SHALL maintain logical flow from basic definitions to complex operations
// Types for content modification system

export interface StudyMaterial {
  id: string;
  title: string;
  sections: ContentSection[];
  images: GeneratedImage[];
  metadata: MaterialMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentSection {
  id: string;
  type: 'text' | 'equation' | 'example' | 'list' | 'heading';
  content: string;
  order: number;
  editable: boolean;
  dependencies: string[]; // IDs of sections this depends on
  parentId?: string; // For nested sections
}

export interface GeneratedImage {
  id: string;
  type: 'generated' | 'original' | 'recreated';
  source: ImageSource;
  base64Data: string;
  metadata: ImageMetadata;
  editable: boolean;
  regenerationOptions?: RegenerationOptions;
}

export interface ImageSource {
  type: 'simple-generator' | 'dalle' | 'upload';
  originalPrompt?: string;
  generationParams?: any;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: 'svg' | 'png' | 'jpg';
  generatedAt: Date;
  context: string;
}

export interface RegenerationOptions {
  availableStyles: FlatLineStyle[];
  contentHints: string[];
  contextOptions: string[];
}

export interface FlatLineStyle {
  lineWeight: 'thin' | 'medium' | 'thick';
  colorScheme: 'monochrome' | 'minimal-color';
  layout: 'horizontal' | 'vertical' | 'grid';
  annotations: boolean;
}

export interface MaterialMetadata {
  originalFiles: string[];
  generationConfig: any;
  preservationScore: number;
  totalSections: number;
  totalFormulas: number;
  totalExamples: number;
  estimatedPrintPages: number;
}

// Content modification operations
export interface ContentModificationRequest {
  materialId: string;
  operation: ContentOperation;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
}

export interface ContentOperation {
  type: 'add_section' | 'remove_section' | 'edit_section' | 'reorder_sections' | 
        'add_image' | 'remove_image' | 'regenerate_image' | 'edit_metadata';
  data: any;
  targetId?: string;
}

export interface AddSectionOperation {
  type: 'add_section';
  data: {
    section: Omit<ContentSection, 'id'>;
    position: number;
  };
}

export interface RemoveSectionOperation {
  type: 'remove_section';
  targetId: string;
}

export interface EditSectionOperation {
  type: 'edit_section';
  targetId: string;
  data: {
    content?: string;
    type?: ContentSection['type'];
    editable?: boolean;
  };
}

export interface ReorderSectionsOperation {
  type: 'reorder_sections';
  data: {
    sectionIds: string[];
  };
}

export interface AddImageOperation {
  type: 'add_image';
  data: {
    image: Omit<GeneratedImage, 'id'>;
    sectionId?: string;
    position: number;
  };
}

export interface RemoveImageOperation {
  type: 'remove_image';
  targetId: string;
}

export interface RegenerateImageOperation {
  type: 'regenerate_image';
  targetId: string;
  data: {
    style?: FlatLineStyle;
    prompt?: string;
    context?: string;
  };
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// Dependency validation
export interface DependencyCheck {
  sectionId: string;
  dependencies: string[];
  dependents: string[];
  canRemove: boolean;
  removalImpact: string[];
}

// Persistence types
export interface MaterialStorage {
  save(material: StudyMaterial): Promise<void>;
  load(materialId: string): Promise<StudyMaterial | null>;
  delete(materialId: string): Promise<void>;
  list(userId?: string): Promise<StudyMaterial[]>;
  exists(materialId: string): Promise<boolean>;
  saveHistory(history: ModificationHistory): Promise<void>;
  loadHistory(materialId: string): Promise<ModificationHistory[]>;
}

export interface ModificationHistory {
  id: string;
  materialId: string;
  operation: ContentOperation;
  timestamp: Date;
  userId?: string;
  previousState?: any;
  newState?: any;
}

// Error types
export class ContentModificationError extends Error {
  public code: 'MATERIAL_NOT_FOUND' | 'INVALID_OPERATION' | 'VALIDATION_FAILED' | 
               'DEPENDENCY_CONFLICT' | 'STORAGE_ERROR' | 'PERMISSION_DENIED';
  public details?: any;

  constructor(
    message: string,
    code: 'MATERIAL_NOT_FOUND' | 'INVALID_OPERATION' | 'VALIDATION_FAILED' | 
          'DEPENDENCY_CONFLICT' | 'STORAGE_ERROR' | 'PERMISSION_DENIED',
    details?: any
  ) {
    super(message);
    this.name = 'ContentModificationError';
    this.code = code;
    this.details = details;
  }
}

// Export formats
export interface ExportOptions {
  format: 'pdf' | 'html' | 'markdown';
  includeImages: boolean;
  includeMetadata: boolean;
  customStyles?: any;
}

export interface ExportResult {
  content: string | Buffer;
  format: string;
  filename: string;
  metadata: {
    exportedAt: Date;
    sections: number;
    images: number;
    size: number;
  };
}
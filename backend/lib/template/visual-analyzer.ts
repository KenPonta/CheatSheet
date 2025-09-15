/**
 * Computer vision-based visual analysis for reference templates
 * Extracts visual layout, typography, spacing, and color schemes from PDF/image files
 */

// Conditional canvas import to avoid build-time issues
let Canvas: any, createCanvas: any, loadImage: any, CanvasRenderingContext2D: any;

try {
  const canvasModule = require('canvas');
  Canvas = canvasModule.Canvas;
  createCanvas = canvasModule.createCanvas;
  loadImage = canvasModule.loadImage;
  CanvasRenderingContext2D = canvasModule.CanvasRenderingContext2D;
} catch (error) {
  console.warn('Canvas module not available, visual analysis will use fallback mode');
}
import { ExtractedContent, ExtractedImage } from '../ai/types';
import {
  VisualPattern,
  ColorScheme,
  TypographyPattern,
  LayoutPattern,
  SpacingPattern,
  HeadingStyle,
  BorderPattern,
  BackgroundPattern,
  VisualEmphasis,
  FontFamily,
  TextStyle
} from './types';

export interface VisualAnalysisResult {
  colorScheme: ColorScheme;
  typography: TypographyPattern;
  layout: LayoutPattern;
  spacing: SpacingPattern;
  visualElements: VisualElementAnalysis;
  contentDensity: ContentDensityAnalysis;
}

export interface VisualElementAnalysis {
  headers: HeaderVisualAnalysis[];
  bullets: BulletVisualAnalysis[];
  borders: BorderPattern[];
  backgrounds: BackgroundPattern[];
  emphasis: VisualEmphasis[];
}

export interface HeaderVisualAnalysis {
  level: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  position: { x: number; y: number };
  boundingBox: { width: number; height: number };
  spacing: { top: number; bottom: number };
  alignment: 'left' | 'center' | 'right';
}

export interface BulletVisualAnalysis {
  type: 'circle' | 'square' | 'dash' | 'arrow' | 'number' | 'custom';
  size: number;
  color: string;
  indentation: number;
  spacing: number;
  position: { x: number; y: number };
}

export interface ContentDensityAnalysis {
  wordsPerSquareInch: number;
  linesPerInch: number;
  whitespaceRatio: number;
  textCoverage: number;
  averageLineLength: number;
  paragraphSpacing: number;
}

export class VisualAnalyzer {
  private canvas: any;
  private ctx: any;
  private canvasAvailable: boolean;

  constructor() {
    this.canvasAvailable = Boolean(createCanvas);
    
    if (this.canvasAvailable) {
      // Initialize canvas for image analysis
      this.canvas = createCanvas(800, 600);
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Performs comprehensive visual analysis of a reference template
   */
  async analyzeVisualElements(content: ExtractedContent): Promise<VisualAnalysisResult> {
    try {
      // Check if canvas is available
      if (!this.canvasAvailable) {
        console.warn('Canvas not available, using text-based analysis fallback');
        return this.performTextBasedAnalysis(content);
      }

      // Convert first page to image for analysis if we have images
      const primaryImage = content.images.length > 0 ? content.images[0] : null;
      
      if (!primaryImage) {
        // Fallback to text-based analysis
        return this.performTextBasedAnalysis(content);
      }

      // Load image for computer vision analysis
      const image = await this.loadImageFromBase64(primaryImage.base64);
      
      // Resize canvas to match image
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      this.ctx.drawImage(image, 0, 0);

      // Perform visual analysis
      const [colorScheme, typography, layout, spacing, visualElements, contentDensity] = await Promise.all([
        this.extractColorScheme(),
        this.analyzeTypographyVisually(),
        this.analyzeLayoutVisually(),
        this.analyzeSpacingVisually(),
        this.extractVisualElements(),
        this.analyzeContentDensity()
      ]);

      return {
        colorScheme,
        typography,
        layout,
        spacing,
        visualElements,
        contentDensity
      };
    } catch (error) {
      console.warn('Visual analysis failed, falling back to text-based analysis:', error);
      return this.performTextBasedAnalysis(content);
    }
  }

  /**
   * Extracts color scheme from the visual content
   */
  private async extractColorScheme(): Promise<ColorScheme> {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;
    
    // Color frequency analysis
    const colorMap = new Map<string, number>();
    const sampleRate = 10; // Sample every 10th pixel for performance
    
    for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      if (a > 128) { // Only consider non-transparent pixels
        const color = this.rgbToHex(r, g, b);
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }
    }

    // Sort colors by frequency
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);

    // Extract dominant colors
    const background = this.findBackgroundColor(sortedColors);
    const text = this.findTextColor(sortedColors, background);
    const primary = this.findPrimaryColor(sortedColors, [background, text]);
    const secondary = this.findSecondaryColor(sortedColors, [background, text, primary]);
    const accent = this.findAccentColor(sortedColors, [background, text, primary, secondary]);
    const muted = this.generateMutedColor(background, text);

    return {
      primary,
      secondary,
      accent,
      text,
      background,
      muted
    };
  }

  /**
   * Analyzes typography patterns using computer vision
   */
  private async analyzeTypographyVisually(): Promise<TypographyPattern> {
    // Detect text regions and analyze their properties
    const textRegions = await this.detectTextRegions();
    
    // Analyze font characteristics
    const fontFamilies = this.analyzeFontFamilies(textRegions);
    const headingStyles = this.analyzeHeadingStyles(textRegions);
    const bodyTextStyle = this.analyzeBodyTextStyle(textRegions);
    const emphasisStyles = this.analyzeEmphasisStyles(textRegions);
    const listStyles = this.analyzeListStyles(textRegions);

    return {
      fontFamilies,
      headingStyles,
      bodyTextStyle,
      emphasisStyles,
      listStyles
    };
  }

  /**
   * Analyzes layout patterns using computer vision
   */
  private async analyzeLayoutVisually(): Promise<LayoutPattern> {
    // Detect page structure
    const pageStructure = await this.detectPageStructure();
    
    // Analyze column layout
    const columnStructure = this.analyzeColumnStructure(pageStructure);
    
    // Extract spacing patterns
    const spacing = await this.analyzeSpacingVisually();
    
    // Detect margins
    const margins = this.detectMargins(pageStructure);

    return {
      pageConfig: {
        paperSize: 'a4', // Default, could be detected from aspect ratio
        orientation: this.canvas.width > this.canvas.height ? 'landscape' : 'portrait',
        margins: {
          top: margins.top,
          right: margins.right,
          bottom: margins.bottom,
          left: margins.left
        },
        columns: columnStructure.count,
        columnGap: columnStructure.gaps[0] || 20
      },
      columnStructure,
      spacing,
      margins: {
        top: margins.top,
        right: margins.right,
        bottom: margins.bottom,
        left: margins.left,
        unit: 'px'
      },
      pageBreaks: [] // Would need multi-page analysis
    };
  }

  /**
   * Analyzes spacing patterns using computer vision
   */
  private async analyzeSpacingVisually(): Promise<SpacingPattern> {
    const textRegions = await this.detectTextRegions();
    
    // Calculate line heights
    const lineHeights = this.calculateLineHeights(textRegions);
    const avgLineHeight = lineHeights.reduce((sum, h) => sum + h, 0) / lineHeights.length || 1.4;
    
    // Calculate paragraph spacing
    const paragraphSpacing = this.calculateParagraphSpacing(textRegions);
    
    // Calculate section spacing
    const sectionSpacing = this.calculateSectionSpacing(textRegions);
    
    // Calculate heading spacing
    const headingSpacing = this.calculateHeadingSpacing(textRegions);

    return {
      lineHeight: avgLineHeight,
      paragraphSpacing,
      sectionSpacing,
      headingSpacing
    };
  }

  /**
   * Extracts visual elements like headers, bullets, borders
   */
  private async extractVisualElements(): Promise<VisualElementAnalysis> {
    const headers = await this.detectHeaders();
    const bullets = await this.detectBullets();
    const borders = await this.detectBorders();
    const backgrounds = await this.detectBackgrounds();
    const emphasis = await this.detectVisualEmphasis();

    return {
      headers,
      bullets,
      borders,
      backgrounds,
      emphasis
    };
  }

  /**
   * Analyzes content density patterns
   */
  private async analyzeContentDensity(): Promise<ContentDensityAnalysis> {
    const textRegions = await this.detectTextRegions();
    
    // Calculate density metrics
    const totalTextArea = textRegions.reduce((sum, region) => sum + region.area, 0);
    const totalPageArea = this.canvas.width * this.canvas.height;
    const textCoverage = totalTextArea / totalPageArea;
    
    // Estimate words per square inch (assuming 72 DPI)
    const dpi = 72;
    const pageAreaInches = totalPageArea / (dpi * dpi);
    const estimatedWords = this.estimateWordCount(textRegions);
    const wordsPerSquareInch = estimatedWords / pageAreaInches;
    
    // Calculate line density
    const linesPerInch = this.calculateLinesPerInch(textRegions, dpi);
    
    // Calculate whitespace ratio
    const whitespaceRatio = 1 - textCoverage;
    
    // Calculate average line length
    const averageLineLength = this.calculateAverageLineLength(textRegions);
    
    // Calculate paragraph spacing
    const paragraphSpacing = this.calculateParagraphSpacing(textRegions);

    return {
      wordsPerSquareInch,
      linesPerInch,
      whitespaceRatio,
      textCoverage,
      averageLineLength,
      paragraphSpacing
    };
  }

  // Helper methods for computer vision analysis

  private async loadImageFromBase64(base64: string): Promise<any> {
    const buffer = Buffer.from(base64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    return await loadImage(buffer);
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private findBackgroundColor(colors: string[]): string {
    // Background is typically the most frequent color or white/near-white
    const whiteish = colors.find(color => {
      const rgb = this.hexToRgb(color);
      return rgb && rgb.r > 240 && rgb.g > 240 && rgb.b > 240;
    });
    
    return whiteish || colors[0] || '#ffffff';
  }

  private findTextColor(colors: string[], background: string): string {
    // Text color should have high contrast with background
    const backgroundRgb = this.hexToRgb(background);
    if (!backgroundRgb) return '#000000';
    
    const isLightBackground = (backgroundRgb.r + backgroundRgb.g + backgroundRgb.b) / 3 > 128;
    
    // Find darkest color for light backgrounds, lightest for dark backgrounds
    const textColor = colors.find(color => {
      const rgb = this.hexToRgb(color);
      if (!rgb) return false;
      
      const brightness = (rgb.r + rgb.g + rgb.b) / 3;
      return isLightBackground ? brightness < 100 : brightness > 200;
    });
    
    return textColor || (isLightBackground ? '#000000' : '#ffffff');
  }

  private findPrimaryColor(colors: string[], exclude: string[]): string {
    const candidate = colors.find(color => !exclude.includes(color));
    return candidate || '#0066cc';
  }

  private findSecondaryColor(colors: string[], exclude: string[]): string {
    const candidate = colors.find(color => !exclude.includes(color));
    return candidate || '#666666';
  }

  private findAccentColor(colors: string[], exclude: string[]): string {
    const candidate = colors.find(color => !exclude.includes(color));
    return candidate || '#ff6600';
  }

  private generateMutedColor(background: string, text: string): string {
    // Generate a muted color between background and text
    const bgRgb = this.hexToRgb(background);
    const textRgb = this.hexToRgb(text);
    
    if (!bgRgb || !textRgb) return '#f5f5f5';
    
    const r = Math.floor((bgRgb.r + textRgb.r) / 2);
    const g = Math.floor((bgRgb.g + textRgb.g) / 2);
    const b = Math.floor((bgRgb.b + textRgb.b) / 2);
    
    return this.rgbToHex(r, g, b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Text region detection and analysis methods
  private async detectTextRegions(): Promise<TextRegion[]> {
    // Simplified text region detection using edge detection and contour analysis
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const edges = this.detectEdges(imageData);
    const contours = this.findContours(edges);
    
    return contours
      .filter(contour => this.isLikelyTextRegion(contour))
      .map(contour => this.contourToTextRegion(contour));
  }

  private detectEdges(imageData: ImageData): ImageData {
    // Simple Sobel edge detection
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const edges = new ImageData(width, height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Convert to grayscale
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Sobel operators
        const gx = this.getGrayscaleAt(data, width, x - 1, y - 1) * -1 +
                   this.getGrayscaleAt(data, width, x - 1, y + 1) * -1 +
                   this.getGrayscaleAt(data, width, x + 1, y - 1) * 1 +
                   this.getGrayscaleAt(data, width, x + 1, y + 1) * 1;
        
        const gy = this.getGrayscaleAt(data, width, x - 1, y - 1) * -1 +
                   this.getGrayscaleAt(data, width, x, y - 1) * -2 +
                   this.getGrayscaleAt(data, width, x + 1, y - 1) * -1 +
                   this.getGrayscaleAt(data, width, x - 1, y + 1) * 1 +
                   this.getGrayscaleAt(data, width, x, y + 1) * 2 +
                   this.getGrayscaleAt(data, width, x + 1, y + 1) * 1;
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const edgeValue = magnitude > 50 ? 255 : 0;
        
        edges.data[idx] = edgeValue;
        edges.data[idx + 1] = edgeValue;
        edges.data[idx + 2] = edgeValue;
        edges.data[idx + 3] = 255;
      }
    }
    
    return edges;
  }

  private getGrayscaleAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
    const idx = (y * width + x) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }

  private findContours(edges: ImageData): Contour[] {
    // Simplified contour detection
    const contours: Contour[] = [];
    const visited = new Set<string>();
    
    for (let y = 0; y < edges.height; y++) {
      for (let x = 0; x < edges.width; x++) {
        const key = `${x},${y}`;
        if (!visited.has(key) && this.isEdgePixel(edges, x, y)) {
          const contour = this.traceContour(edges, x, y, visited);
          if (contour.points.length > 10) { // Filter small contours
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  }

  private isEdgePixel(edges: ImageData, x: number, y: number): boolean {
    const idx = (y * edges.width + x) * 4;
    return edges.data[idx] > 128;
  }

  private traceContour(edges: ImageData, startX: number, startY: number, visited: Set<string>): Contour {
    const points: { x: number; y: number }[] = [];
    const stack = [{ x: startX, y: startY }];
    
    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key) || !this.isEdgePixel(edges, x, y)) continue;
      
      visited.add(key);
      points.push({ x, y });
      
      // Add neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < edges.width && ny >= 0 && ny < edges.height) {
            stack.push({ x: nx, y: ny });
          }
        }
      }
    }
    
    return { points, bounds: this.calculateBounds(points) };
  }

  private calculateBounds(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private isLikelyTextRegion(contour: Contour): boolean {
    const { width, height } = contour.bounds;
    const aspectRatio = width / height;
    
    // Text regions typically have certain aspect ratios and sizes
    return width > 20 && height > 8 && aspectRatio > 0.5 && aspectRatio < 20;
  }

  private contourToTextRegion(contour: Contour): TextRegion {
    return {
      bounds: contour.bounds,
      area: contour.bounds.width * contour.bounds.height,
      aspectRatio: contour.bounds.width / contour.bounds.height,
      estimatedFontSize: Math.max(8, Math.min(24, contour.bounds.height * 0.8)),
      isHeading: contour.bounds.height > 20,
      isBold: false, // Would need more sophisticated analysis
      alignment: this.detectAlignment(contour)
    };
  }

  private detectAlignment(contour: Contour): 'left' | 'center' | 'right' {
    // Simplified alignment detection based on position
    const centerX = this.canvas.width / 2;
    const regionCenterX = contour.bounds.x + contour.bounds.width / 2;
    
    if (Math.abs(regionCenterX - centerX) < 50) return 'center';
    if (regionCenterX > centerX + 100) return 'right';
    return 'left';
  }

  // Fallback text-based analysis for when computer vision fails
  private async performTextBasedAnalysis(content: ExtractedContent): Promise<VisualAnalysisResult> {
    return {
      colorScheme: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#0066cc',
        text: '#000000',
        background: '#ffffff',
        muted: '#f5f5f5'
      },
      typography: {
        fontFamilies: [
          { name: 'Arial', usage: 'body', fallbacks: ['Helvetica', 'sans-serif'] },
          { name: 'Arial Bold', usage: 'heading', fallbacks: ['Helvetica Bold', 'sans-serif'] }
        ],
        headingStyles: content.structure.headings.map(heading => ({
          level: heading.level,
          fontSize: 16 + (4 - heading.level) * 2,
          fontWeight: 700,
          fontFamily: 'Arial Bold',
          color: '#000000',
          marginTop: 16,
          marginBottom: 8
        })),
        bodyTextStyle: {
          fontSize: 12,
          fontWeight: 400,
          fontFamily: 'Arial',
          color: '#000000',
          lineHeight: 1.4,
          textAlign: 'left'
        },
        emphasisStyles: [{
          type: 'bold',
          style: {
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'Arial Bold',
            color: '#000000',
            lineHeight: 1.4,
            textAlign: 'left'
          },
          usage: 'Key terms and important concepts'
        }],
        listStyles: [{
          type: 'unordered',
          marker: '•',
          indentation: 20,
          spacing: 4,
          nestedLevels: 3
        }]
      },
      layout: {
        pageConfig: {
          paperSize: 'a4',
          orientation: 'portrait',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          columns: 1,
          columnGap: 20
        },
        columnStructure: {
          count: 1,
          widths: [100],
          gaps: [],
          alignment: 'left'
        },
        spacing: {
          lineHeight: 1.4,
          paragraphSpacing: 12,
          sectionSpacing: 24,
          headingSpacing: { before: 16, after: 8 }
        },
        margins: { top: 20, right: 20, bottom: 20, left: 20, unit: 'px' },
        pageBreaks: []
      },
      spacing: {
        lineHeight: 1.4,
        paragraphSpacing: 12,
        sectionSpacing: 24,
        headingSpacing: { before: 16, after: 8 }
      },
      visualElements: {
        headers: [],
        bullets: [],
        borders: [],
        backgrounds: [],
        emphasis: []
      },
      contentDensity: {
        wordsPerSquareInch: 50,
        linesPerInch: 6,
        whitespaceRatio: 0.4,
        textCoverage: 0.6,
        averageLineLength: 80,
        paragraphSpacing: 12
      }
    };
  }

  // Additional helper methods would be implemented here for:
  // - detectPageStructure()
  // - analyzeColumnStructure()
  // - detectMargins()
  // - calculateLineHeights()
  // - calculateParagraphSpacing()
  // - calculateSectionSpacing()
  // - calculateHeadingSpacing()
  // - detectHeaders()
  // - detectBullets()
  // - detectBorders()
  // - detectBackgrounds()
  // - detectVisualEmphasis()
  // - analyzeFontFamilies()
  // - analyzeHeadingStyles()
  // - analyzeBodyTextStyle()
  // - analyzeEmphasisStyles()
  // - analyzeListStyles()
  // - estimateWordCount()
  // - calculateLinesPerInch()
  // - calculateAverageLineLength()

  // Placeholder implementations for brevity - these would contain the actual computer vision logic
  private async detectPageStructure() { return { regions: [] }; }
  private analyzeColumnStructure(structure: any) { return { count: 1, widths: [100], gaps: [], alignment: 'left' as const }; }
  private detectMargins(structure: any) { return { top: 20, right: 20, bottom: 20, left: 20 }; }
  private calculateLineHeights(regions: TextRegion[]) { return [1.4]; }
  private calculateParagraphSpacing(regions: TextRegion[]) { return 12; }
  private calculateSectionSpacing(regions: TextRegion[]) { return 24; }
  private calculateHeadingSpacing(regions: TextRegion[]) { return { before: 16, after: 8 }; }
  private async detectHeaders(): Promise<HeaderVisualAnalysis[]> { return []; }
  private async detectBullets(): Promise<BulletVisualAnalysis[]> { return []; }
  private async detectBorders(): Promise<BorderPattern[]> { return []; }
  private async detectBackgrounds(): Promise<BackgroundPattern[]> { return []; }
  private async detectVisualEmphasis(): Promise<VisualEmphasis[]> { return []; }
  private analyzeFontFamilies(regions: TextRegion[]): FontFamily[] { return []; }
  private analyzeHeadingStyles(regions: TextRegion[]): HeadingStyle[] { return []; }
  private analyzeBodyTextStyle(regions: TextRegion[]): TextStyle { return { fontSize: 12, fontWeight: 400, fontFamily: 'Arial', color: '#000000', lineHeight: 1.4, textAlign: 'left' }; }
  private analyzeEmphasisStyles(regions: TextRegion[]) { return []; }
  private analyzeListStyles(regions: TextRegion[]) { return []; }
  private estimateWordCount(regions: TextRegion[]) { return 100; }
  private calculateLinesPerInch(regions: TextRegion[], dpi: number) { return 6; }
  private calculateAverageLineLength(regions: TextRegion[]) { return 80; }
}

// Supporting interfaces
interface TextRegion {
  bounds: { x: number; y: number; width: number; height: number };
  area: number;
  aspectRatio: number;
  estimatedFontSize: number;
  isHeading: boolean;
  isBold: boolean;
  alignment: 'left' | 'center' | 'right';
}

interface Contour {
  points: { x: number; y: number }[];
  bounds: { x: number; y: number; width: number; height: number };
}
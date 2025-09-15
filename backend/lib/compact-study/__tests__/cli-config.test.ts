// Tests for CLI Configuration System

import { 
  CLIConfig, 
  ConfigValidator, 
  CLIArgumentParser, 
  DEFAULT_CLI_CONFIG,
  ValidationResult 
} from '../cli-config';

describe('ConfigValidator', () => {
  describe('validate', () => {
    it('should validate a complete valid configuration', () => {
      const config: CLIConfig = {
        layout: 'compact',
        columns: 2,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '10pt',
        margins: 'narrow',
        outputFormat: 'pdf',
      };

      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).toEqual(expect.objectContaining(config));
    });

    it('should reject invalid layout values', () => {
      const config = { layout: 'invalid' as any };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid layout: invalid. Must be one of: compact, standard');
    });

    it('should reject invalid column values', () => {
      const config = { columns: 5 as any };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid columns: 5. Must be one of: 1, 2, 3');
    });

    it('should reject invalid equation values', () => {
      const config = { equations: 'invalid' as any };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid equations: invalid. Must be one of: all, key, minimal');
    });

    it('should reject invalid example values', () => {
      const config = { examples: 'invalid' as any };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid examples: invalid. Must be one of: full, summary, references');
    });

    it('should reject invalid answer values', () => {
      const config = { answers: 'invalid' as any };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid answers: invalid. Must be one of: inline, appendix, separate');
    });

    it('should reject invalid font size values', () => {
      const config = { fontSize: '15pt' };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid fontSize: 15pt. Must be one of: 8pt, 9pt, 10pt, 11pt, 12pt');
    });

    it('should reject invalid margin values', () => {
      const config = { margins: 'invalid' as any };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid margins: invalid. Must be one of: narrow, normal, wide');
    });

    it('should reject invalid output format values', () => {
      const config = { outputFormat: 'invalid' as any };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid outputFormat: invalid. Must be one of: html, pdf, markdown, all');
    });

    it('should generate warnings for suboptimal configurations', () => {
      const config = { 
        layout: 'compact' as const, 
        columns: 1 as const,
        fontSize: '12pt'
      };
      
      const result = ConfigValidator.validate(config);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Single column layout may not provide optimal compactness. Consider using 2 columns.');
      expect(result.warnings).toContain('12pt font size may reduce compactness. Consider using 10pt or 11pt for better density.');
    });

    it('should handle empty configuration by applying defaults', () => {
      const result = ConfigValidator.validate({});
      
      expect(result.valid).toBe(true);
      expect(result.config).toEqual(DEFAULT_CLI_CONFIG);
    });
  });

  describe('applyDefaults', () => {
    it('should apply all default values to empty config', () => {
      const result = ConfigValidator.applyDefaults({});
      
      expect(result).toEqual(DEFAULT_CLI_CONFIG);
    });

    it('should preserve provided values and apply defaults for missing ones', () => {
      const partialConfig = { 
        layout: 'standard' as const, 
        columns: 3 as const 
      };
      
      const result = ConfigValidator.applyDefaults(partialConfig);
      
      expect(result.layout).toBe('standard');
      expect(result.columns).toBe(3);
      expect(result.equations).toBe(DEFAULT_CLI_CONFIG.equations);
      expect(result.examples).toBe(DEFAULT_CLI_CONFIG.examples);
    });
  });

  describe('toLayoutConfig', () => {
    it('should convert CLI config to layout config correctly', () => {
      const cliConfig: CLIConfig = {
        layout: 'compact',
        columns: 2,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '10pt',
        margins: 'narrow',
        outputFormat: 'pdf',
      };

      const layoutConfig = ConfigValidator.toLayoutConfig(cliConfig);

      expect(layoutConfig.columns).toBe(2);
      expect(layoutConfig.typography.fontSize).toBe(10);
      expect(layoutConfig.typography.lineHeight).toBe(1.15);
      expect(layoutConfig.spacing.paragraphSpacing).toBe(0.25);
      expect(layoutConfig.margins.top).toBe(0.5);
      expect(layoutConfig.mathRendering.displayEquations.numbered).toBe(true);
    });

    it('should handle standard layout with different settings', () => {
      const cliConfig: CLIConfig = {
        layout: 'standard',
        columns: 1,
        equations: 'key',
        examples: 'summary',
        answers: 'appendix',
        fontSize: '11pt',
        margins: 'normal',
        outputFormat: 'html',
      };

      const layoutConfig = ConfigValidator.toLayoutConfig(cliConfig);

      expect(layoutConfig.columns).toBe(1);
      expect(layoutConfig.typography.fontSize).toBe(11);
      expect(layoutConfig.typography.lineHeight).toBe(1.25);
      expect(layoutConfig.spacing.paragraphSpacing).toBe(0.35);
      expect(layoutConfig.margins.top).toBe(1.0);
      expect(layoutConfig.mathRendering.displayEquations.numbered).toBe(false);
    });
  });
});

describe('CLIArgumentParser', () => {
  describe('parse', () => {
    it('should parse all CLI arguments correctly', () => {
      const args = [
        '--layout', 'compact',
        '--columns', '2',
        '--equations', 'all',
        '--examples', 'full',
        '--answers', 'inline',
        '--font-size', '10pt',
        '--margins', 'narrow',
        '--output-format', 'pdf',
        '--config', 'config.json',
        '--output-dir', './output',
        '--verbose'
      ];

      const result = CLIArgumentParser.parse(args);

      expect(result).toEqual({
        layout: 'compact',
        columns: 2,
        equations: 'all',
        examples: 'full',
        answers: 'inline',
        fontSize: '10pt',
        margins: 'narrow',
        outputFormat: 'pdf',
        configFile: 'config.json',
        outputDir: './output',
        verbose: true,
      });
    });

    it('should handle partial arguments', () => {
      const args = ['--layout', 'standard', '--columns', '3', '--verbose'];

      const result = CLIArgumentParser.parse(args);

      expect(result).toEqual({
        layout: 'standard',
        columns: 3,
        verbose: true,
      });
    });

    it('should ignore invalid argument values', () => {
      const args = [
        '--layout', 'invalid',
        '--columns', 'invalid',
        '--font-size', 'invalid'
      ];

      const result = CLIArgumentParser.parse(args);

      expect(result).toEqual({});
    });

    it('should handle missing argument values', () => {
      const args = ['--layout', '--columns'];

      const result = CLIArgumentParser.parse(args);

      expect(result).toEqual({});
    });

    it('should ignore unknown arguments', () => {
      const args = [
        '--layout', 'compact',
        '--unknown-flag', 'value',
        '--columns', '2'
      ];

      const result = CLIArgumentParser.parse(args);

      expect(result).toEqual({
        layout: 'compact',
        columns: 2,
      });
    });
  });

  describe('getHelpText', () => {
    it('should return help text', () => {
      const helpText = CLIArgumentParser.getHelpText();
      
      expect(helpText).toContain('Compact Study Generator CLI');
      expect(helpText).toContain('--layout');
      expect(helpText).toContain('--columns');
      expect(helpText).toContain('Examples:');
    });
  });
});

describe('DEFAULT_CLI_CONFIG', () => {
  it('should have all required properties', () => {
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('layout');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('columns');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('equations');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('examples');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('answers');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('fontSize');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('margins');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('outputFormat');
    expect(DEFAULT_CLI_CONFIG).toHaveProperty('verbose');
  });

  it('should have valid default values', () => {
    const validation = ConfigValidator.validate(DEFAULT_CLI_CONFIG);
    
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
// Tests for CLI Interface

import { CompactStudyCLI, CLIOptions } from '../cli-interface';
import { ConfigFileManager } from '../config-file-manager';
import { DEFAULT_CLI_CONFIG } from '../cli-config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock console methods to avoid test output noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('CompactStudyCLI', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'compact-study-cli-test-'));
    testFile = path.join(tempDir, 'test.pdf');
    await fs.promises.writeFile(testFile, 'test content');
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('run', () => {
    it('should handle help flag', async () => {
      const options = await CompactStudyCLI.run(['--help']);
      
      expect(options.showHelp).toBe(true);
      expect(options.showVersion).toBe(false);
      expect(options.inputFiles).toHaveLength(0);
    });

    it('should handle version flag', async () => {
      const options = await CompactStudyCLI.run(['--version']);
      
      expect(options.showVersion).toBe(true);
      expect(options.showHelp).toBe(false);
      expect(options.inputFiles).toHaveLength(0);
    });

    it('should handle create-config flag', async () => {
      const options = await CompactStudyCLI.run(['--create-config']);
      
      expect(options.createConfig).toBe(true);
      expect(options.showHelp).toBe(false);
      expect(options.inputFiles).toHaveLength(0);
    });

    it('should handle validate-config flag', async () => {
      const options = await CompactStudyCLI.run(['--validate-config']);
      
      expect(options.validateConfig).toBe(true);
      expect(options.showHelp).toBe(false);
      expect(options.inputFiles).toHaveLength(0);
    });

    it('should handle list-profiles flag', async () => {
      const options = await CompactStudyCLI.run(['--list-profiles']);
      
      expect(options.listProfiles).toBe(true);
      expect(options.showHelp).toBe(false);
      expect(options.inputFiles).toHaveLength(0);
    });

    it('should parse CLI arguments and input files', async () => {
      const args = [
        '--layout', 'compact',
        '--columns', '2',
        '--verbose',
        testFile,
        'another-file.pdf'
      ];

      const options = await CompactStudyCLI.run(args);
      
      expect(options.config.layout).toBe('compact');
      expect(options.config.columns).toBe(2);
      expect(options.config.verbose).toBe(true);
      expect(options.inputFiles).toEqual([testFile, 'another-file.pdf']);
      expect(options.showHelp).toBe(false);
    });

    it('should handle profile argument', async () => {
      // Create a config file with profiles
      const configPath = path.join(tempDir, 'test-config.json');
      await ConfigFileManager.createDefaultConfig(configPath);

      const args = [
        '--config', configPath,
        '--profile', 'ultra-compact',
        testFile
      ];

      const options = await CompactStudyCLI.run(args);
      
      expect(options.profileName).toBe('ultra-compact');
      expect(options.config.layout).toBe('compact');
      expect(options.config.columns).toBe(3); // From ultra-compact profile
      expect(options.inputFiles).toEqual([testFile]);
    });

    it('should merge CLI args with config file', async () => {
      const configPath = path.join(tempDir, 'test-config.json');
      const configFile = {
        defaults: {
          layout: 'standard' as const,
          fontSize: '11pt',
        },
        profiles: {},
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      await fs.promises.writeFile(configPath, JSON.stringify(configFile), 'utf-8');

      const args = [
        '--config', configPath,
        '--columns', '3',
        testFile
      ];

      const options = await CompactStudyCLI.run(args);
      
      expect(options.config.layout).toBe('standard'); // From config file
      expect(options.config.fontSize).toBe('11pt'); // From config file
      expect(options.config.columns).toBe(3); // From CLI args
      expect(options.inputFiles).toEqual([testFile]);
    });
  });

  describe('validateInputFiles', () => {
    it('should validate existing files', () => {
      const validation = CompactStudyCLI.validateInputFiles([testFile]);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect non-existent files', () => {
      const validation = CompactStudyCLI.validateInputFiles(['non-existent.pdf']);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Input file not found: non-existent.pdf');
    });

    it('should warn about unsupported file types', () => {
      const unsupportedFile = path.join(tempDir, 'test.xyz');
      fs.writeFileSync(unsupportedFile, 'content');

      const validation = CompactStudyCLI.validateInputFiles([unsupportedFile]);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.includes('Unsupported file type'))).toBe(true);
    });

    it('should warn about empty files', () => {
      const emptyFile = path.join(tempDir, 'empty.pdf');
      fs.writeFileSync(emptyFile, '');

      const validation = CompactStudyCLI.validateInputFiles([emptyFile]);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain(`Empty file: ${emptyFile}`);
    });

    it('should require at least one input file', () => {
      const validation = CompactStudyCLI.validateInputFiles([]);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No input files specified');
    });
  });

  describe('ensureOutputDirectory', () => {
    it('should create output directory if it does not exist', async () => {
      const outputDir = path.join(tempDir, 'output');
      
      await CompactStudyCLI.ensureOutputDirectory(outputDir);
      
      expect(fs.existsSync(outputDir)).toBe(true);
      expect(fs.statSync(outputDir).isDirectory()).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      const outputDir = path.join(tempDir, 'existing');
      fs.mkdirSync(outputDir);
      
      await expect(CompactStudyCLI.ensureOutputDirectory(outputDir))
        .resolves.not.toThrow();
    });

    it('should create nested directories', async () => {
      const outputDir = path.join(tempDir, 'nested', 'output', 'dir');
      
      await CompactStudyCLI.ensureOutputDirectory(outputDir);
      
      expect(fs.existsSync(outputDir)).toBe(true);
    });
  });

  describe('generateOutputFilename', () => {
    it('should generate filename for single input file', () => {
      const inputFiles = ['/path/to/probability.pdf'];
      const config = { ...DEFAULT_CLI_CONFIG, layout: 'compact' as const };
      
      const filename = CompactStudyCLI.generateOutputFilename(inputFiles, config);
      
      expect(filename).toBe('probability_compact.pdf');
    });

    it('should generate filename for multiple input files', () => {
      const inputFiles = ['file1.pdf', 'file2.pdf'];
      const config = { ...DEFAULT_CLI_CONFIG, layout: 'standard' as const };
      
      const filename = CompactStudyCLI.generateOutputFilename(inputFiles, config);
      
      expect(filename).toBe('study_compact_standard.pdf');
    });

    it('should handle different output formats', () => {
      const inputFiles = ['test.pdf'];
      
      const htmlConfig = { ...DEFAULT_CLI_CONFIG, outputFormat: 'html' as const };
      const pdfConfig = { ...DEFAULT_CLI_CONFIG, outputFormat: 'pdf' as const };
      const mdConfig = { ...DEFAULT_CLI_CONFIG, outputFormat: 'markdown' as const };
      const allConfig = { ...DEFAULT_CLI_CONFIG, outputFormat: 'all' as const };
      
      expect(CompactStudyCLI.generateOutputFilename(inputFiles, htmlConfig)).toBe('test_compact.html');
      expect(CompactStudyCLI.generateOutputFilename(inputFiles, pdfConfig)).toBe('test_compact.pdf');
      expect(CompactStudyCLI.generateOutputFilename(inputFiles, mdConfig)).toBe('test_compact.md');
      expect(CompactStudyCLI.generateOutputFilename(inputFiles, allConfig)).toBe('test_compact');
    });
  });

  describe('printConfigSummary', () => {
    beforeEach(() => {
      // Clear mock calls before each test
      (console.log as jest.Mock).mockClear();
    });

    it('should print config summary when verbose is true', () => {
      const config = DEFAULT_CLI_CONFIG;
      
      CompactStudyCLI.printConfigSummary(config, true);
      
      expect(console.log).toHaveBeenCalledWith('\nConfiguration Summary:');
      expect(console.log).toHaveBeenCalledWith(`  Layout: ${config.layout}`);
      expect(console.log).toHaveBeenCalledWith(`  Columns: ${config.columns}`);
    });

    it('should not print anything when verbose is false', () => {
      const config = DEFAULT_CLI_CONFIG;
      
      CompactStudyCLI.printConfigSummary(config, false);
      
      // Should not have called console.log at all
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('extractInputFiles', () => {
    it('should extract input files from mixed arguments', () => {
      const args = [
        '--layout', 'compact',
        'file1.pdf',
        '--columns', '2',
        'file2.pdf',
        '--verbose',
        'file3.pdf'
      ];

      // Use reflection to access private method
      const extractInputFiles = (CompactStudyCLI as any).extractInputFiles;
      const inputFiles = extractInputFiles(args);
      
      expect(inputFiles).toEqual(['file1.pdf', 'file2.pdf', 'file3.pdf']);
    });

    it('should ignore flag arguments', () => {
      const args = [
        '--layout', 'compact',
        '--columns', '2',
        '--verbose'
      ];

      const extractInputFiles = (CompactStudyCLI as any).extractInputFiles;
      const inputFiles = extractInputFiles(args);
      
      expect(inputFiles).toEqual([]);
    });

    it('should handle arguments without values', () => {
      const args = [
        'file1.pdf',
        '--verbose',
        'file2.pdf',
        '--help'
      ];

      const extractInputFiles = (CompactStudyCLI as any).extractInputFiles;
      const inputFiles = extractInputFiles(args);
      
      expect(inputFiles).toEqual(['file1.pdf', 'file2.pdf']);
    });
  });

  describe('handleSpecialCommands', () => {
    it('should handle help command', async () => {
      const options: CLIOptions = {
        inputFiles: [],
        config: DEFAULT_CLI_CONFIG,
        showHelp: true,
        showVersion: false,
        createConfig: false,
        validateConfig: false,
        listProfiles: false,
      };

      await CompactStudyCLI.handleSpecialCommands(options);
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Compact Study Generator CLI'));
    });

    it('should handle version command', async () => {
      const options: CLIOptions = {
        inputFiles: [],
        config: DEFAULT_CLI_CONFIG,
        showHelp: false,
        showVersion: true,
        createConfig: false,
        validateConfig: false,
        listProfiles: false,
      };

      await CompactStudyCLI.handleSpecialCommands(options);
      
      expect(console.log).toHaveBeenCalledWith('Compact Study Generator v1.0.0');
    });

    it('should handle create-config command', async () => {
      const options: CLIOptions = {
        inputFiles: [],
        config: DEFAULT_CLI_CONFIG,
        showHelp: false,
        showVersion: false,
        createConfig: true,
        validateConfig: false,
        listProfiles: false,
      };

      await CompactStudyCLI.handleSpecialCommands(options);
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Default configuration file created'));
    });
  });
});
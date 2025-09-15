// Tests for Configuration File Manager

import { ConfigFileManager } from '../config-file-manager';
import { CLIConfig, DEFAULT_CLI_CONFIG } from '../cli-config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigFileManager', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'compact-study-test-'));
    configPath = path.join(tempDir, 'test-config.json');
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createDefaultConfig', () => {
    it('should create a default configuration file', async () => {
      const createdPath = await ConfigFileManager.createDefaultConfig(configPath);
      
      expect(createdPath).toBe(configPath);
      expect(fs.existsSync(configPath)).toBe(true);
      
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config).toHaveProperty('defaults');
      expect(config).toHaveProperty('profiles');
      expect(config).toHaveProperty('metadata');
      expect(config.metadata).toHaveProperty('version');
      expect(config.metadata).toHaveProperty('createdAt');
    });

    it('should include predefined profiles', async () => {
      await ConfigFileManager.createDefaultConfig(configPath);
      
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config.profiles).toHaveProperty('ultra-compact');
      expect(config.profiles).toHaveProperty('readable');
      expect(config.profiles).toHaveProperty('print-friendly');
    });
  });

  describe('loadConfig', () => {
    it('should load configuration from existing file', async () => {
      const testConfig = {
        layout: 'standard' as const,
        columns: 3 as const,
        fontSize: '11pt',
      };

      const configFile = {
        defaults: testConfig,
        profiles: {},
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      await fs.promises.writeFile(configPath, JSON.stringify(configFile), 'utf-8');
      
      const loadedConfig = await ConfigFileManager.loadConfig(configPath);
      
      expect(loadedConfig).toEqual(testConfig);
    });

    it('should return empty config for non-existent file', async () => {
      const loadedConfig = await ConfigFileManager.loadConfig('non-existent.json');
      
      expect(loadedConfig).toEqual({});
    });

    it('should throw error for invalid JSON', async () => {
      await fs.promises.writeFile(configPath, 'invalid json', 'utf-8');
      
      await expect(ConfigFileManager.loadConfig(configPath))
        .rejects.toThrow('Failed to load configuration file');
    });

    it('should throw error for invalid config structure', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ invalid: true }), 'utf-8');
      
      await expect(ConfigFileManager.loadConfig(configPath))
        .rejects.toThrow('Invalid configuration file structure');
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file', async () => {
      const config: CLIConfig = {
        ...DEFAULT_CLI_CONFIG,
        layout: 'standard',
        columns: 3,
      };

      await ConfigFileManager.saveConfig(config, configPath);
      
      expect(fs.existsSync(configPath)).toBe(true);
      
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const savedConfig = JSON.parse(content);
      
      expect(savedConfig.defaults).toEqual(config);
      expect(savedConfig.metadata.version).toBe('1.0.0');
    });
  });

  describe('loadProfile', () => {
    beforeEach(async () => {
      const configFile = {
        defaults: DEFAULT_CLI_CONFIG,
        profiles: {
          'test-profile': {
            layout: 'standard' as const,
            columns: 1 as const,
            fontSize: '12pt',
          },
          'another-profile': {
            equations: 'minimal' as const,
            examples: 'summary' as const,
          },
        },
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      await fs.promises.writeFile(configPath, JSON.stringify(configFile), 'utf-8');
    });

    it('should load specific profile merged with defaults', async () => {
      const profile = await ConfigFileManager.loadProfile('test-profile', configPath);
      
      expect(profile.layout).toBe('standard');
      expect(profile.columns).toBe(1);
      expect(profile.fontSize).toBe('12pt');
      expect(profile.equations).toBe(DEFAULT_CLI_CONFIG.equations); // From defaults
    });

    it('should throw error for non-existent profile', async () => {
      await expect(ConfigFileManager.loadProfile('non-existent', configPath))
        .rejects.toThrow("Profile 'non-existent' not found");
    });

    it('should throw error for non-existent config file', async () => {
      await expect(ConfigFileManager.loadProfile('test-profile', 'non-existent.json'))
        .rejects.toThrow('Configuration file not found');
    });
  });

  describe('saveProfile', () => {
    it('should save profile to existing config file', async () => {
      await ConfigFileManager.createDefaultConfig(configPath);
      
      const profileConfig = {
        layout: 'compact' as const,
        columns: 3 as const,
        fontSize: '9pt',
      };

      await ConfigFileManager.saveProfile('new-profile', profileConfig, configPath);
      
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config.profiles['new-profile']).toEqual(profileConfig);
    });

    it('should create config file if it does not exist', async () => {
      const profileConfig = {
        layout: 'standard' as const,
        fontSize: '11pt',
      };

      await ConfigFileManager.saveProfile('test-profile', profileConfig, configPath);
      
      expect(fs.existsSync(configPath)).toBe(true);
      
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config.profiles['test-profile']).toEqual(profileConfig);
    });
  });

  describe('listProfiles', () => {
    it('should return list of available profiles', async () => {
      const configFile = {
        defaults: {},
        profiles: {
          'profile1': {},
          'profile2': {},
          'profile3': {},
        },
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      await fs.promises.writeFile(configPath, JSON.stringify(configFile), 'utf-8');
      
      const profiles = await ConfigFileManager.listProfiles(configPath);
      
      expect(profiles).toEqual(['profile1', 'profile2', 'profile3']);
    });

    it('should return empty array for non-existent file', async () => {
      const profiles = await ConfigFileManager.listProfiles('non-existent.json');
      
      expect(profiles).toEqual([]);
    });
  });

  describe('mergeWithConfigFile', () => {
    beforeEach(async () => {
      const configFile = {
        defaults: {
          layout: 'standard' as const,
          columns: 1 as const,
          fontSize: '11pt',
        },
        profiles: {
          'test-profile': {
            layout: 'compact' as const,
            columns: 3 as const,
          },
        },
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      await fs.promises.writeFile(configPath, JSON.stringify(configFile), 'utf-8');
    });

    it('should merge CLI args with config file defaults', async () => {
      const cliArgs = {
        equations: 'minimal' as const,
        examples: 'summary' as const,
      };

      const merged = await ConfigFileManager.mergeWithConfigFile(cliArgs, configPath);
      
      expect(merged.layout).toBe('standard'); // From config file
      expect(merged.columns).toBe(1); // From config file
      expect(merged.fontSize).toBe('11pt'); // From config file
      expect(merged.equations).toBe('minimal'); // From CLI args
      expect(merged.examples).toBe('summary'); // From CLI args
      expect(merged.answers).toBe(DEFAULT_CLI_CONFIG.answers); // From defaults
    });

    it('should merge CLI args with specific profile', async () => {
      const cliArgs = {
        fontSize: '10pt',
        equations: 'all' as const,
      };

      const merged = await ConfigFileManager.mergeWithConfigFile(cliArgs, configPath, 'test-profile');
      
      expect(merged.layout).toBe('compact'); // From profile
      expect(merged.columns).toBe(3); // From profile
      expect(merged.fontSize).toBe('10pt'); // From CLI args (overrides profile)
      expect(merged.equations).toBe('all'); // From CLI args
    });

    it('should prioritize CLI args over config file', async () => {
      const cliArgs = {
        layout: 'compact' as const,
        columns: 2 as const,
      };

      const merged = await ConfigFileManager.mergeWithConfigFile(cliArgs, configPath);
      
      expect(merged.layout).toBe('compact'); // CLI overrides config file
      expect(merged.columns).toBe(2); // CLI overrides config file
      expect(merged.fontSize).toBe('11pt'); // From config file
    });

    it('should handle non-existent config file gracefully', async () => {
      const cliArgs = {
        layout: 'compact' as const,
        columns: 2 as const,
      };

      const merged = await ConfigFileManager.mergeWithConfigFile(cliArgs, 'non-existent.json');
      
      expect(merged.layout).toBe('compact');
      expect(merged.columns).toBe(2);
      expect(merged.equations).toBe(DEFAULT_CLI_CONFIG.equations); // From defaults
    });

    it('should throw error for invalid merged configuration', async () => {
      const cliArgs = {
        layout: 'invalid' as any,
      };

      await expect(ConfigFileManager.mergeWithConfigFile(cliArgs, configPath))
        .rejects.toThrow('Configuration validation failed');
    });
  });

  describe('validateConfigFile', () => {
    it('should validate correct config file', async () => {
      await ConfigFileManager.createDefaultConfig(configPath);
      
      const validation = await ConfigFileManager.validateConfigFile(configPath);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid config file structure', async () => {
      await fs.promises.writeFile(configPath, JSON.stringify({ invalid: true }), 'utf-8');
      
      const validation = await ConfigFileManager.validateConfigFile(configPath);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid configuration file structure');
    });

    it('should detect invalid profile configurations', async () => {
      const configFile = {
        defaults: {},
        profiles: {
          'invalid-profile': {
            layout: 'invalid',
            columns: 5,
          },
        },
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
      };

      await fs.promises.writeFile(configPath, JSON.stringify(configFile), 'utf-8');
      
      const validation = await ConfigFileManager.validateConfigFile(configPath);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes("Profile 'invalid-profile'"))).toBe(true);
    });

    it('should handle non-existent file', async () => {
      const validation = await ConfigFileManager.validateConfigFile('non-existent.json');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Configuration file does not exist');
    });
  });
});
// CLI Configuration System Usage Example

import { 
  CompactStudyCLI, 
  ConfigFileManager, 
  ConfigValidator,
  CLIArgumentParser,
  DEFAULT_CLI_CONFIG 
} from './index';

/**
 * Example: Basic CLI usage
 */
async function basicCLIExample() {
  console.log('=== Basic CLI Usage Example ===');
  
  // Simulate command line arguments
  const args = [
    '--layout', 'compact',
    '--columns', '2',
    '--equations', 'all',
    '--examples', 'full',
    '--font-size', '10pt',
    '--margins', 'narrow',
    '--output-format', 'pdf',
    '--verbose',
    'probability.pdf',
    'relations.pdf'
  ];

  try {
    // Parse CLI arguments
    const options = await CompactStudyCLI.run(args);
    
    console.log('Parsed CLI Options:');
    console.log('- Input Files:', options.inputFiles);
    console.log('- Layout:', options.config.layout);
    console.log('- Columns:', options.config.columns);
    console.log('- Equations:', options.config.equations);
    console.log('- Examples:', options.config.examples);
    console.log('- Font Size:', options.config.fontSize);
    console.log('- Margins:', options.config.margins);
    console.log('- Output Format:', options.config.outputFormat);
    console.log('- Verbose:', options.config.verbose);

    // Validate input files (would normally check if files exist)
    const fileValidation = CompactStudyCLI.validateInputFiles(options.inputFiles);
    console.log('\nFile Validation:');
    console.log('- Valid:', fileValidation.valid);
    if (fileValidation.errors.length > 0) {
      console.log('- Errors:', fileValidation.errors);
    }
    if (fileValidation.warnings.length > 0) {
      console.log('- Warnings:', fileValidation.warnings);
    }

    // Generate output filename
    const outputFilename = CompactStudyCLI.generateOutputFilename(options.inputFiles, options.config);
    console.log('- Generated Output Filename:', outputFilename);

    // Convert to layout config
    const layoutConfig = ConfigValidator.toLayoutConfig(options.config);
    console.log('\nLayout Configuration:');
    console.log('- Paper Size:', layoutConfig.paperSize);
    console.log('- Columns:', layoutConfig.columns);
    console.log('- Font Size:', layoutConfig.typography.fontSize);
    console.log('- Line Height:', layoutConfig.typography.lineHeight);
    console.log('- Paragraph Spacing:', layoutConfig.spacing.paragraphSpacing);
    console.log('- Margins:', layoutConfig.margins);

  } catch (error) {
    console.error('CLI Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Example: Configuration file usage
 */
async function configFileExample() {
  console.log('\n=== Configuration File Example ===');
  
  try {
    // Create a default configuration file
    console.log('Creating default configuration file...');
    const configPath = await ConfigFileManager.createDefaultConfig('./example-config.json');
    console.log('Configuration file created at:', configPath);

    // Load configuration from file
    const fileConfig = await ConfigFileManager.loadConfig('./example-config.json');
    console.log('\nLoaded configuration from file:');
    console.log(JSON.stringify(fileConfig, null, 2));

    // List available profiles
    const profiles = await ConfigFileManager.listProfiles('./example-config.json');
    console.log('\nAvailable profiles:', profiles);

    // Load a specific profile
    if (profiles.length > 0) {
      const profileConfig = await ConfigFileManager.loadProfile(profiles[0], './example-config.json');
      console.log(`\nLoaded profile '${profiles[0]}':`, profileConfig);
    }

    // Merge CLI args with config file
    const cliArgs = {
      fontSize: '11pt',
      verbose: true,
    };

    const mergedConfig = await ConfigFileManager.mergeWithConfigFile(
      cliArgs, 
      './example-config.json'
    );
    console.log('\nMerged configuration (CLI + file):');
    console.log(JSON.stringify(mergedConfig, null, 2));

    // Validate configuration file
    const validation = await ConfigFileManager.validateConfigFile('./example-config.json');
    console.log('\nConfiguration file validation:');
    console.log('- Valid:', validation.valid);
    if (validation.errors.length > 0) {
      console.log('- Errors:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.log('- Warnings:', validation.warnings);
    }

  } catch (error) {
    console.error('Config File Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Example: Configuration validation
 */
function configValidationExample() {
  console.log('\n=== Configuration Validation Example ===');

  // Valid configuration
  const validConfig = {
    layout: 'compact' as const,
    columns: 2 as const,
    equations: 'all' as const,
    examples: 'full' as const,
    fontSize: '10pt',
  };

  const validResult = ConfigValidator.validate(validConfig);
  console.log('Valid configuration result:');
  console.log('- Valid:', validResult.valid);
  console.log('- Errors:', validResult.errors);
  console.log('- Warnings:', validResult.warnings);

  // Invalid configuration
  const invalidConfig = {
    layout: 'invalid' as any,
    columns: 5 as any,
    equations: 'unknown' as any,
    fontSize: '20pt',
  };

  const invalidResult = ConfigValidator.validate(invalidConfig);
  console.log('\nInvalid configuration result:');
  console.log('- Valid:', invalidResult.valid);
  console.log('- Errors:', invalidResult.errors);
  console.log('- Warnings:', invalidResult.warnings);

  // Apply defaults
  const withDefaults = ConfigValidator.applyDefaults({ layout: 'standard' });
  console.log('\nConfiguration with defaults applied:');
  console.log(JSON.stringify(withDefaults, null, 2));
}

/**
 * Example: Argument parsing
 */
function argumentParsingExample() {
  console.log('\n=== Argument Parsing Example ===');

  const testArgs = [
    '--layout', 'compact',
    '--columns', '3',
    '--equations', 'key',
    '--examples', 'summary',
    '--font-size', '9pt',
    '--margins', 'wide',
    '--output-format', 'html',
    '--verbose'
  ];

  const parsed = CLIArgumentParser.parse(testArgs);
  console.log('Parsed arguments:');
  console.log(JSON.stringify(parsed, null, 2));

  // Show help text
  console.log('\nCLI Help Text:');
  console.log(CLIArgumentParser.getHelpText());
}

/**
 * Example: Special CLI commands
 */
async function specialCommandsExample() {
  console.log('\n=== Special Commands Example ===');

  // Help command
  const helpOptions = await CompactStudyCLI.run(['--help']);
  console.log('Help command result:');
  console.log('- Show Help:', helpOptions.showHelp);

  // Version command
  const versionOptions = await CompactStudyCLI.run(['--version']);
  console.log('Version command result:');
  console.log('- Show Version:', versionOptions.showVersion);

  // Create config command
  const createConfigOptions = await CompactStudyCLI.run(['--create-config']);
  console.log('Create config command result:');
  console.log('- Create Config:', createConfigOptions.createConfig);

  // List profiles command
  const listProfilesOptions = await CompactStudyCLI.run(['--list-profiles']);
  console.log('List profiles command result:');
  console.log('- List Profiles:', listProfilesOptions.listProfiles);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicCLIExample();
    await configFileExample();
    configValidationExample();
    argumentParsingExample();
    await specialCommandsExample();
    
    console.log('\n=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Example Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Export examples for use in other files
export {
  basicCLIExample,
  configFileExample,
  configValidationExample,
  argumentParsingExample,
  specialCommandsExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
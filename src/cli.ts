#!/usr/bin/env node

// CLI for Python to IGCSE Pseudocode Converter
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { convertPythonToIGCSE } from './converter';
import { ConversionOptions, VERSION } from './types';

/**
 * CLI アプリケーション
 */
class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * コマンドの設定
   */
  private setupCommands(): void {
    this.program
      .name('python2igcse')
      .description('Convert Python code to IGCSE Pseudocode')
      .version(VERSION);

    // メインの変換コマンド
    this.program
      .command('convert')
      .description('Convert Python file(s) to IGCSE Pseudocode')
      .argument('<input>', 'Input Python file or directory')
      .option('-o, --output <path>', 'Output file or directory')
      .option('-f, --format <format>', 'Output format (plain|markdown)', 'plain')
      .option('--indent-size <size>', 'Indentation size', '3')
      .option('--indent-type <type>', 'Indentation type (spaces|tabs)', 'spaces')
      .option('--line-ending <type>', 'Line ending type (lf|crlf)', 'lf')
      .option('--max-line-length <length>', 'Maximum line length', '80')
      .option('--no-beautify', 'Disable code beautification')
      .option('--strict', 'Enable strict mode')
      .option('--no-comments', 'Exclude comments from output')
      .option('--line-numbers', 'Include line numbers')
      .option('--no-preserve-whitespace', 'Do not preserve whitespace')
      .option('--lowercase-keywords', 'Use lowercase keywords')
      .option('--no-space-operators', 'No spaces around operators')
      .option('--no-space-commas', 'No spaces after commas')
      .option('--max-errors <count>', 'Maximum number of errors', '10')
      .option('--timeout <ms>', 'Conversion timeout in milliseconds', '30000')
      .option('--watch', 'Watch for file changes')
      .option('--verbose', 'Verbose output')
      .action(this.handleConvert.bind(this));

    // バッチ変換コマンド
    this.program
      .command('batch')
      .description('Convert multiple Python files')
      .argument('<pattern>', 'File pattern (glob)')
      .option('-o, --output-dir <dir>', 'Output directory', './output')
      .option('-f, --format <format>', 'Output format (plain|markdown)', 'plain')
      .option('--config <file>', 'Configuration file')
      .option('--parallel <count>', 'Number of parallel conversions', '4')
      .option('--verbose', 'Verbose output')
      .action(this.handleBatch.bind(this));

    // 検証コマンド
    this.program
      .command('validate')
      .description('Validate Python code for IGCSE conversion')
      .argument('<input>', 'Input Python file')
      .option('--strict', 'Enable strict validation')
      .option('--verbose', 'Verbose output')
      .action(this.handleValidate.bind(this));

    // 統計コマンド
    this.program
      .command('stats')
      .description('Show conversion statistics')
      .argument('<input>', 'Input Python file')
      .option('--detailed', 'Show detailed statistics')
      .action(this.handleStats.bind(this));

    // 設定コマンド
    this.program
      .command('config')
      .description('Manage configuration')
      .option('--init', 'Initialize configuration file')
      .option('--show', 'Show current configuration')
      .option('--set <key=value>', 'Set configuration value')
      .action(this.handleConfig.bind(this));
  }

  /**
   * 変換コマンドの処理
   */
  private async handleConvert(input: string, options: any): Promise<void> {
    try {
      if (options.verbose) {
        console.log(`Converting: ${input}`);
        console.log(`Options:`, options);
      }

      const conversionOptions = this.buildConversionOptions(options);
      const inputStat = await fs.stat(input);

      if (inputStat.isFile()) {
        await this.convertSingleFile(input, options.output, conversionOptions, options.verbose);
      } else if (inputStat.isDirectory()) {
        await this.convertDirectory(input, options.output, conversionOptions, options.verbose);
      } else {
        throw new Error(`Invalid input: ${input}`);
      }

      if (options.watch) {
        await this.watchFiles(input, options.output, conversionOptions, options.verbose);
      }

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * バッチ変換コマンドの処理
   */
  private async handleBatch(pattern: string, options: any): Promise<void> {
    try {
      const glob = await import('glob');
      const files = await glob.glob(pattern);
      
      if (files.length === 0) {
        console.log('No files found matching pattern:', pattern);
        return;
      }

      console.log(`Found ${files.length} files to convert`);
      
      const conversionOptions = await this.loadConfig(options.config);
      const outputDir = options.outputDir;
      
      await fs.mkdir(outputDir, { recursive: true });
      
      const parallelCount = parseInt(options.parallel);
      const chunks = this.chunkArray(files, parallelCount);
      
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(file => this.convertSingleFile(
            file,
            path.join(outputDir, this.getOutputFileName(file, conversionOptions.outputFormat || 'plain')),
            conversionOptions,
            options.verbose
          ))
        );
      }
      
      console.log(`Converted ${files.length} files to ${outputDir}`);
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 検証コマンドの処理
   */
  private async handleValidate(input: string, options: any): Promise<void> {
    try {
      const code = await fs.readFile(input, 'utf-8');
      const conversionOptions: ConversionOptions = {
        ...this.buildConversionOptions(options),
        strictMode: options.strict
      };
      
      const result = await convertPythonToIGCSE(code, conversionOptions);
      
      console.log(`Validation Results for: ${input}`);
      const hasErrors = result.parseResult.errors.length > 0;
      console.log(`Success: ${!hasErrors}`);
      
      if (result.parseResult.errors.length > 0) {
        console.log('\nErrors:');
        result.parseResult.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.message}${error.line ? ` (Line ${error.line})` : ''}`);
        });
      }
      
      if (result.parseResult.warnings.length > 0) {
        console.log('\nWarnings:');
        result.parseResult.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning.message}${warning.line ? ` (Line ${warning.line})` : ''}`);
        });
      }
      
      if (options.verbose && !hasErrors) {
        console.log('\nGenerated Code Preview:');
        console.log(result.code.split('\n').slice(0, 10).join('\n'));
        if (result.code.split('\n').length > 10) {
          console.log('...');
        }
      }
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 統計コマンドの処理
   */
  private async handleStats(input: string, options: any): Promise<void> {
    try {
      const code = await fs.readFile(input, 'utf-8');
      const result = await convertPythonToIGCSE(code);
      
      console.log(`Statistics for: ${input}`);
      console.log(`Parse Time: ${result.stats.parseTime}ms`);
      console.log(`Emit Time: ${result.stats.emitTime}ms`);
      console.log(`Conversion Time: ${result.stats.conversionTime}ms`);
      console.log(`Input Lines: ${result.stats.inputLines}`);
      console.log(`Output Lines: ${result.stats.outputLines}`);
      console.log(`Error Count: ${result.stats.errorCount}`);
      console.log(`Warning Count: ${result.stats.warningCount}`);
      
      if (options.detailed) {
        console.log('\nDetailed Analysis:');
        console.log(`Parse Errors: ${result.parseResult.errors.length}`);
        console.log(`Parse Warnings: ${result.parseResult.warnings.length}`);
        console.log(`Emit Errors: ${result.emitResult.errors?.length || 0}`);
        console.log(`Emit Warnings: ${result.emitResult.warnings?.length || 0}`);
      }
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 設定コマンドの処理
   */
  private async handleConfig(options: any): Promise<void> {
    const configPath = path.join(process.cwd(), '.python2igcse.json');
    
    try {
      if (options.init) {
        const defaultConfig = {
          outputFormat: 'plain',
          indentSize: 3,
          indentType: 'spaces',
          beautify: true,
          includeComments: true,
          uppercaseKeywords: true
        };
        
        await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`Configuration file created: ${configPath}`);
        return;
      }
      
      if (options.show) {
        try {
          const config = await fs.readFile(configPath, 'utf-8');
          console.log('Current configuration:');
          console.log(config);
        } catch {
          console.log('No configuration file found');
        }
        return;
      }
      
      if (options.set) {
        const [key, value] = options.set.split('=');
        if (!key || value === undefined) {
          throw new Error('Invalid format. Use: --set key=value');
        }
        
        let config = {};
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          config = JSON.parse(configContent);
        } catch {
          // Create new file if it doesn't exist
        }
        
        // 値の型変換
        let parsedValue: any = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = Number(value);
        
        (config as any)[key] = parsedValue;
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log(`Configuration updated: ${key} = ${parsedValue}`);
        return;
      }
      
      // デフォルトでヘルプを表示
      console.log('Use --init to create a configuration file');
      console.log('Use --show to display current configuration');
      console.log('Use --set key=value to update configuration');
      
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * 単一ファイルの変換
   */
  private async convertSingleFile(
    inputPath: string,
    outputPath: string | undefined,
    options: ConversionOptions,
    verbose: boolean
  ): Promise<void> {
    const code = await fs.readFile(inputPath, 'utf-8');
    const result = await convertPythonToIGCSE(code, options);
    
    const hasErrors = result.parseResult.errors.length > 0;
    if (hasErrors) {
      console.error(`Failed to convert ${inputPath}:`);
      result.parseResult.errors.forEach(error => {
        console.error(`  ${error.message}${error.line ? ` (Line ${error.line})` : ''}`);
      });
      return;
    }
    
    if (outputPath) {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, result.code);
      if (verbose) {
        console.log(`Converted: ${inputPath} -> ${outputPath}`);
      }
    } else {
      console.log(result.code);
    }
  }

  /**
   * ディレクトリの変換
   */
  private async convertDirectory(
    inputDir: string,
    outputDir: string | undefined,
    options: ConversionOptions,
    verbose: boolean
  ): Promise<void> {
    const files = await this.findPythonFiles(inputDir);
    const output = outputDir || path.join(inputDir, 'igcse-output');
    
    await fs.mkdir(output, { recursive: true });
    
    for (const file of files) {
      const relativePath = path.relative(inputDir, file);
      const outputPath = path.join(output, this.getOutputFileName(relativePath, options.outputFormat || 'plain'));
      
      await this.convertSingleFile(file, outputPath, options, verbose);
    }
    
    console.log(`Converted ${files.length} files to ${output}`);
  }

  /**
   * ファイル監視
   */
  private async watchFiles(
    inputPath: string,
    outputPath: string | undefined,
    options: ConversionOptions,
    verbose: boolean
  ): Promise<void> {
    const chokidar = await import('chokidar');
    
    console.log(`Watching for changes in: ${inputPath}`);
    
    const watcher = chokidar.watch(inputPath, {
      ignored: /node_modules/,
      persistent: true
    });
    
    watcher.on('change', async (filePath) => {
      if (path.extname(filePath) === '.py') {
        console.log(`File changed: ${filePath}`);
        try {
          const output = outputPath || this.getOutputFileName(filePath, options.outputFormat || 'plain');
          await this.convertSingleFile(filePath, output, options, verbose);
        } catch (error) {
          console.error('Conversion error:', error);
        }
      }
    });
    
    // Ctrl+C で終了
    process.on('SIGINT', () => {
      console.log('\nStopping file watcher...');
      watcher.close();
      process.exit(0);
    });
  }

  /**
   * Python ファイルの検索
   */
  private async findPythonFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...await this.findPythonFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * 出力ファイル名の生成
   */
  private getOutputFileName(inputPath: string, format: string): string {
    const ext = format === 'markdown' ? '.md' : '.txt';
    return inputPath.replace(/\.py$/, ext);
  }

  /**
   * 変換オプションの構築
   */
  private buildConversionOptions(cliOptions: any): ConversionOptions {
    return {
      outputFormat: cliOptions.format || 'plain',
      indentSize: parseInt(cliOptions.indentSize) || 3,
      indentType: cliOptions.indentType || 'spaces',
      lineEnding: (cliOptions.lineEnding === 'crlf') ? '\r\n' : '\n',
      maxLineLength: parseInt(cliOptions.maxLineLength) || 80,
      beautify: !cliOptions.noBeautify,
      strictMode: cliOptions.strict || false,
      includeComments: !cliOptions.noComments,
      includeLineNumbers: cliOptions.lineNumbers || false,
      preserveWhitespace: !cliOptions.noPreserveWhitespace,
      uppercaseKeywords: !cliOptions.lowercaseKeywords,
      spaceAroundOperators: !cliOptions.noSpaceOperators,
      spaceAfterCommas: !cliOptions.noSpaceCommas,
      maxErrors: parseInt(cliOptions.maxErrors) || 10,
      timeout: parseInt(cliOptions.timeout) || 30000
    };
  }

  /**
   * 設定ファイルの読み込み
   */
  private async loadConfig(configPath?: string): Promise<ConversionOptions> {
    const defaultOptions = this.buildConversionOptions({});
    
    if (!configPath) {
      configPath = path.join(process.cwd(), '.python2igcse.json');
    }
    
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return { ...defaultOptions, ...config };
    } catch {
      return defaultOptions;
    }
  }

  /**
   * 配列のチャンク分割
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * CLI の実行
   */
  run(): void {
    this.program.parse();
  }
}

// CLI の実行
if (require.main === module) {
  const cli = new CLI();
  cli.run();
}

export { CLI };
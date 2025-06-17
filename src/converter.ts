// Python to IGCSE Pseudocode Converter
import { PythonParser } from './parser';
import { TextEmitter, MarkdownEmitter } from './emitter';
import { ConversionOptions, ConversionResult, ConversionStats } from './types';
import { IR } from './types/ir';
import { ParserOptions, ParseResult } from './types/parser';
import { EmitterOptions, EmitResult } from './types/emitter';

/**
 * Python to IGCSE Pseudocode Converter
 */
export class Converter {
  private parser: PythonParser;
  private textEmitter: TextEmitter;
  private markdownEmitter: MarkdownEmitter;
  private options: ConversionOptions;

  constructor(options: Partial<ConversionOptions> = {}) {
    this.options = this.mergeDefaultOptions(options);
    
    // パーサーの初期化
    const parserOptions: ParserOptions = {
      strictMode: this.options.strictMode ?? false,
      includeComments: this.options.includeComments ?? true,
      preserveWhitespace: this.options.preserveWhitespace ?? false,
      maxErrors: this.options.maxErrors ?? 100,
      timeout: this.options.timeout ?? 30000
    };
    this.parser = new PythonParser(parserOptions);
    
    // エミッターの初期化
    const emitterOptions: EmitterOptions = {
      format: this.options.outputFormat ?? 'plain',
      indentSize: this.options.indentSize ?? 2,
      indentChar: ' ',
      indentType: this.options.indentType ?? 'spaces',
      lineEnding: this.options.lineEnding ?? '\n',
      maxLineLength: this.options.maxLineLength ?? 80,
      beautify: this.options.beautify ?? true,
      includeComments: this.options.includeComments ?? true,
      includeLineNumbers: this.options.includeLineNumbers ?? false,
      includeDebugInfo: false
    };
    
    this.textEmitter = new TextEmitter(emitterOptions);
    this.markdownEmitter = new MarkdownEmitter({
      ...emitterOptions,
      format: 'markdown'
    });
  }

  /**
   * Python コードを IGCSE Pseudocode に変換
   */
  convert(pythonCode: string): ConversionResult {
    const startTime = Date.now();
    
    try {
      // パース処理
      const parseResult = this.parser.parse(pythonCode);
      
      if (parseResult.errors.length > 0 && this.options.strictMode) {
        return this.createErrorResult(
          'Parse errors occurred in strict mode',
          parseResult.errors,
          parseResult.warnings,
          startTime
        );
      }
      
      // エミット処理
      const emitter = this.options.outputFormat === 'markdown' 
        ? this.markdownEmitter 
        : this.textEmitter;
      
      const emitResult = emitter.emit(parseResult.ir);
      
      // 結果の作成
      const endTime = Date.now();
      const stats = this.createConversionStats(
        parseResult,
        emitResult,
        startTime,
        endTime
      );
      
      const result = {
        code: emitResult.code,
        parseResult,
        emitResult,
        stats,
        ast: parseResult.ir
      };
      return result;
      
    } catch (error) {
      const errorResult = this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred',
        [],
        [],
        startTime
      );
      return errorResult;
    }
  }

  /**
   * バッチ変換（複数ファイル）
   */
  async convertBatch(files: Array<{ name: string; content: string }>): Promise<Array<{
    name: string;
    result: ConversionResult;
  }>> {
    const results: Array<{ name: string; result: ConversionResult }> = [];
    
    for (const file of files) {
      try {
        const result = await this.convert(file.content);
        results.push({ name: file.name, result });
      } catch (error) {
        const errorResult: ConversionResult = {
          code: '',
          parseResult: {
            ir: { kind: 'comment', text: '', children: [] },
            errors: [{
              message: error instanceof Error ? error.message : 'Unknown error',
              type: 'syntax_error',
              line: 1,
              column: 1,
              severity: 'error'
            }],
            warnings: [],
            stats: {
               parseTime: 0,
               linesProcessed: 0,
               nodesGenerated: 0,
               functionsFound: 0,
               classesFound: 0,
               variablesFound: 0
             }
          },
          emitResult: {
            code: '',
            errors: [],
            warnings: [],
            stats: {
              emitTime: 0,
              linesGenerated: 0,
              lineCount: 0,
              charactersGenerated: 0,
              characterCount: 0,
              nodesProcessed: 0,
              processingTime: 0,
              maxNestingDepth: 0,
              maxLineLength: 0
            }
          },
          stats: {
            parseTime: 0,
            emitTime: 0,
            conversionTime: 0,
            inputLines: 0,
            outputLines: 0,
            errorCount: 1,
            warningCount: 0
          }
        };
        results.push({ name: file.name, result: errorResult });
      }
    }
    
    return results;
  }

  /**
   * 変換オプションの更新
   */
  updateOptions(newOptions: Partial<ConversionOptions>): void {
    this.options = this.mergeDefaultOptions({ ...this.options, ...newOptions });
    
    // パーサーオプションの更新（必要に応じて実装）
    
    // エミッターオプションの更新
    const emitterOptions: EmitterOptions = {
      format: this.options.outputFormat ?? 'plain',
      indentSize: this.options.indentSize ?? 2,
      indentChar: ' ',
      indentType: this.options.indentType ?? 'spaces',
      lineEnding: this.options.lineEnding ?? '\n',
      maxLineLength: this.options.maxLineLength ?? 80,
      beautify: this.options.beautify ?? true,
      includeComments: this.options.includeComments ?? true,
      includeLineNumbers: this.options.includeLineNumbers ?? false,
      includeDebugInfo: false
    };
    
    this.textEmitter.updateOptions(emitterOptions);
    this.markdownEmitter.updateOptions({ ...emitterOptions, format: 'markdown' });
  }

  /**
   * 現在のオプションを取得
   */
  getOptions(): ConversionOptions {
    return { ...this.options };
  }

  /**
   * 変換統計の取得
   */
  getStats(): {
    totalConversions: number;
    successfulConversions: number;
    averageParseTime: number;
    averageEmitTime: number;
    averageTotalTime: number;
  } {
    // 実装では統計を追跡する必要がある
    // 現在は仮の値を返す
    return {
      totalConversions: 0,
      successfulConversions: 0,
      averageParseTime: 0,
      averageEmitTime: 0,
      averageTotalTime: 0
    };
  }

  /**
   * IRの検証
   */
  validateIR(ir: IR): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 基本的な検証
    if (!ir.kind) {
      errors.push('IR node missing kind property');
    }
    
    if (!ir.children) {
      errors.push('IR node missing children property');
    }
    

    
    // 再帰的な検証
    for (const child of ir.children || []) {
      const childValidation = this.validateIR(child);
      errors.push(...childValidation.errors);
      warnings.push(...childValidation.warnings);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * デフォルトオプションとのマージ
   */
  private mergeDefaultOptions(options: Partial<ConversionOptions>): ConversionOptions {
    const defaults: ConversionOptions = {
      outputFormat: 'plain',
      indentSize: 2,
      indentType: 'spaces',
      lineEnding: '\n',
      maxLineLength: 80,
      beautify: true,
      strictMode: false,
      includeComments: true,
      includeLineNumbers: false,
      preserveWhitespace: false,
      uppercaseKeywords: true,
      spaceAroundOperators: true,
      spaceAfterCommas: true,
      maxErrors: 10,
      timeout: 30000
    };
    
    return { ...defaults, ...options };
  }

  /**
   * エラー結果の作成
   */
  private createErrorResult(
    message: string,
    parseErrors: any[],
    parseWarnings: any[],
    startTime: number
  ): ConversionResult {
    const endTime = Date.now();
    
    return {
      code: '',
      parseResult: {
         ir: { kind: 'comment', text: '', children: [] },
        errors: [
          {
            type: 'conversion',
            severity: 'error',
            message,
            location: { line: 1, column: 1 }
          },
          ...parseErrors
        ],
        warnings: parseWarnings,
        stats: {
          parseTime: 0,
          linesProcessed: 0,
          nodesGenerated: 0,
          functionsFound: 0,
          classesFound: 0,
          variablesFound: 0
        }
      },
      emitResult: {
         code: '',
         errors: [],
         warnings: [],
         stats: {
            emitTime: 0,
            linesGenerated: 0,
            lineCount: 0,
            charactersGenerated: 0,
            characterCount: 0,
            nodesProcessed: 0,
            processingTime: 0,
            maxNestingDepth: 0,
            maxLineLength: 0
          }
       },
      stats: {
        parseTime: 0,
        emitTime: 0,
        conversionTime: endTime - startTime,
        inputLines: 0,
        outputLines: 0,
        errorCount: parseErrors.length + 1,
        warningCount: parseWarnings.length
      },
      ast: undefined
    };
  }

  /**
   * 変換統計の作成
   */
  private createConversionStats(
    parseResult: ParseResult,
    emitResult: EmitResult,
    startTime: number,
    endTime: number
  ): ConversionStats {
    return {
      parseTime: parseResult.stats.parseTime,
      emitTime: emitResult.stats.emitTime,
      conversionTime: endTime - startTime,
      inputLines: parseResult.stats.linesProcessed,
      outputLines: emitResult.stats.linesGenerated,
      errorCount: parseResult.errors.length,
      warningCount: parseResult.warnings.length
    };
  }
}

/**
 * 便利な関数：簡単な変換
 */
export async function convertPythonToIGCSE(
  pythonCode: string,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult> {
  const converter = new Converter(options);
  return converter.convert(pythonCode);
}

/**
 * 便利な関数：ファイルからの変換
 */
export async function convertFileToIGCSE(
  filePath: string,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult> {
  const fs = await import('fs/promises');
  const pythonCode = await fs.readFile(filePath, 'utf-8');
  return convertPythonToIGCSE(pythonCode, options);
}

/**
 * 便利な関数：複数ファイルの変換
 */
export async function convertFilesToIGCSE(
  filePaths: string[],
  options: Partial<ConversionOptions> = {}
): Promise<Array<{ name: string; result: ConversionResult }>> {
  const converter = new Converter(options);
  const fs = await import('fs/promises');
  
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const content = await fs.readFile(filePath, 'utf-8');
      return { name: filePath, content };
    })
  );
  
  return converter.convertBatch(files);
}
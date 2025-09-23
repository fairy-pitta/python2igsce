// Browser entry point for Python to IGCSE Pseudocode Converter
import { Converter } from './converter';
import type { ConversionOptions, ConversionResult } from './types';

/**
 * Browser-compatible version of Python2IGCSE converter
 * This class excludes Node.js-specific features like file system operations
 */
export class Python2IGCSEBrowser {
  private options: ConversionOptions;

  constructor(options: Partial<ConversionOptions> = {}) {
    const defaultOptions: ConversionOptions = {
      outputFormat: 'plain',
      indentSize: 3,
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
      timeout: 30000,
    };

    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Convert Python code string to IGCSE pseudocode
   * @param pythonCode - Python source code as string
   * @returns ConversionResult - IGCSE pseudocode result
   */
  convertCode(pythonCode: string): ConversionResult {
    try {
      const converter = new Converter(this.options);
      return converter.convert(pythonCode);
    } catch (error) {
      throw new Error(
        `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate Python syntax without conversion
   * @param pythonCode - Python source code as string
   * @returns ValidationResult - validation result with errors and warnings
   */
  validateSyntax(pythonCode: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    try {
      const result = this.convertCode(pythonCode);
      return {
        isValid: result.parseResult.errors.length === 0,
        errors: result.parseResult.errors.map((e) => e.message),
        warnings: (result.parseResult.warnings || []).map((w) => w.message),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
      };
    }
  }

  /**
   * Get conversion options
   * @returns ConversionOptions - current options
   */
  getOptions(): ConversionOptions {
    return { ...this.options };
  }

  /**
   * Update conversion options
   * @param options - partial options to update
   */
  updateOptions(options: Partial<ConversionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get available output formats
   */
  static getAvailableFormats(): string[] {
    return ['plain', 'markdown'];
  }
}

// Export for global usage
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined') {
  ((globalThis as any).window as any).Python2IGCSE = Python2IGCSEBrowser;
}

// Browser-compatible conversion function
export function convertPythonToIGCSE(
  pythonCode: string,
  options: Partial<ConversionOptions> = {}
): ConversionResult {
  const converter = new Converter(options);
  return converter.convert(pythonCode);
}

// Re-export types for browser usage
export type { ConversionOptions, ConversionResult };

export default Python2IGCSEBrowser;

// Python to IGCSE Pseudocode Converter - Main Entry Point

// Core exports
export { Converter, convertPythonToIGCSE, convertFileToIGCSE, convertFilesToIGCSE } from './converter';
export { CLI } from './cli';

// Legacy export for compatibility
export { Converter as PythonToIGCSEConverter } from './converter';

// Import for internal use
import { Converter } from './converter';

// Parser exports
export {
  BaseParser,
  PythonParser,
  PythonASTVisitor,
  createParser
} from './parser';

// Emitter exports
export {
  BaseEmitter,
  TextEmitter,
  MarkdownEmitter,
  createEmitter,
  EmitterUtils
} from './emitter';

// Type exports
export * from './types';

// Version and constants
export { VERSION, SUPPORTED_PYTHON_VERSION, IGCSE_SPEC_VERSION } from './types';

/**
 * Quick conversion function for simple use cases
 */
export async function convertPython(pythonCode: string): Promise<string> {
  const converter = new Converter();
  const result = await converter.convert(pythonCode);
  return result.code;
}

/**
 * Default converter instance for quick usage
 */
export const defaultConverter = new (class DefaultConverter {
  public converter = new Converter();

  /**
   * Quick conversion with default options
   */
  async convert(pythonCode: string) {
    return this.converter.convert(pythonCode);
  }

  /**
   * Convert to markdown format
   */
  async convertToMarkdown(pythonCode: string) {
    const converter = new Converter({ outputFormat: 'markdown' });
    return converter.convert(pythonCode);
  }

  /**
   * Convert with custom options
   */
  async convertWithOptions(pythonCode: string, options: import('./types').ConversionOptions) {
    const converter = new Converter(options);
    return converter.convert(pythonCode);
  }
})();

/**
 * Utility functions for common use cases
 */
export const utils = {
  /**
   * Create a converter with preset configurations
   */
  createConverter: {
    /**
     * Converter optimized for educational use
     */
    educational: () => new Converter({
      outputFormat: 'plain',
      beautify: true,
      includeComments: true,
      uppercaseKeywords: true,
      spaceAroundOperators: true,
      maxLineLength: 80
    }),

    /**
     * Converter optimized for markdown documentation
     */
    documentation: () => new Converter({
      outputFormat: 'markdown',
      beautify: true,
      includeComments: true,
      includeLineNumbers: false
    }),

    /**
     * Converter with compact output
     */
    compact: () => new Converter({
      outputFormat: 'plain',
      beautify: false,
      includeComments: false,
      indentSize: 2,
      maxLineLength: 120
    }),

    /**
     * Converter with strict validation
     */
    strict: () => new Converter({
      strictMode: true,
      maxErrors: 5,
      timeout: 10000
    })
  },

  /**
   * Validation utilities
   */
  validate: {
    /**
     * Check if Python code is suitable for IGCSE conversion
     */
    async isPythonCodeSuitable(pythonCode: string): Promise<{
      suitable: boolean;
      issues: string[];
      suggestions: string[];
    }> {
      try {
        const converter = new Converter();
        const result = await converter.convert(pythonCode);
        
        const issues: string[] = [];
        const suggestions: string[] = [];
        
        // Check for errors
        if (result.parseResult.errors.length > 0) {
          issues.push(...result.parseResult.errors.map((e: any) => e.message));
        }
        
        // Check for warnings
        if (result.parseResult.warnings.length > 0) {
          suggestions.push(...result.parseResult.warnings.map((w: any) => w.message));
        }
        
        // Additional checks
        if (pythonCode.includes('import ')) {
          suggestions.push('Consider removing or simplifying import statements for IGCSE compatibility');
        }
        
        if (pythonCode.includes('class ')) {
          suggestions.push('Object-oriented features may need simplification for IGCSE level');
        }
        
        return {
          suitable: issues.length === 0,
          issues,
          suggestions
        };
      } catch (error) {
        return {
          suitable: false,
          issues: [error instanceof Error ? error.message : 'Unknown error'],
          suggestions: []
        };
      }
    },

    /**
     * Get complexity analysis of Python code
     */
    async analyzeComplexity(pythonCode: string): Promise<{
      complexity: 'low' | 'medium' | 'high';
      metrics: {
        lines: number;
        functions: number;
        loops: number;
        conditionals: number;
        nestingDepth: number;
      };
      recommendations: string[];
    }> {
      try {
        const converter = new Converter();
        const result = await converter.convert(pythonCode);
        
        // Analyze IR for complexity
        const lines = pythonCode.split('\n').length;
        let functions = 0;
        let loops = 0;
        let conditionals = 0;
        let maxDepth = 0;
        
        const analyzeNode = (node: import('./types/ir').IR, depth: number = 0) => {
          maxDepth = Math.max(maxDepth, depth);
          
          switch (node.kind) {
            case 'function':
            case 'procedure':
              functions++;
              break;
            case 'for':
            case 'while':
            case 'repeat':
              loops++;
              break;
            case 'if':
              conditionals++;
              break;
          }
          
          for (const child of node.children) {
            analyzeNode(child, depth + 1);
          }
        };
        
        if (Array.isArray(result.parseResult.ir)) {
          result.parseResult.ir.forEach(node => analyzeNode(node));
        } else {
          analyzeNode(result.parseResult.ir);
        }
        
        // Determine complexity level
        let complexity: 'low' | 'medium' | 'high' = 'low';
        const recommendations: string[] = [];
        
        if (lines > 100 || functions > 5 || maxDepth > 4) {
          complexity = 'high';
          recommendations.push('Consider breaking down into smaller, simpler functions');
        } else if (lines > 50 || functions > 3 || maxDepth > 3) {
          complexity = 'medium';
          recommendations.push('Code complexity is moderate - good for intermediate IGCSE level');
        } else {
          recommendations.push('Code complexity is appropriate for IGCSE level');
        }
        
        if (loops > 3) {
          recommendations.push('Multiple loops detected - ensure each serves a clear purpose');
        }
        
        if (conditionals > 5) {
          recommendations.push('Many conditional statements - consider simplifying logic');
        }
        
        return {
          complexity,
          metrics: {
            lines,
            functions,
            loops,
            conditionals,
            nestingDepth: maxDepth
          },
          recommendations
        };
      } catch (error) {
        return {
          complexity: 'high',
          metrics: {
            lines: pythonCode.split('\n').length,
            functions: 0,
            loops: 0,
            conditionals: 0,
            nestingDepth: 0
          },
          recommendations: ['Error analyzing code complexity']
        };
      }
    }
  },

  /**
   * Format utilities
   */
  format: {
    /**
     * Format code for different educational contexts
     */
    forExam: (code: string) => {
      // Format code specifically for exam presentation
      return code
        .split('\n')
        .map((line, index) => `${(index + 1).toString().padStart(2, '0')}. ${line}`)
        .join('\n');
    },

    /**
     * Format code for textbook inclusion
     */
    forTextbook: (code: string) => {
      // Add proper spacing and formatting for textbook
      return code
        .split('\n')
        .map(line => line.trim() ? `    ${line}` : '')
        .join('\n');
    },

    /**
     * Format code for presentation slides
     */
    forSlides: (code: string) => {
      // Optimize for presentation visibility
      return code
        .replace(/\t/g, '  ') // Convert tabs to 2 spaces
        .split('\n')
        .filter(line => line.trim()) // Remove empty lines
        .join('\n');
    }
  }
};

/**
 * Quick start examples
 */
export const examples = {
  /**
   * Basic variable assignment
   */
  basicAssignment: `x = 5
y = 10
result = x + y
print(result)`,

  /**
   * Simple function
   */
  simpleFunction: `def calculate_area(length, width):
    area = length * width
    return area

result = calculate_area(5, 3)
print(f"Area: {result}")`,

  /**
   * Loop example
   */
  simpleLoop: `for i in range(5):
    print(f"Number: {i}")

total = 0
for num in [1, 2, 3, 4, 5]:
    total += num
print(f"Total: {total}")`,

  /**
   * Conditional example
   */
  simpleConditional: `age = int(input("Enter your age: "))

if age >= 18:
    print("You are an adult")
else:
    print("You are a minor")

if age >= 65:
    print("Senior citizen discount available")`
};

// Re-export Converter class as default export
export { Converter as default } from './converter';
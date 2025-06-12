// エミッターユーティリティ
import { IR } from '../types/ir';
import { EmitResult, EmitterOptions } from '../types/emitter';

/**
 * エミッターユーティリティクラス
 */
export class EmitterUtils {
  /**
   * IRツリーの統計情報を取得
   */
  static getIRStats(ir: IR): {
    totalNodes: number;
    maxDepth: number;
    nodeTypes: Record<string, number>;
    hasComments: boolean;
    hasFunctions: boolean;
    hasLoops: boolean;
    hasConditionals: boolean;
  } {
    const stats = {
      totalNodes: 0,
      maxDepth: 0,
      nodeTypes: {} as Record<string, number>,
      hasComments: false,
      hasFunctions: false,
      hasLoops: false,
      hasConditionals: false
    };

    this.traverseIR(ir, (node, depth) => {
      stats.totalNodes++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      
      // ノード種別のカウント
      stats.nodeTypes[node.kind] = (stats.nodeTypes[node.kind] || 0) + 1;
      
      // 特徴の検出
      if (node.kind === 'comment') {
        stats.hasComments = true;
      }
      if (node.kind === 'function' || node.kind === 'procedure') {
        stats.hasFunctions = true;
      }
      if (node.kind === 'for' || node.kind === 'while' || node.kind === 'repeat') {
        stats.hasLoops = true;
      }
      if (node.kind === 'if') {
        stats.hasConditionals = true;
      }
    });

    return stats;
  }

  /**
   * IRツリーの走査
   */
  static traverseIR(
    ir: IR,
    callback: (node: IR, depth: number) => void,
    depth: number = 0
  ): void {
    callback(ir, depth);
    
    for (const child of ir.children) {
      this.traverseIR(child, callback, depth + 1);
    }
  }

  /**
   * エミット結果の検証
   */
  static validateEmitResult(result: EmitResult): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 基本的な検証
    if (!result.code) {
      issues.push('Generated code is empty');
    }

    if (result.errors.length > 0) {
      issues.push(`${result.errors.length} error(s) occurred during emission`);
    }

    // 統計の検証
    if (result.stats.linesGenerated === 0) {
      issues.push('No lines were generated');
    }

    if (result.stats.maxLineLength > 120) {
      suggestions.push('Consider reducing line length for better readability');
    }

    if (result.stats.maxNestingDepth > 10) {
      suggestions.push('Deep nesting detected - consider refactoring');
    }

    // 警告の確認
    if (result.warnings.length > 0) {
      suggestions.push(`${result.warnings.length} warning(s) - review for potential improvements`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * コードの品質分析
   */
  static analyzeCodeQuality(code: string): {
    score: number; // 0-100
    metrics: {
      readability: number;
      structure: number;
      consistency: number;
      completeness: number;
    };
    recommendations: string[];
  } {
    const lines = code.split('\n').filter(line => line.trim());
    const recommendations: string[] = [];

    // 可読性の評価
    const readability = this.evaluateReadability(lines, recommendations);
    
    // 構造の評価
    const structure = this.evaluateStructure(lines, recommendations);
    
    // 一貫性の評価
    const consistency = this.evaluateConsistency(lines, recommendations);
    
    // 完全性の評価
    const completeness = this.evaluateCompleteness(lines, recommendations);

    const score = Math.round((readability + structure + consistency + completeness) / 4);

    return {
      score,
      metrics: {
        readability,
        structure,
        consistency,
        completeness
      },
      recommendations
    };
  }

  /**
   * 可読性の評価
   */
  private static evaluateReadability(lines: string[], recommendations: string[]): number {
    let score = 100;
    
    // 長すぎる行のチェック
    const longLines = lines.filter(line => line.length > 80);
    if (longLines.length > 0) {
      score -= Math.min(30, longLines.length * 5);
      recommendations.push(`${longLines.length} line(s) exceed 80 characters`);
    }

    // コメントの存在チェック
    const commentLines = lines.filter(line => line.trim().startsWith('//'));
    const commentRatio = commentLines.length / lines.length;
    if (commentRatio < 0.1) {
      score -= 20;
      recommendations.push('Consider adding more comments for clarity');
    }

    // 空行の適切な使用
    const blankLineCount = lines.filter(line => line.trim() === '').length;
    const blankLineRatio = blankLineCount / lines.length;
    if (blankLineRatio < 0.05) {
      score -= 10;
      recommendations.push('Add blank lines to improve visual separation');
    }

    return Math.max(0, score);
  }

  /**
   * 構造の評価
   */
  private static evaluateStructure(lines: string[], recommendations: string[]): number {
    let score = 100;
    
    // インデントの一貫性チェック
    const indentSizes = new Set<number>();
    for (const line of lines) {
      const leadingSpaces = line.length - line.trimStart().length;
      if (leadingSpaces > 0) {
        indentSizes.add(leadingSpaces);
      }
    }
    
    if (indentSizes.size > 3) {
      score -= 20;
      recommendations.push('Inconsistent indentation detected');
    }

    // 制御構造の対応チェック
    const structureBalance = this.checkStructureBalance(lines);
    if (!structureBalance.balanced) {
      score -= 30;
      recommendations.push('Unbalanced control structures detected');
    }

    return Math.max(0, score);
  }

  /**
   * 一貫性の評価
   */
  private static evaluateConsistency(lines: string[], recommendations: string[]): number {
    let score = 100;
    
    // キーワードの大文字小文字の一貫性
    const keywords = ['IF', 'THEN', 'ELSE', 'ENDIF', 'FOR', 'WHILE', 'PROCEDURE', 'FUNCTION'];
    const inconsistentKeywords = new Set<string>();
    
    for (const keyword of keywords) {
      const upperCount = lines.filter(line => line.includes(keyword)).length;
      const lowerCount = lines.filter(line => line.includes(keyword.toLowerCase())).length;
      
      if (upperCount > 0 && lowerCount > 0) {
        inconsistentKeywords.add(keyword);
      }
    }
    
    if (inconsistentKeywords.size > 0) {
      score -= inconsistentKeywords.size * 10;
      recommendations.push('Inconsistent keyword capitalization');
    }

    // 演算子の一貫性
    const hasArrowAssign = lines.some(line => line.includes('←'));
    const hasEqualsAssign = lines.some(line => line.includes('=') && !line.includes('=='));
    
    if (hasArrowAssign && hasEqualsAssign) {
      score -= 20;
      recommendations.push('Mixed assignment operators (← and =)');
    }

    return Math.max(0, score);
  }

  /**
   * 完全性の評価
   */
  private static evaluateCompleteness(lines: string[], recommendations: string[]): number {
    let score = 100;
    
    // 基本的な構文要素の存在チェック
    const hasVariables = lines.some(line => line.includes('←'));
    const hasOutput = lines.some(line => line.includes('OUTPUT'));
    const hasInput = lines.some(line => line.includes('INPUT'));
    
    if (!hasVariables) {
      score -= 10;
      recommendations.push('No variable assignments found');
    }
    
    if (!hasOutput && !hasInput) {
      score -= 15;
      recommendations.push('No input/output operations found');
    }

    return Math.max(0, score);
  }

  /**
   * 制御構造のバランスチェック
   */
  private static checkStructureBalance(lines: string[]): {
    balanced: boolean;
    issues: string[];
  } {
    const stack: string[] = [];
    const issues: string[] = [];
    
    const openKeywords = ['IF', 'FOR', 'WHILE', 'REPEAT', 'PROCEDURE', 'FUNCTION', 'CASE'];
    const closeKeywords = ['ENDIF', 'NEXT', 'ENDWHILE', 'UNTIL', 'ENDPROCEDURE', 'ENDFUNCTION', 'ENDCASE'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      
      for (const keyword of openKeywords) {
        if (line.startsWith(keyword)) {
          stack.push(keyword);
          break;
        }
      }
      
      for (const keyword of closeKeywords) {
        if (line.startsWith(keyword)) {
          if (stack.length === 0) {
            issues.push(`Unmatched ${keyword} at line ${i + 1}`);
          } else {
            stack.pop();
          }
          break;
        }
      }
    }
    
    if (stack.length > 0) {
      issues.push(`Unclosed structures: ${stack.join(', ')}`);
    }
    
    return {
      balanced: issues.length === 0,
      issues
    };
  }

  /**
   * コードの複雑度計算
   */
  static calculateComplexity(ir: IR): {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
  } {
    let cyclomaticComplexity = 1; // 基本パス
    let cognitiveComplexity = 0;
    let maxNestingDepth = 0;
    
    this.traverseIR(ir, (node, depth) => {
      maxNestingDepth = Math.max(maxNestingDepth, depth);
      
      // サイクロマティック複雑度
      if (['if', 'for', 'while', 'case'].includes(node.kind)) {
        cyclomaticComplexity++;
      }
      
      // 認知的複雑度
      if (['if', 'for', 'while'].includes(node.kind)) {
        cognitiveComplexity += 1 + depth; // ネストによる重み付け
      }
    });
    
    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      nestingDepth: maxNestingDepth
    };
  }

  /**
   * 最適化の提案
   */
  static suggestOptimizations(ir: IR): string[] {
    const suggestions: string[] = [];
    const stats = this.getIRStats(ir);
    const complexity = this.calculateComplexity(ir);
    
    // 複雑度に基づく提案
    if (complexity.cyclomaticComplexity > 10) {
      suggestions.push('Consider breaking down complex functions into smaller ones');
    }
    
    if (complexity.nestingDepth > 5) {
      suggestions.push('Deep nesting detected - consider using early returns or guard clauses');
    }
    
    // ノード種別に基づく提案
    if (stats.nodeTypes['comment'] && stats.nodeTypes['comment'] < stats.totalNodes * 0.1) {
      suggestions.push('Add more comments to improve code documentation');
    }
    
    if (stats.nodeTypes['function'] && stats.nodeTypes['function'] > 10) {
      suggestions.push('Large number of functions - consider organizing into modules');
    }
    
    return suggestions;
  }

  /**
   * エミッターオプションの最適化
   */
  static optimizeEmitterOptions(
    ir: IR,
    targetFormat: import('../types/emitter').OutputFormat
  ): Partial<EmitterOptions> {
    const stats = this.getIRStats(ir);
    const complexity = this.calculateComplexity(ir);
    
    const options: Partial<EmitterOptions> = {};
    
    // 複雑度に基づく調整
    if (complexity.nestingDepth > 3) {
      options.indentSize = 2; // 深いネストの場合はインデントを小さく
    } else {
      options.indentSize = 4;
    }
    
    // コメントの有無に基づく調整
    options.includeComments = stats.hasComments;
    
    // フォーマット固有の調整
    if (targetFormat === 'markdown') {
      options.beautify = true;
      options.includeLineNumbers = false;
    } else if (targetFormat === 'plain') {
      options.maxLineLength = 80;
    }
    
    return options;
  }
}
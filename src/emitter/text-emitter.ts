// テキストエミッター（プレーンテキスト出力）
import { IR } from '../types/ir';
import { EmitResult, EmitterOptions } from '../types/emitter';
import { BaseEmitter } from './base-emitter';

/**
 * プレーンテキスト形式でIGCSE Pseudocodeを出力するエミッター
 */
export class TextEmitter extends BaseEmitter {
  private nodesProcessed: number = 0;

  constructor(options: Partial<EmitterOptions> = {}) {
    super({ ...options, format: 'plain' });
  }

  /**
   * IRをプレーンテキストに変換
   */
  emit(ir: IR): EmitResult {
    this.startEmitting();
    this.resetContext();
    this.nodesProcessed = 0;
    
    this.debug('Starting text emission...');
    
    try {
      this.emitNode(ir);
      
      const result = this.createEmitResult();
      result.stats.nodesProcessed = this.nodesProcessed;
      
      this.debug(`Text emission completed. Lines: ${result.stats.linesGenerated}`);
      
      return result;
    } catch (error) {
      this.addError(
        `Emit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'output_error'
      );
      
      return this.createEmitResult();
    }
  }

  /**
   * IRノードの処理
   */
  protected emitNode(node: IR): void {
    this.nodesProcessed++;
    this.context.currentNode = node;
    
    this.debug(`Emitting node: ${node.kind} - "${node.text}"`);
    
    switch (node.kind) {
      case 'statement':
        this.emitStatement(node);
        break;
        
      case 'assign':
        this.emitAssign(node);
        break;
        
      case 'output':
        this.emitOutput(node);
        break;
        
      case 'input':
        this.emitInput(node);
        break;
        
      case 'comment':
        this.emitComment(node.text);
        break;
        
      case 'compound':
        this.emitCompound(node);
        break;
        
      case 'if':
        this.emitIf(node);
        break;
        
      case 'else':
        this.emitElse(node);
        break;
        
      case 'elseif':
        this.emitElseIf(node);
        break;
        
      case 'endif':
        this.emitEndif(node);
        break;
        
      case 'for':
        this.emitFor(node);
        break;
        
      case 'while':
        this.emitWhile(node);
        break;
        
      case 'endwhile':
        this.emitEndwhile(node);
        break;
        
      case 'repeat':
        this.emitRepeat(node);
        break;
        
      case 'until':
        this.emitUntil(node);
        break;
        
      case 'procedure':
        this.emitProcedure(node);
        break;
        
      case 'function':
        this.emitFunction(node);
        break;
        
      case 'return':
        this.emitReturn(node);
        break;
        
      case 'array':
        this.emitArray(node);
        break;
        
      case 'type':
        this.emitType(node);
        break;
        
      case 'class':
        this.emitClass(node);
        break;
        
      case 'case':
        this.emitCase(node);
        break;
        
      case 'expression':
        this.emitExpression(node);
        break;
        
      case 'block':
        this.emitBlock(node);
        break;
        
      default:
        // 未知のノードタイプの場合、テキストをそのまま出力
        if (node.text) {
          this.emitLine(this.formatText(node.text));
        }
        this.emitChildren(node);
        break;
    }
  }

  /**
   * 代入文の出力
   */
  private emitAssign(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    this.emitChildren(node);
  }

  /**
   * ブロックの出力
   */
  private emitBlock(node: IR): void {
    // ブロックは子ノードをそのまま出力
    this.emitChildren(node);
  }

  /**
   * 出力文の出力
   */
  private emitOutput(node: IR): void {
    // IRArgumentの情報を使用して適切にフォーマット
    if (node.meta?.arguments) {
      const formattedArgs = node.meta.arguments.map(arg => {
        if (arg.type === 'literal') {
          // 文字列リテラルはそのまま出力（整形しない）
          return arg.value;
        } else {
          // 変数や式は通常通り整形
          return this.formatText(arg.value);
        }
      }).join(', '); // エミッター側で安全にスペースを追加
      
      const outputText = `OUTPUT ${formattedArgs}`;
      this.emitLine(outputText);
    } else {
      // 従来の処理（後方互換性）
      const text = this.formatText(node.text);
      this.emitLine(text);
    }
    this.emitChildren(node);
  }

  /**
   * 入力文の出力
   */
  private emitInput(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    this.emitChildren(node);
  }

  /**
   * IF文の出力
   * 構造化されたconsequent/alternateフィールドを使用
   */
  private emitIf(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    // THEN側（consequent）の出力
    if (node.meta?.consequent) {
      this.increaseIndent();
      for (const stmt of node.meta.consequent) {
        this.emitNode(stmt);
      }
      this.decreaseIndent();
      
      // ELSE側（alternate）の出力
      if (node.meta?.alternate && node.meta.alternate.length > 0) {
        for (const altStmt of node.meta.alternate) {
          // ELSE IF文の場合はインデントを調整しない
          if (altStmt.text.startsWith('ELSE IF')) {
            this.emitNode(altStmt);
          } else {
            // 通常のELSE文の場合はインデントを調整
            this.emitNode(altStmt);
          }
        }
      }
    } else {
      // 従来の子ノード処理（後方互換性）
      this.increaseIndent();
      this.emitChildren(node);
      this.decreaseIndent();
    }
    
    // ENDIFの出力（ELSE IF文の場合は出力しない）
    if (!node.text.startsWith('ELSE IF')) {
      this.emitLine('ENDIF');
    }
  }

  /**
   * ELSE文の出力
   * 構造化されたconsequentフィールドを使用
   */
  private emitElse(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    // ELSE文の本体（consequent）の出力
    if (node.meta?.consequent) {
      this.increaseIndent();
      for (const stmt of node.meta.consequent) {
        this.emitNode(stmt);
      }
      this.decreaseIndent();
    } else {
      // 従来の子ノード処理（後方互換性）
      this.increaseIndent();
      this.emitChildren(node);
      this.decreaseIndent();
    }
  }

  /**
   * ELSE IF文の出力
   */
  private emitElseIf(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    this.emitChildren(node);
    this.decreaseIndent();
  }

  /**
   * ENDIF文の出力
   */
  private emitEndif(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
  }

  /**
   * FOR文の出力
   */
  private emitFor(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    // 子ノードを処理するが、NEXT文は元のインデントレベルで出力
    for (const child of node.children) {
      if (child.kind === 'statement' && child.text.trim().startsWith('NEXT')) {
        this.decreaseIndent();
        this.emitNode(child);
        this.increaseIndent();
      } else {
        this.emitNode(child);
      }
    }
    this.decreaseIndent();
  }

  /**
   * WHILE文の出力
   */
  private emitWhile(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    // 子ノードを処理するが、ENDWHILEは元のインデントレベルで出力
    for (const child of node.children) {
      if (child.kind === 'endwhile') {
        this.decreaseIndent();
        this.emitNode(child);
        this.increaseIndent();
      } else {
        this.emitNode(child);
      }
    }
    this.decreaseIndent();
  }

  /**
   * ENDWHILE文の出力
   */
  private emitEndwhile(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    this.emitChildren(node);
  }

  /**
   * REPEAT文の出力
   */
  private emitRepeat(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    this.emitChildren(node);
    this.decreaseIndent();
  }

  /**
   * UNTIL文の出力
   */
  private emitUntil(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    this.emitChildren(node);
  }

  /**
   * プロシージャの出力
   */
  protected emitProcedure(node: IR): void {
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
    
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    // 子ノードを処理するが、ENDPROCEDUREは元のインデントレベルで出力
    for (const child of node.children) {
      if (child.kind === 'statement' && child.text.trim() === 'ENDPROCEDURE') {
        this.decreaseIndent();
        this.emitNode(child);
        this.increaseIndent();
      } else {
        this.emitNode(child);
      }
    }
    this.decreaseIndent();
    
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
  }

  /**
   * FUNCTION文の出力
   */
  protected emitFunction(node: IR): void {
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
    
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    // 子ノードを処理するが、ENDFUNCTIONは元のインデントレベルで出力
    for (const child of node.children) {
      if (child.kind === 'statement' && child.text.trim() === 'ENDFUNCTION') {
        this.decreaseIndent();
        this.emitNode(child);
        this.increaseIndent();
      } else {
        this.emitNode(child);
      }
    }
    this.decreaseIndent();
    
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
  }

  /**
   * RETURN文の出力
   */
  private emitReturn(node: IR): void {
    // RETURN文は引用符で囲まずに直接出力（formatTextを使わない）
    this.emitLine(node.text);
    this.emitChildren(node);
  }

  /**
   * 配列宣言の出力
   */
  private emitArray(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    this.emitChildren(node);
  }

  /**
   * TYPE定義の出力
   */
  private emitType(node: IR): void {
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
    
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    this.emitChildren(node);
    this.decreaseIndent();
    
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
  }

  /**
   * CLASS定義の出力
   */
  private emitClass(node: IR): void {
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
    
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    this.emitChildren(node);
    this.decreaseIndent();
    
    if (this.context.formatter.insertBlankLines) {
      this.emitBlankLine();
    }
  }

  /**
   * CASE文の出力
   */
  private emitCase(node: IR): void {
    const text = this.formatText(node.text);
    this.emitLine(text);
    
    this.increaseIndent();
    this.emitChildren(node);
    this.decreaseIndent();
  }

  /**
   * 式の出力
   */
  private emitExpression(node: IR): void {
    const text = this.formatText(node.text);
    
    // 長い式の場合は折り返し
    if (this.context.formatter.wrapLongLines && this.options.maxLineLength) {
      const wrappedLines = this.wrapLongLine(text, this.options.maxLineLength);
      
      if (wrappedLines.length > 1) {
        for (let i = 0; i < wrappedLines.length; i++) {
          if (i === 0) {
            this.emitLine(wrappedLines[i]);
          } else {
            this.emitLine('    ' + wrappedLines[i]); // 継続行のインデント
          }
        }
      } else {
        this.emitLine(text);
      }
    } else {
      this.emitLine(text);
    }
    
    this.emitChildren(node);
  }

  /**
   * 文の出力
   */
  private emitStatement(node: IR): void {
    if (node.text.trim()) {
      // RETURN文の場合は引用符で囲まずに直接出力
      if (node.text.includes('RETURN')) {
        this.emitLine(node.text);
      } else {
        const text = this.formatText(node.text);
        this.emitLine(text);
      }
    }
    
    this.emitChildren(node);
  }

  /**
   * 複合文の出力
   */
  private emitCompound(node: IR): void {
    // 複合文は子ノードをそのまま順次出力
    for (const child of node.children) {
      this.emitNode(child);
    }
  }

  /**
   * ヘッダーコメントの追加
   */
  addHeader(title: string, author?: string, date?: string): void {
    if (!this.options.includeComments) return;
    
    this.emitComment('// ==========================================');
    this.emitComment(`// ${title}`);
    
    if (author) {
      this.emitComment(`// Author: ${author}`);
    }
    
    if (date) {
      this.emitComment(`// Date: ${date}`);
    } else {
      this.emitComment(`// Date: ${new Date().toLocaleDateString()}`);
    }
    
    this.emitComment('// Generated by python2igcse');
    this.emitComment('// ==========================================');
    this.emitBlankLine();
  }

  /**
   * フッターコメントの追加
   */
  addFooter(): void {
    if (!this.options.includeComments) return;
    
    this.emitBlankLine();
    this.emitComment('// ==========================================');
    this.emitComment('// End of program');
    this.emitComment('// ==========================================');
  }
}
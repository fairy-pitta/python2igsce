// Markdownエミッター
import { IR } from '../types/ir';
import { EmitResult, EmitterOptions, MarkdownConfig } from '../types/emitter';
import { TextEmitter } from './text-emitter';

/**
 * Markdown形式でIGCSE Pseudocodeを出力するエミッター
 */
export class MarkdownEmitter extends TextEmitter {
  private markdownConfig: MarkdownConfig;

  constructor(
    options: Partial<EmitterOptions> = {},
    markdownConfig: Partial<MarkdownConfig> = {}
  ) {
    super({ ...options, format: 'markdown' });
    
    this.markdownConfig = {
      codeBlockLanguage: 'pseudocode',
      headingLevel: 2,
      includeDescription: true,
      generateToc: false,
      ...markdownConfig
    };
  }

  /**
   * IRをMarkdown形式に変換
   */
  override emit(ir: IR): EmitResult {
    this.startEmitting();
    this.resetContext();
    
    this.debug('Starting Markdown emission...');
    
    try {
      // Markdownヘッダーの出力
      this.emitMarkdownHeader();
      
      // 目次の生成（オプション）
      if (this.markdownConfig.generateToc) {
        this.emitTableOfContents(ir);
      }
      
      // 説明文の追加（オプション）
      if (this.markdownConfig.includeDescription) {
        this.emitDescription();
      }
      
      // コードブロックの開始
      this.emitCodeBlockStart();
      
      // IRの処理
      this.emitNode(ir);
      
      // コードブロックの終了
      this.emitCodeBlockEnd();
      
      // フッターの追加
      this.emitMarkdownFooter();
      
      const result = this.createEmitResult();
      this.debug(`Markdown emission completed. Lines: ${result.stats.linesGenerated}`);
      
      return result;
    } catch (error) {
      this.addError(
        `Markdown emit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'output_error'
      );
      
      return this.createEmitResult();
    }
  }

  /**
   * Markdownヘッダーの出力
   */
  private emitMarkdownHeader(): void {
    const headingPrefix = '#'.repeat(this.markdownConfig.headingLevel);
    
    this.emitLine(`${headingPrefix} IGCSE Pseudocode`, false);
    this.emitBlankLine();
    
    if (this.options.includeComments) {
      this.emitLine('*Generated by python2igcse converter*', false);
      this.emitLine(`*Date: ${new Date().toLocaleDateString()}*`, false);
      this.emitBlankLine();
    }
  }

  /**
   * 目次の生成
   */
  private emitTableOfContents(ir: IR): void {
    const headingPrefix = '#'.repeat(this.markdownConfig.headingLevel + 1);
    
    this.emitLine(`${headingPrefix} Table of Contents`, false);
    this.emitBlankLine();
    
    const toc = this.generateTocEntries(ir);
    for (const entry of toc) {
      this.emitLine(entry, false);
    }
    
    this.emitBlankLine();
  }

  /**
   * 目次エントリの生成
   */
  private generateTocEntries(ir: IR, level: number = 0): string[] {
    const entries: string[] = [];
    const indent = '  '.repeat(level);
    
    if (ir.kind === 'procedure' || ir.kind === 'function') {
      const name = ir.meta?.name || 'Unknown';
      const link = name.toLowerCase().replace(/\s+/g, '-');
      entries.push(`${indent}- [${name}](#${link})`);
    }
    
    for (const child of ir.children) {
      entries.push(...this.generateTocEntries(child, level + 1));
    }
    
    return entries;
  }

  /**
   * 説明文の出力
   */
  private emitDescription(): void {
    const headingPrefix = '#'.repeat(this.markdownConfig.headingLevel + 1);
    
    this.emitLine(`${headingPrefix} Description`, false);
    this.emitBlankLine();
    
    this.emitLine('This pseudocode follows the IGCSE Computer Science specification.', false);
    this.emitLine('It has been automatically converted from Python source code.', false);
    this.emitBlankLine();
    
    this.emitLine('**Key Features:**', false);
    this.emitLine('- Uses IGCSE-compliant syntax and keywords', false);
    this.emitLine('- Proper indentation and structure', false);
    this.emitLine('- Clear variable assignments using ←', false);
    this.emitLine('- Standard control structures (IF/THEN/ELSE, FOR/NEXT, WHILE/ENDWHILE)', false);
    this.emitBlankLine();
  }

  /**
   * コードブロックの開始
   */
  private emitCodeBlockStart(): void {
    const headingPrefix = '#'.repeat(this.markdownConfig.headingLevel + 1);
    
    this.emitLine(`${headingPrefix} Pseudocode`, false);
    this.emitBlankLine();
    this.emitLine(`\`\`\`${this.markdownConfig.codeBlockLanguage}`, false);
  }

  /**
   * コードブロックの終了
   */
  private emitCodeBlockEnd(): void {
    this.emitLine('```', false);
    this.emitBlankLine();
  }

  /**
   * Markdownフッターの出力
   */
  private emitMarkdownFooter(): void {
    if (!this.options.includeComments) return;
    
    const headingPrefix = '#'.repeat(this.markdownConfig.headingLevel + 1);
    
    this.emitLine(`${headingPrefix} Notes`, false);
    this.emitBlankLine();
    
    this.emitLine('- This pseudocode is designed for IGCSE Computer Science examinations', false);
    this.emitLine('- All syntax follows the official IGCSE specification', false);
    this.emitLine('- Variable assignments use the ← symbol as required', false);
    this.emitLine('- Control structures use proper IGCSE keywords', false);
    this.emitBlankLine();
    
    this.emitLine('---', false);
    this.emitLine('*Generated by [python2igcse](https://github.com/your-repo/python2igcse)*', false);
  }

  /**
   * 関数/プロシージャのアンカーリンク付きヘッダー
   */
  protected override emitProcedure(node: IR): void {
    const name = node.meta?.name || 'Unknown';
    const anchor = name.toLowerCase().replace(/\s+/g, '-');
    const headingPrefix = '#'.repeat(this.markdownConfig.headingLevel + 2);
    
    // 関数/プロシージャのヘッダー
    this.emitLine(`${headingPrefix} ${name} {#${anchor}}`, false);
    this.emitBlankLine();
    
    // パラメータ情報
    if (node.meta?.params && node.meta.params.length > 0) {
      this.emitLine('**Parameters:**', false);
      for (const param of node.meta.params) {
        this.emitLine(`- \`${param}\``, false);
      }
      this.emitBlankLine();
    }
    
    // 戻り値情報
    if (node.meta?.returnType) {
      this.emitLine(`**Returns:** ${node.meta.returnType}`, false);
      this.emitBlankLine();
    }
    
    // コードブロック
    this.emitLine(`\`\`\`${this.markdownConfig.codeBlockLanguage}`, false);
    
    // 実際のプロシージャコード
    super.emitProcedure(node);
    
    this.emitLine('```', false);
    this.emitBlankLine();
  }

  /**
   * 関数の出力（プロシージャと同様）
   */
  protected override emitFunction(node: IR): void {
    this.emitProcedure(node);
  }

  /**
   * インラインコード用のフォーマット
   */
  protected formatInlineCode(text: string): string {
    return `\`${text}\``;
  }

  /**
   * 強調テキストの追加
   */
  protected emitEmphasis(text: string, type: 'bold' | 'italic' = 'bold'): void {
    const marker = type === 'bold' ? '**' : '*';
    this.emitLine(`${marker}${text}${marker}`, false);
  }

  /**
   * リストアイテムの出力
   */
  protected emitListItem(text: string, level: number = 0): void {
    const indent = '  '.repeat(level);
    this.emitLine(`${indent}- ${text}`, false);
  }

  /**
   * 水平線の出力
   */
  protected emitHorizontalRule(): void {
    this.emitLine('---', false);
  }

  /**
   * リンクの出力
   */
  protected emitLink(text: string, url: string): void {
    this.emitLine(`[${text}](${url})`, false);
  }

  /**
   * 画像の出力
   */
  protected emitImage(altText: string, url: string, title?: string): void {
    const titleAttr = title ? ` "${title}"` : '';
    this.emitLine(`![${altText}](${url}${titleAttr})`, false);
  }

  /**
   * テーブルの出力
   */
  protected emitTable(headers: string[], rows: string[][]): void {
    // ヘッダー行
    this.emitLine(`| ${headers.join(' | ')} |`, false);
    
    // セパレーター行
    const separator = headers.map(() => '---').join(' | ');
    this.emitLine(`| ${separator} |`, false);
    
    // データ行
    for (const row of rows) {
      this.emitLine(`| ${row.join(' | ')} |`, false);
    }
    
    this.emitBlankLine();
  }

  /**
   * 引用ブロックの出力
   */
  protected emitBlockquote(text: string): void {
    const lines = text.split('\n');
    for (const line of lines) {
      this.emitLine(`> ${line}`, false);
    }
    this.emitBlankLine();
  }

  /**
   * Markdown設定の更新
   */
  updateMarkdownConfig(config: Partial<MarkdownConfig>): void {
    this.markdownConfig = { ...this.markdownConfig, ...config };
  }
}
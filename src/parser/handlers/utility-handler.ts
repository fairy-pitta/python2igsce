import { IR, IRKind, IRMeta, createIR } from '../../types/ir';
import { ASTNode } from '../../types/parser';
import { BaseParser } from '../base-parser';

/**
 * 共通ユーティリティメソッドを提供するハンドラー
 */
export class UtilityHandler extends BaseParser {
  public visitNode: ((node: ASTNode) => IR) | undefined;

  /**
   * コンテキストの設定
   */
  setContext(_context: any): void {
    // 必要に応じてコンテキストを設定
  }

  /**
   * パース処理（ユーティリティハンドラーでは使用しない）
   */
  parse(_source: string): any {
    throw new Error('UtilityHandler does not implement parse method');
  }

  /**
   * オブジェクト呼び出しの再構築
   */
  reconstructObjectCalls(elements: ASTNode[]): string[] {
    const result: string[] = [];
    let i = 0;
    
    while (i < elements.length) {
      const element = elements[i];
      if (element.type === 'Name' && element.id) {
        const elementStr = element.id;
        
        // クラス名のパターンを検出 (大文字で始まり、括弧で終わる)
        if (/^[A-Z]\w*\(/.test(elementStr)) {
          // 次の要素と結合してオブジェクト呼び出しを再構築
          let objectCall = elementStr;
          i++;
          
          // 閉じ括弧が見つかるまで要素を結合
          while (i < elements.length && !objectCall.includes(')')) {
            const nextElement = elements[i];
            if (nextElement.type === 'Name' && nextElement.id) {
              objectCall += ', ' + nextElement.id;
            }
            i++;
          }
          
          result.push(objectCall);
        } else {
          result.push(elementStr);
          i++;
        }
      } else {
        // TODO: expressionVisitorを使用する場合は、このハンドラーに渡す必要がある
        // result.push(this.expressionVisitor.visitExpression(element));
        result.push(element.toString());
        i++;
      }
    }
    
    return result;
  }
  
  /**
   * オブジェクト呼び出しかどうかを判定
   */
  isObjectCall(elementStr: string): boolean {
    // クラス名(引数)のパターンを検出
    return /^[A-Z]\w*\(.+\)$/.test(elementStr);
  }
   
  /**
   * オブジェクト呼び出しからクラス名を抽出
   */
  extractClassName(objectCall: string): string {
    const match = objectCall.match(/^([A-Z]\w*)\(/);
    return match ? match[1] : 'Unknown';
  }
   
  /**
   * オブジェクト呼び出しから引数を抽出
   */
  extractArguments(objectCall: string): string[] {
    const match = objectCall.match(/\((.+)\)$/);
    if (match) {
      return match[1].split(',').map(arg => arg.trim());
    }
    return [];
  }

  /**
   * クラスインスタンス化かどうかを判定
   */
  isClassInstantiation(node: ASTNode): boolean {
    // 簡易的な判定: 関数名が大文字で始まる場合はクラスとみなす
    if (node.func && node.func.type === 'Name') {
      const isClass = /^[A-Z]/.test(node.func.id);
      return isClass;
    }
    return false;
  }

  /**
   * 文字列の最初の文字を大文字にする
   */
  capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  protected override createIRNode(kind: IRKind, text: string, children: IR[] = [], meta?: IRMeta): IR {
    return createIR(kind, text, children, meta);
  }
}
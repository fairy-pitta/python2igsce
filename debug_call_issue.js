const { Converter } = require('./dist/converter.js');
const fs = require('fs');

// 詳細なデバッグのため、パーサーの内部状態を確認
console.log('=== Detailed Call Processing Debug ===');

const code = `def display_message(msg):
    print(msg)

display_message("Hello")`;

// カスタムコンバーターでデバッグ情報を追加
class DebugConverter extends Converter {
  convert(code) {
    console.log('\n=== Starting conversion ===');
    const result = super.convert(code);
    console.log('=== Conversion complete ===\n');
    return result;
  }
}

const converter = new DebugConverter();
const result = converter.convert(code);

console.log('Final Output:');
console.log(result.output);

// AST構造の詳細分析
console.log('\n=== Detailed AST Analysis ===');
const astChildren = result.ast.children;

for (let i = 0; i < astChildren.length; i++) {
  const child = astChildren[i];
  console.log(`\n--- Statement ${i + 1} ---`);
  console.log(`Kind: ${child.kind}`);
  console.log(`Text: "${child.text}"`);
  
  if (child.meta) {
    console.log('Meta:');
    Object.keys(child.meta).forEach(key => {
      const value = child.meta[key];
      if (typeof value === 'object') {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
  }
  
  if (child.children && child.children.length > 0) {
    console.log(`Children (${child.children.length}):`);
    child.children.forEach((grandchild, j) => {
      console.log(`  ${j + 1}. ${grandchild.kind}: "${grandchild.text}"`);
      if (grandchild.meta) {
        console.log(`     Meta: ${JSON.stringify(grandchild.meta)}`);
      }
    });
  }
}

// 問題の特定
const callNode = astChildren.find(child => 
  child.text.includes('display_message') && child.kind === 'expression'
);

if (callNode) {
  console.log('\n=== PROBLEM IDENTIFIED ===');
  console.log('Call node is processed as "expression" instead of "statement"');
  console.log('This means visitCall is not correctly identifying it as a procedure call');
  console.log('\nExpected behavior:');
  console.log('1. visitCall should find the function in the registry');
  console.log('2. Since hasReturn=false, it should generate "CALL display_message(\"Hello\")"');
  console.log('3. The IR kind should be "statement", not "expression"');
  console.log('\nActual behavior:');
  console.log(`1. IR kind: ${callNode.kind}`);
  console.log(`2. IR text: ${callNode.text}`);
  console.log('\nThis suggests findFunction is not finding the registered function.');
}

// 関数定義の確認
const funcDef = astChildren.find(child => child.kind === 'procedure');
if (funcDef) {
  console.log('\n=== Function Definition Found ===');
  console.log(`Name: ${funcDef.meta.name}`);
  console.log(`HasReturn: ${funcDef.meta.hasReturn}`);
  console.log(`Params: ${JSON.stringify(funcDef.meta.params)}`);
  console.log('This confirms the function is properly defined as a procedure.');
}
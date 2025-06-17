const { Converter } = require('./dist/converter');

const converter = new Converter();
const input = 'full_name = first_name + " " + last_name';

console.log('=== Input ===');
console.log(input);

const result = converter.convert(input);

console.log('\n=== AST Structure ===');
function printAST(node, indent = 0) {
  const spaces = '  '.repeat(indent);
  console.log(`${spaces}${node.kind || node.type}: ${node.text || node.value || node.id || ''}`);
  if (node.children) {
    node.children.forEach(child => printAST(child, indent + 1));
  }
  if (node.left) {
    console.log(`${spaces}  left:`);
    printAST(node.left, indent + 2);
  }
  if (node.right) {
    console.log(`${spaces}  right:`);
    printAST(node.right, indent + 2);
  }
  if (node.op) {
    console.log(`${spaces}  op: ${node.op.type}`);
  }
}

if (result.ast && result.ast.children && result.ast.children[0]) {
  const assignNode = result.ast.children[0];
  console.log('Assignment node:', assignNode.text);
  
  // 内部のAST構造を確認するため、converterの内部状態をチェック
  console.log('\n=== Detailed AST ===');
  console.log(JSON.stringify(result.ast, null, 2));
}

console.log('\n=== Generated Code ===');
console.log(result.code);
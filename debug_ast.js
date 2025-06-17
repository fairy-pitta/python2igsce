const { PythonToIRVisitor } = require('./dist/parser/visitor');

// ビジターのインスタンスを作成
const visitor = new PythonToIRVisitor();

// テスト用の式
const expr = 'first_name + " " + last_name';

console.log('=== Testing parseExpression ===');
console.log('Input:', expr);

// parseExpressionメソッドを直接呼び出し（プライベートメソッドなので、テスト用に一時的にパブリックにする必要がある）
// 代わりに、getValueStringメソッドでBinOpノードの処理を確認

// 手動でBinOpノードを作成してテスト
const testNode = {
  type: 'BinOp',
  left: {
    type: 'BinOp',
    left: { type: 'Name', id: 'first_name' },
    op: { type: 'Add' },
    right: { type: 'Constant', value: ' ' }
  },
  op: { type: 'Add' },
  right: { type: 'Name', id: 'last_name' }
};

console.log('\n=== Test Node Structure ===');
console.log(JSON.stringify(testNode, null, 2));

// getValueStringメソッドでテスト
try {
  const result = visitor.getValueString(testNode);
  console.log('\n=== Result ===');
  console.log(result);
} catch (error) {
  console.log('\n=== Error ===');
  console.log(error.message);
}
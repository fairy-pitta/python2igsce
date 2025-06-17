const { PythonParser } = require('./dist/parser');

// ASTNodeの構造デバッグスクリプト
function debugASTNode() {
  const parser = new PythonParser();
  
  const code = `
def factorial(n):
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)
`;
  
  console.log('Python code:');
  console.log(code);
  
  try {
    const result = parser.parse(code);
    console.log('\n=== IR構造の詳細分析 ===');
    analyzeASTNode(result.ir, 0);
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

function analyzeASTNode(node, depth) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.kind}: "${node.text}"`);
  
  // metaプロパティを表示
  if (node.meta) {
    console.log(`${indent}  meta:`);
    for (const [key, value] of Object.entries(node.meta)) {
      if (Array.isArray(value)) {
        console.log(`${indent}    ${key}: [${value.length}個の要素]`);
        if (value.length > 0 && typeof value[0] === 'object' && value[0].kind) {
          value.forEach((item, i) => {
            console.log(`${indent}      [${i}]:`);
            analyzeASTNode(item, depth + 3);
          });
        }
      } else {
        console.log(`${indent}    ${key}: ${JSON.stringify(value)}`);
      }
    }
  }
  
  // childrenプロパティを表示
  if (node.children && node.children.length > 0) {
    console.log(`${indent}  children: [${node.children.length}個の要素]`);
    node.children.forEach((child, i) => {
      console.log(`${indent}    [${i}]:`);
      analyzeASTNode(child, depth + 2);
    });
  }
}

debugASTNode();
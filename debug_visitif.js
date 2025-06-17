const { PythonParser } = require('./dist/parser');

// visitIfメソッドのデバッグ用スクリプト
function debugVisitIf() {
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
    console.log('\n=== パース結果の分析 ===');
    
    // 関数定義を探す
    const functionNode = findFunctionNode(result.ir);
    if (functionNode) {
      console.log('関数が見つかりました:', functionNode.text);
      console.log('関数の子要素数:', functionNode.children.length);
      
      // IF文を探す
      const ifNode = findIfNode(functionNode.children);
      if (ifNode) {
        console.log('\nIF文が見つかりました:', ifNode.text);
        console.log('IF文のmeta:', JSON.stringify(ifNode.meta, null, 2));
        console.log('IF文の子要素数:', ifNode.children.length);
        
        // consequentの内容を詳しく調べる
        if (ifNode.meta && ifNode.meta.consequent) {
          console.log('\nconsequentの詳細:');
          ifNode.meta.consequent.forEach((stmt, i) => {
            console.log(`  [${i}] ${stmt.kind}: "${stmt.text}"`);
            if (stmt.meta) {
              console.log(`      meta: ${JSON.stringify(stmt.meta)}`);
            }
          });
        }
        
        // alternateの内容を詳しく調べる
        if (ifNode.meta && ifNode.meta.alternate) {
          console.log('\nalternateの詳細:');
          ifNode.meta.alternate.forEach((stmt, i) => {
            console.log(`  [${i}] ${stmt.kind}: "${stmt.text}"`);
            if (stmt.meta) {
              console.log(`      meta: ${JSON.stringify(stmt.meta)}`);
            }
          });
        }
      } else {
        console.log('IF文が見つかりませんでした');
      }
      
      // 関数の全ての子要素を表示
      console.log('\n関数の全ての子要素:');
      functionNode.children.forEach((child, i) => {
        console.log(`  [${i}] ${child.kind}: "${child.text}"`);
      });
    } else {
      console.log('関数が見つかりませんでした');
    }
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

function findFunctionNode(ir) {
  if (ir.kind === 'function') {
    return ir;
  }
  if (ir.children) {
    for (const child of ir.children) {
      const result = findFunctionNode(child);
      if (result) return result;
    }
  }
  return null;
}

function findIfNode(children) {
  for (const child of children) {
    if (child.kind === 'if') {
      return child;
    }
  }
  return null;
}

debugVisitIf();
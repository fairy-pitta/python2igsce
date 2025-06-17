const { PythonParser } = require('./dist/parser');

// 生のAST構造を確認するスクリプト
function debugRawAST() {
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
    // パーサーの内部メソッドにアクセスして生のASTを取得
    const ast = parser.parseToAST(code);
    console.log('\n=== 生のAST構造 ===');
    
    // 関数定義を探す
    const functionDef = findFunctionDef(ast);
    if (functionDef) {
      console.log('関数定義が見つかりました:');
      console.log('  name:', functionDef.name);
      console.log('  body length:', functionDef.body.length);
      
      // 関数の本体を詳しく調べる
      console.log('\n関数の本体:');
      functionDef.body.forEach((stmt, i) => {
        console.log(`  [${i}] type: ${stmt.type}`);
        if (stmt.type === 'If') {
          console.log(`      test: ${JSON.stringify(stmt.test, null, 2)}`);
          console.log(`      body length: ${stmt.body.length}`);
          console.log(`      orelse length: ${stmt.orelse ? stmt.orelse.length : 0}`);
          
          // IF文の本体を詳しく調べる
          if (stmt.body && stmt.body.length > 0) {
            console.log('      IF文の本体:');
            stmt.body.forEach((bodyStmt, j) => {
              console.log(`        [${j}] type: ${bodyStmt.type}`);
              if (bodyStmt.type === 'Return') {
                console.log(`            value: ${JSON.stringify(bodyStmt.value)}`);
              }
            });
          }
          
          // ELSE文の本体を詳しく調べる
          if (stmt.orelse && stmt.orelse.length > 0) {
            console.log('      ELSE文の本体:');
            stmt.orelse.forEach((elseStmt, j) => {
              console.log(`        [${j}] type: ${elseStmt.type}`);
              if (elseStmt.type === 'Return') {
                console.log(`            value: ${JSON.stringify(elseStmt.value)}`);
              }
            });
          }
        }
      });
    } else {
      console.log('関数定義が見つかりませんでした');
    }
  } catch (error) {
    console.error('エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

function findFunctionDef(node) {
  if (node.type === 'FunctionDef') {
    return node;
  }
  
  if (node.body && Array.isArray(node.body)) {
    for (const child of node.body) {
      const result = findFunctionDef(child);
      if (result) return result;
    }
  }
  
  return null;
}

debugRawAST();
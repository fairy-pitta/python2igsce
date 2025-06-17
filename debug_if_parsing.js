const { PythonParser } = require('./dist/parser');

// IF文の解析過程をデバッグするスクリプト
function debugIfParsing() {
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
    // パーサーのvisitorインスタンスを作成
    const { PythonASTVisitor } = require('./dist/parser/visitor');
    const visitor = new PythonASTVisitor();
    
    // parseToASTメソッドを直接呼び出してAST構造を確認
    const ast = visitor.parseToAST(code);
    console.log('\n=== 生成されたAST構造 ===');
    
    // 関数定義を探す
    const functionDef = findFunctionDef(ast);
    if (functionDef) {
      console.log('関数定義:');
      console.log('  name:', functionDef.name);
      console.log('  body length:', functionDef.body.length);
      
      // 関数の本体を詳しく調べる
      console.log('\n関数の本体:');
      functionDef.body.forEach((stmt, i) => {
        console.log(`  [${i}] type: ${stmt.type}, lineno: ${stmt.lineno}`);
        if (stmt.type === 'If') {
          console.log(`      test: ${JSON.stringify(stmt.test)}`);
          console.log(`      body length: ${stmt.body.length}`);
          console.log(`      orelse length: ${stmt.orelse ? stmt.orelse.length : 0}`);
          
          // IF文の本体を詳しく調べる
          if (stmt.body && stmt.body.length > 0) {
            console.log('      IF文の本体:');
            stmt.body.forEach((bodyStmt, j) => {
              console.log(`        [${j}] type: ${bodyStmt.type}, lineno: ${bodyStmt.lineno}`);
              if (bodyStmt.type === 'Return') {
                console.log(`            value: ${JSON.stringify(bodyStmt.value)}`);
              }
            });
          } else {
            console.log('      IF文の本体: 空');
          }
          
          // ELSE文の本体を詳しく調べる
          if (stmt.orelse && stmt.orelse.length > 0) {
            console.log('      ELSE文の本体:');
            stmt.orelse.forEach((elseStmt, j) => {
              console.log(`        [${j}] type: ${elseStmt.type}, lineno: ${elseStmt.lineno}`);
              if (elseStmt.type === 'Return') {
                console.log(`            value: ${JSON.stringify(elseStmt.value)}`);
              }
            });
          } else {
            console.log('      ELSE文の本体: 空');
          }
        }
      });
    } else {
      console.log('関数定義が見つかりませんでした');
    }
    
    // 次に、このASTをIRに変換してみる
    console.log('\n=== IRへの変換 ===');
    const ir = visitor.visitNode(ast);
    console.log('IR生成完了');
    
    // 関数のIRを探す
    const functionIR = findFunctionIR(ir);
    if (functionIR) {
      console.log('\n関数IR:');
      console.log('  text:', functionIR.text);
      console.log('  children length:', functionIR.children.length);
      
      // IF文のIRを探す
      const ifIR = findIfIR(functionIR.children);
      if (ifIR) {
        console.log('\nIF文IR:');
        console.log('  text:', ifIR.text);
        console.log('  meta:', JSON.stringify(ifIR.meta, null, 2));
        console.log('  children length:', ifIR.children.length);
      } else {
        console.log('\nIF文IRが見つかりませんでした');
      }
    } else {
      console.log('\n関数IRが見つかりませんでした');
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

function findFunctionIR(ir) {
  if (ir.kind === 'function') {
    return ir;
  }
  if (ir.children) {
    for (const child of ir.children) {
      const result = findFunctionIR(child);
      if (result) return result;
    }
  }
  return null;
}

function findIfIR(children) {
  for (const child of children) {
    if (child.kind === 'if') {
      return child;
    }
  }
  return null;
}

debugIfParsing();
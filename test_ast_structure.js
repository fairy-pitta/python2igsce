const { Converter } = require('./dist/converter');

// AST構造テストスクリプト
function testASTStructure() {
  const converter = new Converter();
  
  // テストケース1: 単純なIF-ELSE文
  console.log('=== テストケース1: 単純なIF-ELSE文 ===');
  const code1 = `
def test_function():
    if x > 5:
        return 1
    else:
        return 2
`;
  
  try {
    const result1 = converter.convert(code1);
    console.log('変換結果:');
    console.log(result1.code);
    
    // IR構造の詳細分析
    console.log('\nIR構造の分析:');
    analyzeIRStructure(result1.ast, 0);
  } catch (error) {
    console.error('エラー:', error.message);
  }
  
  // テストケース2: ネストされたIF文
  console.log('\n=== テストケース2: ネストされたIF文 ===');
  const code2 = `
def test_function():
    if x > 5:
        if y > 3:
            return 1
        else:
            return 2
    else:
        return 3
`;
  
  try {
    const result2 = converter.convert(code2);
    console.log('変換結果:');
    console.log(result2.code);
    
    // IR構造の詳細分析
    console.log('\nIR構造の分析:');
    analyzeIRStructure(result2.ast, 0);
  } catch (error) {
    console.error('エラー:', error.message);
  }
  
  // テストケース3: ELIF文
  console.log('\n=== テストケース3: ELIF文 ===');
  const code3 = `
def test_function():
    if x > 5:
        return 1
    elif x > 3:
        return 2
    else:
        return 3
`;
  
  try {
    const result3 = converter.convert(code3);
    console.log('変換結果:');
    console.log(result3.code);
    
    // IR構造の詳細分析
    console.log('\nIR構造の分析:');
    analyzeIRStructure(result3.ast, 0);
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

function analyzeIRStructure(ir, depth) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${ir.kind}: ${ir.text}`);
  
  if (ir.kind === 'if') {
    console.log(`${indent}  条件: ${ir.meta?.condition || 'なし'}`);
    
    if (ir.meta?.consequent) {
      console.log(`${indent}  THEN側 (consequent): ${ir.meta.consequent.length}個のステートメント`);
      ir.meta.consequent.forEach((stmt, i) => {
        console.log(`${indent}    [${i}] ${stmt.kind}: ${stmt.text}`);
        if (stmt.children && stmt.children.length > 0) {
          stmt.children.forEach(child => analyzeIRStructure(child, depth + 3));
        }
      });
    } else {
      console.log(`${indent}  THEN側 (consequent): なし`);
    }
    
    if (ir.meta?.alternate) {
      console.log(`${indent}  ELSE側 (alternate): ${ir.meta.alternate.length}個のステートメント`);
      ir.meta.alternate.forEach((stmt, i) => {
        console.log(`${indent}    [${i}] ${stmt.kind}: ${stmt.text}`);
        if (stmt.kind === 'if') {
          analyzeIRStructure(stmt, depth + 2);
        } else if (stmt.children && stmt.children.length > 0) {
          stmt.children.forEach(child => analyzeIRStructure(child, depth + 3));
        }
      });
    } else {
      console.log(`${indent}  ELSE側 (alternate): なし`);
    }
  } else if (ir.kind === 'else') {
    if (ir.meta?.consequent) {
      console.log(`${indent}  ELSE本体 (consequent): ${ir.meta.consequent.length}個のステートメント`);
      ir.meta.consequent.forEach((stmt, i) => {
        console.log(`${indent}    [${i}] ${stmt.kind}: ${stmt.text}`);
        if (stmt.children && stmt.children.length > 0) {
          stmt.children.forEach(child => analyzeIRStructure(child, depth + 3));
        }
      });
    }
  }
  
  // 通常の子要素も処理
  if (ir.children && ir.children.length > 0) {
    ir.children.forEach(child => {
      analyzeIRStructure(child, depth + 1);
    });
  }
}

testASTStructure();
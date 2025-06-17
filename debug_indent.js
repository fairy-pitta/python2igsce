// インデントレベルをデバッグするスクリプト
function debugIndent() {
  const code = `
def factorial(n):
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)
`;
  
  console.log('Python code:');
  console.log(code);
  
  const lines = code.split('\n');
  console.log('\n=== 行ごとのインデント分析 ===');
  
  lines.forEach((line, i) => {
    if (line.trim()) {
      const indentLevel = line.length - line.trimStart().length;
      console.log(`行 ${i + 1}: インデント=${indentLevel}, 内容="${line.trim()}", 生の行="${line}"`);
    } else {
      console.log(`行 ${i + 1}: 空行`);
    }
  });
  
  // IF文の処理をシミュレート
  console.log('\n=== IF文処理のシミュレーション ===');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('if ')) {
      console.log(`\nIF文発見: 行 ${i + 1}`);
      console.log(`  IF文のインデント: ${line.length - line.trimStart().length}`);
      
      const ifIndentLevel = line.length - line.trimStart().length;
      const expectedBodyIndent = ifIndentLevel + 4;
      console.log(`  期待される本体のインデント: ${expectedBodyIndent}`);
      
      i++; // 次の行に進む
      const bodyNodes = [];
      
      console.log('  本体の収集開始:');
      while (i < lines.length && !lines[i].trim().startsWith('elif') && !lines[i].trim().startsWith('else')) {
        const bodyLine = lines[i];
        const bodyLineIndentLevel = bodyLine.length - bodyLine.trimStart().length;
        
        console.log(`    行 ${i + 1}: インデント=${bodyLineIndentLevel}, 内容="${bodyLine.trim()}", 生の行="${bodyLine}"`);
        
        // 空行はスキップ
        if (!bodyLine.trim()) {
          console.log(`      -> 空行のためスキップ`);
          i++;
          continue;
        }
        
        // IF文の本体より浅いインデントの場合は終了
        if (bodyLineIndentLevel <= ifIndentLevel) {
          console.log(`      -> インデントが浅いため終了 (${bodyLineIndentLevel} <= ${ifIndentLevel})`);
          break;
        }
        
        // IF文の本体として収集
        if (bodyLineIndentLevel >= expectedBodyIndent) {
          console.log(`      -> 本体として収集 (${bodyLineIndentLevel} >= ${expectedBodyIndent})`);
          bodyNodes.push({
            type: 'Return',
            line: bodyLine.trim(),
            lineno: i + 1
          });
        } else {
          console.log(`      -> インデントが不十分のためスキップ (${bodyLineIndentLevel} < ${expectedBodyIndent})`);
        }
        
        i++;
      }
      
      console.log(`  収集された本体ノード数: ${bodyNodes.length}`);
      bodyNodes.forEach((node, j) => {
        console.log(`    [${j}] ${node.type}: "${node.line}"`);
      });
      
      // ELSE文の処理
      if (i < lines.length && lines[i].trim() === 'else:') {
        console.log(`\nELSE文発見: 行 ${i + 1}`);
        i++; // else行をスキップ
        
        const elseBodyNodes = [];
        console.log('  ELSE本体の収集開始:');
        while (i < lines.length && lines[i].startsWith('    ')) {
          const elseLine = lines[i];
          if (elseLine.trim()) {
            console.log(`    行 ${i + 1}: "${elseLine.trim()}"`);
            elseBodyNodes.push({
              type: 'Return',
              line: elseLine.trim(),
              lineno: i + 1
            });
          }
          i++;
        }
        
        console.log(`  収集されたELSE本体ノード数: ${elseBodyNodes.length}`);
        elseBodyNodes.forEach((node, j) => {
          console.log(`    [${j}] ${node.type}: "${node.line}"`);
        });
      }
      
      i--; // 次のループで正しい行を処理するため
    }
    
    i++;
  }
}

debugIndent();
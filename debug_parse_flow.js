// parseToASTメソッドの処理フローをデバッグするスクリプト
function debugParseFlow() {
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
  const nodes = [];
  let i = 0;
  
  console.log('\n=== parseToASTメソッドの処理フローシミュレーション ===');
  
  while (i < lines.length) {
    const line = lines[i];
    console.log(`\n処理中の行 ${i + 1}: "${line}"`);
    
    if (line.trim()) {
      const node = parseLineToASTSimulation(line, i + 1);
      console.log(`  生成されたノード: type=${node.type}`);
      
      // 関数定義の場合
      if (node.type === 'FunctionDef') {
        console.log('  -> 関数定義として処理');
        i++;
        const bodyNodes = [];
        
        // 関数定義のインデントレベルを取得
        const funcLine = lines[i - 1];
        const funcIndentLevel = funcLine.length - funcLine.trimStart().length;
        const expectedBodyIndent = funcIndentLevel + 4;
        
        console.log(`    関数のインデント: ${funcIndentLevel}`);
        console.log(`    期待される本体のインデント: ${expectedBodyIndent}`);
        
        // インデントされた行を関数の本体として収集
        while (i < lines.length) {
          const line = lines[i];
          const lineIndentLevel = line.length - line.trimStart().length;
          
          console.log(`    行 ${i + 1}: インデント=${lineIndentLevel}, 内容="${line.trim()}"`);
          
          // 空行はスキップ
          if (!line.trim()) {
            console.log(`      -> 空行のためスキップ`);
            i++;
            continue;
          }
          
          // 関数の本体より浅いインデントの場合は終了
          if (lineIndentLevel <= funcIndentLevel) {
            console.log(`      -> インデントが浅いため終了`);
            break;
          }
          
          // 関数の本体として処理
          if (lineIndentLevel >= expectedBodyIndent || line.trim()) {
            console.log(`      -> 関数の本体として処理`);
            const bodyNode = parseLineToASTSimulation(line, i + 1);
            console.log(`        生成されたノード: type=${bodyNode.type}`);
            
            // IF文の場合、特別な処理
            if (bodyNode.type === 'If') {
              console.log(`        -> IF文として特別処理開始`);
              i++;
              const ifBodyNodes = [];
              
              // 現在のIF文のインデントレベルを取得
              const currentLine = lines[i - 1];
              const ifIndentLevel = currentLine.length - currentLine.trimStart().length;
              const expectedIfBodyIndent = ifIndentLevel + 4;
              
              console.log(`          IF文のインデント: ${ifIndentLevel}`);
              console.log(`          期待されるIF本体のインデント: ${expectedIfBodyIndent}`);
              
              while (i < lines.length && !lines[i].trim().startsWith('elif') && !lines[i].trim().startsWith('else')) {
                const ifLine = lines[i];
                const ifLineIndentLevel = ifLine.length - ifLine.trimStart().length;
                
                console.log(`          行 ${i + 1}: インデント=${ifLineIndentLevel}, 内容="${ifLine.trim()}"`);
                
                // 空行はスキップ
                if (!ifLine.trim()) {
                  console.log(`            -> 空行のためスキップ`);
                  i++;
                  continue;
                }
                
                // IF文の本体より浅いインデントの場合は終了
                if (ifLineIndentLevel <= ifIndentLevel) {
                  console.log(`            -> インデントが浅いため終了`);
                  break;
                }
                
                // IF文の本体として収集
                if (ifLineIndentLevel >= expectedIfBodyIndent) {
                  console.log(`            -> IF本体として収集`);
                  const ifBodyNode = parseLineToASTSimulation(ifLine, i + 1);
                  ifBodyNodes.push(ifBodyNode);
                }
                
                i++;
              }
              
              bodyNode.body = ifBodyNodes;
              console.log(`        IF文の本体設定完了: ${ifBodyNodes.length}個のノード`);
              
              // ELSE文の処理
              if (i < lines.length && lines[i].trim() === 'else:') {
                console.log(`        -> ELSE文処理開始`);
                i++; // else行をスキップ
                
                const elseBodyNodes = [];
                while (i < lines.length && lines[i].startsWith('    ')) {
                  const elseLine = lines[i];
                  if (elseLine.trim()) {
                    console.log(`          ELSE本体: "${elseLine.trim()}"`);
                    const elseNode = parseLineToASTSimulation(elseLine, i + 1);
                    elseBodyNodes.push(elseNode);
                  }
                  i++;
                }
                
                bodyNode.orelse = elseBodyNodes;
                console.log(`        ELSE文の本体設定完了: ${elseBodyNodes.length}個のノード`);
              }
              
              i--; // 次のループで正しい行を処理するため
            }
            
            bodyNodes.push(bodyNode);
          }
          i++;
        }
        
        node.body = bodyNodes;
        console.log(`  関数の本体設定完了: ${bodyNodes.length}個のノード`);
        i--; // 次のループで正しい行を処理するため
      }
      
      nodes.push(node);
      console.log(`  ノードを配列に追加: 現在の配列サイズ=${nodes.length}`);
    }
    i++;
  }
  
  console.log('\n=== 最終的なAST構造 ===');
  const ast = {
    type: 'Module',
    body: nodes
  };
  
  // 関数定義を探す
  const functionDef = findFunctionDef(ast);
  if (functionDef) {
    console.log('関数定義:');
    console.log('  name:', functionDef.name);
    console.log('  body length:', functionDef.body.length);
    
    // IF文を探す
    const ifNode = functionDef.body.find(node => node.type === 'If');
    if (ifNode) {
      console.log('\nIF文:');
      console.log('  body length:', ifNode.body.length);
      console.log('  orelse length:', ifNode.orelse ? ifNode.orelse.length : 0);
      
      if (ifNode.body && ifNode.body.length > 0) {
        console.log('  IF本体:');
        ifNode.body.forEach((stmt, i) => {
          console.log(`    [${i}] type: ${stmt.type}`);
        });
      }
      
      if (ifNode.orelse && ifNode.orelse.length > 0) {
        console.log('  ELSE本体:');
        ifNode.orelse.forEach((stmt, i) => {
          console.log(`    [${i}] type: ${stmt.type}`);
        });
      }
    }
  }
}

function parseLineToASTSimulation(line, lineNumber) {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('def ')) {
    const match = trimmed.match(/def\s+(\w+)\s*\(([^)]*)\)\s*:/);
    if (match) {
      const [, funcName, params] = match;
      return {
        type: 'FunctionDef',
        name: funcName,
        args: { args: params.split(',').map(p => ({ arg: p.trim() })) },
        body: [],
        lineno: lineNumber
      };
    }
  }
  
  if (trimmed.startsWith('if ')) {
    return {
      type: 'If',
      test: { type: 'Compare' },
      body: [],
      orelse: [],
      lineno: lineNumber
    };
  }
  
  if (trimmed.startsWith('return ')) {
    return {
      type: 'Return',
      value: { type: 'Constant', value: trimmed.slice(7) },
      lineno: lineNumber
    };
  }
  
  if (trimmed === 'else:') {
    return {
      type: 'Else',
      body: [],
      lineno: lineNumber
    };
  }
  
  return {
    type: 'Unknown',
    value: trimmed,
    lineno: lineNumber
  };
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

debugParseFlow();
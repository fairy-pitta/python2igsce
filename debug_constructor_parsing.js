const { PythonASTVisitor } = require('./dist/parser/visitor');

async function main() {
  try {
    console.log('=== Constructor Parsing Debug ===');
    
    const pythonCode = `class Point:
    def __init__(self, x: int, y: int):
        self.x = x
        self.y = y`;
    
    console.log('Python code lines:');
    pythonCode.split('\n').forEach((line, i) => {
      console.log(`${i}: "${line}"`);
    });
    
    const visitor = new PythonASTVisitor();
    
    // parseToASTSimpleメソッドを直接呼び出してAST構造を確認
    const ast = visitor.parseToASTSimple(pythonCode);
    
    console.log('AST structure:');
    console.log(JSON.stringify(ast, null, 2));
    
    // 特にクラス定義部分を確認
    if (ast.body && ast.body.length > 0) {
      const classDef = ast.body.find(node => node.type === 'ClassDef');
      if (classDef) {
        console.log('\n=== Class Definition ===');
        console.log('Class name:', classDef.name);
        console.log('Class body length:', classDef.body ? classDef.body.length : 0);
        
        if (classDef.body && classDef.body.length > 0) {
          classDef.body.forEach((item, i) => {
            console.log(`Body item ${i}:`, item.type, item.name || '');
            if (item.type === 'FunctionDef' && item.name === '__init__') {
              console.log('  Constructor found!');
              console.log('  Constructor body length:', item.body ? item.body.length : 0);
              if (item.body) {
                item.body.forEach((stmt, j) => {
                  console.log(`    Statement ${j}:`, stmt.type);
                  if (stmt.type === 'Assign') {
                    console.log('      Target:', stmt.targets[0]);
                    console.log('      Value:', stmt.value);
                  }
                });
              }
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
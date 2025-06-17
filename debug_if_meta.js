const { Converter } = require('./dist/converter');

// IF文のmeta情報デバッグスクリプト
function debugIfMeta() {
  const converter = new Converter();
  
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
    const result = converter.convert(code);
    console.log('\n=== 変換結果 ===');
    console.log(result.code);
    
    console.log('\n=== IR構造の詳細分析 ===');
    analyzeIRStructureDetailed(result.ast, 0);
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

function analyzeIRStructureDetailed(ir, depth) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${ir.kind}: "${ir.text}"`);
  
  if (ir.meta) {
    console.log(`${indent}  meta:`);
    for (const [key, value] of Object.entries(ir.meta)) {
      if (key === 'consequent' || key === 'alternate') {
        if (Array.isArray(value)) {
          console.log(`${indent}    ${key}: [${value.length}個の要素]`);
          value.forEach((item, i) => {
            console.log(`${indent}      [${i}] ${item.kind}: "${item.text}"`);
            if (item.meta) {
              console.log(`${indent}        meta: ${JSON.stringify(item.meta, null, 2).replace(/\n/g, '\n' + indent + '        ')}`);
            }
          });
        } else {
          console.log(`${indent}    ${key}: ${value}`);
        }
      } else {
        console.log(`${indent}    ${key}: ${value}`);
      }
    }
  }
  
  if (ir.children && ir.children.length > 0) {
    console.log(`${indent}  children: [${ir.children.length}個]`);
    ir.children.forEach((child, i) => {
      console.log(`${indent}    [${i}]:`);
      analyzeIRStructureDetailed(child, depth + 2);
    });
  }
}

debugIfMeta();
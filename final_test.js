const { Converter } = require('./dist/index.js');
const fs = require('fs');

async function test() {
  const converter = new Converter({
    maxLineLength: 0
  });
  
  console.log('Final test of comparison operator conversion:');
  
  // テストファイルの内容を読み込み
  const pythonCode = fs.readFileSync('test.py', 'utf8');
  console.log('\nInput Python code:');
  console.log(pythonCode);
  
  try {
    const result = await converter.convert(pythonCode);
    console.log('\nConverted pseudocode:');
    console.log(result.code);
    
    // 特殊文字の確認
    const hasGreaterEqual = result.code.includes('≥');
    const hasLessEqual = result.code.includes('≤');
    const hasNotEqual = result.code.includes('≠');
    
    console.log('\nConversion verification:');
    console.log(`Contains ≥ (greater or equal): ${hasGreaterEqual}`);
    console.log(`Contains ≤ (less or equal): ${hasLessEqual}`);
    console.log(`Contains ≠ (not equal): ${hasNotEqual}`);
    
    if (hasGreaterEqual && hasLessEqual && hasNotEqual) {
      console.log('\n✅ All comparison operators converted correctly!');
    } else {
      console.log('\n❌ Some comparison operators not converted properly.');
    }
    
    // 結果をファイルに保存
    fs.writeFileSync('test_output.txt', result.code);
    console.log('\nOutput saved to test_output.txt');
    
  } catch (error) {
    console.error('Error during conversion:', error.message);
  }
}

test();
const { Converter } = require('./dist/index.js');

async function test() {
  const converter = new Converter({
    maxLineLength: 0
  });
  
  console.log('Testing comparison operator conversion after fix:');
  
  const testCases = [
    'a >= b',
    'a <= b', 
    'a != b',
    'result = (a >= b)',
    'is_equal = (a == b)',
    'is_not_equal = (a != b)',
    'is_greater_equal = (a >= b)',
    'is_less_equal = (a <= b)'
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\nInput: ${testCase}`);
      const result = await converter.convert(testCase);
      console.log(`Output: "${result.code}"`);
      
      // 特殊文字の確認
      const hasSpecialChars = /[≠≥≤]/.test(result.code);
      console.log(`Contains special chars: ${hasSpecialChars}`);
      
      // 期待される変換の確認
      if (testCase.includes('>=') && result.code.includes('≥')) {
        console.log('✅ >= correctly converted to ≥');
      } else if (testCase.includes('<=') && result.code.includes('≤')) {
        console.log('✅ <= correctly converted to ≤');
      } else if (testCase.includes('!=') && result.code.includes('≠')) {
        console.log('✅ != correctly converted to ≠');
      } else if (testCase.includes('==') && result.code.includes(' = ')) {
        console.log('✅ == correctly converted to =');
      } else if (testCase.includes('>=') || testCase.includes('<=') || testCase.includes('!=')) {
        console.log('❌ Missing special characters!');
      } else {
        console.log('✅ Conversion looks correct');
      }
      
    } catch (error) {
      console.error(`Error with ${testCase}:`, error.message);
    }
  }
}

test();
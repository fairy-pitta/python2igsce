const { Python2IGCSEConverter } = require('./dist/converter');

// テストコード
const code = `
def display_message(msg):
    print(msg)

display_message("Hello")
`;

async function test() {
  try {
    const converter = new Python2IGCSEConverter();
    const result = converter.convert(code);
    
    console.log('=== 変換結果 ===');
    console.log(result);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
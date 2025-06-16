import { Converter } from './dist/index.js';

function testFactorial() {
    const converter = new Converter({
        outputFormat: 'plain',
        indentSize: 3,
        indentType: 'spaces',
        beautify: true
    });

    const pythonCode = `def factorial(n):
    if n <= 1:
        return 1
    else:
        return n * factorial(n - 1)`;

    console.log('Testing factorial function:');
    console.log('Python code:');
    console.log(pythonCode);
    console.log('\n' + '='.repeat(50) + '\n');

    try {
        console.log('\n=== CALLING CONVERT ===');
        const result = converter.convert(pythonCode);
        console.log('\n=== CONVERT RETURNED ===');
        
        console.log('\n=== RESULT OBJECT ===');
        console.log('Result keys:', Object.keys(result));
        console.log('Result:', JSON.stringify(result, null, 2));
        console.log('\n=== PARSED AST ===');
        console.log(JSON.stringify(result.ast, null, 2));
        console.log('\n=== CONVERSION RESULT ===');
        
        console.log('Conversion result:');
        console.log('Code:', result.code);
        if (result.parseResult) {
            console.log('Errors:', result.parseResult.errors);
            console.log('Warnings:', result.parseResult.warnings);
        } else {
            console.log('No parseResult available');
        }
        
        if (result.code) {
            console.log('\nExpected patterns:');
            console.log('Contains "FUNCTION factorial":', result.code.includes('FUNCTION factorial'));
            console.log('Contains "IF n ≤ 1":', result.code.includes('IF n ≤ 1'));
            console.log('Contains "RETURN 1":', result.code.includes('RETURN 1'));
            console.log('Contains "ENDFUNCTION":', result.code.includes('ENDFUNCTION'));
        }
    } catch (error) {
        console.error('Error during conversion:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
    }
}

testFactorial();
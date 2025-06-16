import { Converter } from './dist/converter.js';

async function runTest() {
    const converter = new Converter({
        outputFormat: 'plain',
        indentSize: 3,
        indentType: 'spaces',
        beautify: true
    });

    try {
        // Test simple assignment
        const simpleCode = 'x = 5';
        console.log('\nSimple assignment test:');
        console.log('Python:', simpleCode);
        const simpleResult = await converter.convert(simpleCode);
        console.log('Simple result:', JSON.stringify(simpleResult, null, 2));
        if (simpleResult.code) {
            console.log('Output:', simpleResult.code);
            console.log('Expected "x ← 5":', simpleResult.code.includes('x ← 5'));
        }
    } catch (error) {
        console.error('Error during conversion:', error);
        console.error('Stack:', error.stack);
    }
}

runTest();
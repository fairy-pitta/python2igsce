import { Converter } from './dist/converter.js';
import fs from 'fs';

const converter = new Converter();

try {
    const pythonCode = fs.readFileSync('./test_if_else.py', 'utf8');
    console.log('=== Python Code ===');
    console.log(pythonCode);
    console.log('\n=== Converting ===');
    
    const result = converter.convert(pythonCode);
    
    console.log('\n=== Conversion Result ===');
    console.log('Code:');
    console.log(result.code);
    
    if (result.errors && result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(error => console.log(`- ${error}`));
    }
    
    if (result.warnings && result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach(warning => console.log(`- ${warning}`));
    }
    
    console.log('\n=== Expected Patterns ===');
    console.log('Should contain:');
    console.log('- IF x > 10 THEN');
    console.log('- ELSE IF x > 5 THEN');
    console.log('- ELSE IF x > 0 THEN');
    console.log('- ELSE');
    console.log('- ENDIF');
    console.log('- IF n MOD 2 = 0 THEN');
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}
import { TextEmitter } from './dist/emitter/text-emitter.js';
import { createIR } from './dist/types/ir.js';

const textEmitter = new TextEmitter();

async function testNestedIf() {
  try {
    console.log('Testing nested IF statements...');
    
    // Create nested IR structure
    const level3 = createIR('assign', 'result ← a + b', []);
    const level2 = createIR('if', 'IF b > 0 THEN', [level3]);
    const level1 = createIR('if', 'IF a > 0 THEN', [level2]);
    const level0 = createIR('if', 'IF x > 0 THEN', [level1]);
    
    console.log('IR structure:');
    console.log(JSON.stringify(level0, null, 2));
    
    const result = textEmitter.emit(level0);
    console.log('\nGenerated code:');
    console.log('"' + result.code + '"');
    
    const lines = result.code.split('\n');
    console.log('\nLines breakdown:');
    lines.forEach((line, index) => {
      console.log(`Line ${index}: "${line}"`);
    });
    
    console.log('\n--- Checking expectations ---');
    console.log('Line 0 should be "IF x > 0 THEN":', lines[0] === 'IF x > 0 THEN');
    console.log('Line 1 should be "    IF a > 0 THEN":', lines[1] === '    IF a > 0 THEN');
    console.log('Line 2 should be "        IF b > 0 THEN":', lines[2] === '        IF b > 0 THEN');
    console.log('Line 3 should be "            result ← a + b":', lines[3] === '            result ← a + b');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testNestedIf();
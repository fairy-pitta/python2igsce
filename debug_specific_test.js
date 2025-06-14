const { convertPython } = require('./dist/index');

// Test the specific failing case
const python = `
def add(a, b):
    return a + b

def main():
    while True:
        print("Enter first number: ")
        num1 = int(input())
        print("Enter second number: ")
        num2 = int(input())
        
        if num1 < 0 or num2 < 0:
            print("Negative numbers not allowed")
            continue
            
        result = add(num1, num2)
        print(f"Result: {result}")
        
        print("Continue? (y/n): ")
        choice = input()
        if choice.lower() != 'y':
            break
            
    print("Goodbye!")

main()
`;

(async () => {
  try {
    console.log('Testing complex example...');
    const result = await convertPython(python);
    console.log('\n=== Result ===');
    console.log(result);
    
    console.log('\n=== Checking patterns ===');
    console.log('Contains "FUNCTION Add":', result.includes('FUNCTION Add'));
    console.log('Contains "PROCEDURE Main":', result.includes('PROCEDURE Main'));
    console.log('Contains "WHILE TRUE":', result.includes('WHILE TRUE'));
    console.log('Contains "IF num1 < 0 OR num2 < 0 THEN":', result.includes('IF num1 < 0 OR num2 < 0 THEN'));
    
  } catch (error) {
    console.error('Error:', error);
  }
})();
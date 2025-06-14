const { convertPython } = require('./dist/index.js');

async function runTests() {
  // Test case 1: Array processing
  const arrayTest = `
# Find maximum in array
numbers = [23, 45, 12, 67, 34]
max_value = numbers[0]

for i in range(1, len(numbers)):
    if numbers[i] > max_value:
        max_value = numbers[i]

print(f"Maximum value is: {max_value}")
`;

  console.log('=== Array Processing Test ===');
  const arrayResult = await convertPython(arrayTest);
  console.log('Result:');
  console.log(arrayResult);
  console.log('\n--- Checking expectations ---');
  console.log('Contains "DECLARE numbers : ARRAY":', arrayResult.includes('DECLARE numbers : ARRAY'));
  console.log('Contains "FOR i ← 2 TO 5":', arrayResult.includes('FOR i ← 2 TO 5'));
  console.log('Contains "IF numbers[i] > max_value THEN":', arrayResult.includes('IF numbers[i] > max_value THEN'));

  // Test case 2: Complex function example
  const complexTest = `
def add_numbers(num1, num2):
    if num1 < 0 or num2 < 0:
        return None
    return num1 + num2

def main():
    while True:
        try:
            x = int(input("Enter first number: "))
            y = int(input("Enter second number: "))
            result = add_numbers(x, y)
            if result is not None:
                print(f"Sum: {result}")
            else:
                print("Invalid input")
            break
        except ValueError:
            print("Please enter valid numbers")

if __name__ == "__main__":
    main()
`;

  console.log('\n\n=== Complex Function Test ===');
  const complexResult = await convertPython(complexTest);
  console.log('Result:');
  console.log(complexResult);
  console.log('\n--- Checking expectations ---');
  console.log('Contains "FUNCTION Add":', complexResult.includes('FUNCTION Add'));
  console.log('Contains "PROCEDURE Main":', complexResult.includes('PROCEDURE Main'));
  console.log('Contains "WHILE TRUE":', complexResult.includes('WHILE TRUE'));
  console.log('Contains "IF num1 < 0 OR num2 < 0 THEN":', complexResult.includes('IF num1 < 0 OR num2 < 0 THEN'));
}

runTests().catch(console.error);
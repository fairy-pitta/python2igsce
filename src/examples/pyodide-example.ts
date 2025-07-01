/**
 * Pyodide ASTパーサーの使用例
 */

import { getPyodideParser, parsePythonWithPyodide } from '../parser/pyodide-ast-parser';
import { Converter } from '../converter';

/**
 * 基本的なPyodideパーサーの使用例
 */
export async function basicPyodideExample() {
  console.log('=== Basic Pyodide Parser Example ===');
  
  const pythonCode = `
# 基本的なPythonコード例
x = 10
y = 20
z = x + y
print(f"Result: {z}")

if z > 25:
    print("Greater than 25")
else:
    print("Less than or equal to 25")

for i in range(3):
    print(f"Loop {i}")
  `;

  try {
    // Pyodideパーサーを使用してASTを取得
    const ast = await parsePythonWithPyodide(pythonCode);
    console.log('AST parsed successfully:');
    console.log(JSON.stringify(ast, null, 2));
    
    return ast;
  } catch (error) {
    console.error('Pyodide parsing failed:', error);
    throw error;
  }
}

/**
 * Converterと組み合わせた使用例
 */
export async function converterWithPyodideExample() {
  console.log('=== Converter with Pyodide Example ===');
  
  const pythonCode = `
# 関数定義の例
def calculate_area(radius):
    pi = 3.14159
    area = pi * radius ** 2
    return area

# メイン処理
radius = float(input("Enter radius: "))
result = calculate_area(radius)
print(f"Area: {result}")
  `;

  try {
    // Converterを使用（内部でPyodideパーサーが使用される）
    const converter = new Converter({
      parser: {
        usePyodide: true,  // Pyodideの使用を明示的に指定
        strict: true
      },
      emitter: {
        format: 'text',
        indentSize: 2
      }
    });

    const result = await converter.convert(pythonCode);
    
    console.log('Conversion successful:');
    console.log('IGCSE Pseudocode:');
    console.log(result.code);
    
    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach(error => console.log(`- ${error.message}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('Warnings:');
      result.warnings.forEach(warning => console.log(`- ${warning.message}`));
    }
    
    return result;
  } catch (error) {
    console.error('Conversion failed:', error);
    throw error;
  }
}

/**
 * 複雑なPythonコードの解析例
 */
export async function complexPythonExample() {
  console.log('=== Complex Python Code Example ===');
  
  const pythonCode = `
# クラス定義
class Student:
    def __init__(self, name, age):
        self.name = name
        self.age = age
        self.grades = []
    
    def add_grade(self, grade):
        if 0 <= grade <= 100:
            self.grades.append(grade)
        else:
            raise ValueError("Grade must be between 0 and 100")
    
    def get_average(self):
        if not self.grades:
            return 0
        return sum(self.grades) / len(self.grades)

# 使用例
students = []
for i in range(3):
    name = input(f"Enter student {i+1} name: ")
    age = int(input(f"Enter student {i+1} age: "))
    student = Student(name, age)
    
    # 成績を追加
    for j in range(2):
        grade = float(input(f"Enter grade {j+1} for {name}: "))
        try:
            student.add_grade(grade)
        except ValueError as e:
            print(f"Error: {e}")
    
    students.append(student)

# 結果表示
for student in students:
    avg = student.get_average()
    print(f"{student.name} (Age: {student.age}): Average = {avg:.2f}")
  `;

  try {
    const ast = await parsePythonWithPyodide(pythonCode);
    console.log('Complex Python code parsed successfully');
    console.log(`AST contains ${ast.body?.length || 0} top-level statements`);
    
    // AST構造の概要を表示
    if (ast.body) {
      console.log('Top-level statements:');
      ast.body.forEach((stmt: any, index: number) => {
        console.log(`  ${index + 1}. ${stmt.type}`);
      });
    }
    
    return ast;
  } catch (error) {
    console.error('Complex parsing failed:', error);
    throw error;
  }
}

/**
 * エラーハンドリングの例
 */
export async function errorHandlingExample() {
  console.log('=== Error Handling Example ===');
  
  const invalidPythonCode = `
# 構文エラーを含むPythonコード
if x > 10
    print("Missing colon")
    
def invalid_function(
    print("Missing closing parenthesis")
  `;

  try {
    const ast = await parsePythonWithPyodide(invalidPythonCode);
    console.log('Unexpected success - this should have failed');
    return ast;
  } catch (error) {
    console.log('Expected error caught:');
    console.log(`Error type: ${error.constructor.name}`);
    console.log(`Error message: ${error.message}`);
    
    // エラー情報の詳細表示
    if (error.line !== undefined) {
      console.log(`Line: ${error.line}`);
    }
    if (error.column !== undefined) {
      console.log(`Column: ${error.column}`);
    }
    
    return null;
  }
}

/**
 * パフォーマンステストの例
 */
export async function performanceExample() {
  console.log('=== Performance Test Example ===');
  
  const pythonCode = `
# 中程度の複雑さのPythonコード
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def main():
    numbers = []
    for i in range(10):
        fib = fibonacci(i)
        numbers.append(fib)
        print(f"Fibonacci({i}) = {fib}")
    
    total = sum(numbers)
    average = total / len(numbers)
    print(f"Total: {total}, Average: {average}")

if __name__ == "__main__":
    main()
  `;

  const startTime = Date.now();
  
  try {
    const ast = await parsePythonWithPyodide(pythonCode);
    const endTime = Date.now();
    const parseTime = endTime - startTime;
    
    console.log(`Parsing completed in ${parseTime}ms`);
    console.log(`AST nodes: ${ast.body?.length || 0}`);
    
    return { ast, parseTime };
  } catch (error) {
    const endTime = Date.now();
    const parseTime = endTime - startTime;
    
    console.error(`Parsing failed after ${parseTime}ms:`, error);
    throw error;
  }
}

/**
 * すべての例を実行
 */
export async function runAllExamples() {
  console.log('Running all Pyodide examples...');
  
  try {
    await basicPyodideExample();
    console.log('\n');
    
    await converterWithPyodideExample();
    console.log('\n');
    
    await complexPythonExample();
    console.log('\n');
    
    await errorHandlingExample();
    console.log('\n');
    
    await performanceExample();
    console.log('\n');
    
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}
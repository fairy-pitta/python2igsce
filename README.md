# Python to IGCSE Pseudocode Converter

[![npm version](https://badge.fury.io/js/python2igcse.svg)](https://badge.fury.io/js/python2igcse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

A powerful TypeScript library and CLI tool that converts Python code to IGCSE (International General Certificate of Secondary Education) Pseudocode format. Perfect for educators, students, and curriculum developers working with Cambridge IGCSE Computer Science.

## Features

- **Complete Python to IGCSE Pseudocode conversion**
- **Multiple output formats**: Plain text and Markdown
- **CLI tool** for batch processing and file watching
- **Configurable formatting** options
- **Educational optimizations** for IGCSE standards
- **TypeScript support** with full type definitions
- **Comprehensive error handling** and validation
- **Code quality analysis** and complexity metrics
- **Watch mode** for real-time conversion during development

## Installation

### Global Installation (CLI)

```bash
npm install -g python2igcse
```

### Local Installation (Library)

```bash
npm install python2igcse
```

## Quick Start

### CLI Usage

```bash
# Convert a single Python file
python2igcse convert input.py -o output.txt

# Convert to Markdown format
python2igcse convert input.py -o output.md --format markdown

# Convert entire directory
python2igcse convert ./python-files -o ./pseudocode-output

# Watch for changes
python2igcse convert input.py -o output.txt --watch

# Batch convert with pattern
python2igcse batch "**/*.py" -o ./output
```

### Browser Usage

You can use python2igcse in the browser by including the library from a CDN or a local file:

```html
<!-- Include the library from CDN or local file -->
<script src="dist/browser/python2igcse.min.js"></script>

<script>
  // Use the global function
  const pythonCode = 'print("Hello, world!")';
  const options = { outputFormat: 'plain' };
  
  try {
    const result = window.Python2IGCSE.convertPythonToIGCSE(pythonCode, options);
    console.log(result.code);
    // OUTPUT "Hello, world!"
  } catch (error) {
    console.error('Conversion error:', error);
  }
</script>
```

The browser version provides the same functionality as the Node.js version, making it suitable for web applications and educational platforms.

### Library Usage

```typescript
import { convertPythonToIGCSE, Converter } from 'python2igcse';

// Simple conversion
const pythonCode = `
def calculate_area(length, width):
    area = length * width
    return area

result = calculate_area(5, 3)
print(f"Area: {result}")
`;

const result = await convertPythonToIGCSE(pythonCode);
console.log(result.code);
```

**Output:**
```
FUNCTION calculate_area(length, width)
    area ← length * width
    RETURN area
ENDFUNCTION

result ← calculate_area(5, 3)
OUTPUT "Area: ", result
```

### Advanced Usage

```typescript
import { Converter, utils } from 'python2igcse';

// Create converter with custom options
const converter = new Converter({
  outputFormat: 'markdown',
  beautify: true,
  includeComments: true,
  uppercaseKeywords: true,
  indentSize: 4
});

// Convert with validation
const result = await converter.convert(pythonCode);

if (result.success) {
  console.log('Conversion successful!');
  console.log(`Generated ${result.stats.generatedLines} lines`);
  console.log(`Parse time: ${result.stats.parseTime}ms`);
} else {
  console.error('Conversion failed:', result.errors);
}

// Analyze code complexity
const analysis = await utils.validate.analyzeComplexity(pythonCode);
console.log(`Complexity: ${analysis.complexity}`);
console.log(`Functions: ${analysis.metrics.functions}`);
```

## Supported Python Features

### Fully Supported
- Variables and assignments
- Basic data types (int, float, string, boolean)
- Arithmetic and logical operators
- Control structures (if/else, for, while)
- Functions and procedures
- Input/output operations
- Lists and basic list operations
- Comments and documentation

### Partially Supported
- Object-oriented programming (simplified)
- Advanced data structures (converted to arrays)
- Exception handling (simplified)
- File operations (basic)

### Not Supported
- Complex imports and modules
- Advanced Python features (decorators, generators, etc.)
- Third-party libraries
- Complex data structures (sets, dictionaries with advanced operations)

## Configuration

### CLI Configuration

Create a `.python2igcse.json` file in your project root:

```json
{
  "outputFormat": "plain",
  "indentSize": 4,
  "indentType": "spaces",
  "beautify": true,
  "includeComments": true,
  "uppercaseKeywords": true,
  "maxLineLength": 80
}
```

### Library Configuration

```typescript
const options = {
  outputFormat: 'plain' | 'markdown',
  indentSize: 4,
  indentType: 'spaces' | 'tabs',
  lineEnding: 'lf' | 'crlf',
  maxLineLength: 80,
  beautify: true,
  strictMode: false,
  includeComments: true,
  includeLineNumbers: false,
  uppercaseKeywords: true,
  spaceAroundOperators: true,
  spaceAfterCommas: true
};
```

## Examples

### Basic Examples

#### Variables and Operations

**Python:**
```python
x = 5
y = 10
result = x + y
print(result)
```

**IGCSE Pseudocode:**
```
x ← 5
y ← 10
result ← x + y
OUTPUT result
```

#### Conditional Statements

**Python:**
```python
age = int(input("Enter your age: "))

if age >= 18:
    print("You are an adult")
else:
    print("You are a minor")
```

**IGCSE Pseudocode:**
```
INPUT age
age ← INT(age)

IF age >= 18 THEN
    OUTPUT "You are an adult"
ELSE
    OUTPUT "You are a minor"
ENDIF
```

#### Loops

**Python:**
```python
for i in range(5):
    print(f"Number: {i}")

total = 0
for num in [1, 2, 3, 4, 5]:
    total += num
print(f"Total: {total}")
```

**IGCSE Pseudocode:**
```
FOR i ← 0 TO 4
    OUTPUT "Number: ", i
NEXT i

total ← 0
FOR num ← 1 TO 5
    total ← total + num
NEXT num
OUTPUT "Total: ", total
```

#### Functions

**Python:**
```python
def calculate_factorial(n):
    if n <= 1:
        return 1
    else:
        return n * calculate_factorial(n - 1)

result = calculate_factorial(5)
print(f"Factorial: {result}")
```

**IGCSE Pseudocode:**
```
FUNCTION calculate_factorial(n)
    IF n <= 1 THEN
        RETURN 1
    ELSE
        RETURN n * calculate_factorial(n - 1)
    ENDIF
ENDFUNCTION

result ← calculate_factorial(5)
OUTPUT "Factorial: ", result
```

## 🛠️ CLI Commands

### Convert Command

```bash
python2igcse convert <input> [options]
```

**Options:**
- `-o, --output <path>` - Output file or directory
- `-f, --format <format>` - Output format (plain|markdown)
- `--indent-size <size>` - Indentation size (default: 4)
- `--indent-type <type>` - Indentation type (spaces|tabs)
- `--max-line-length <length>` - Maximum line length
- `--no-beautify` - Disable code beautification
- `--strict` - Enable strict mode
- `--no-comments` - Exclude comments
- `--line-numbers` - Include line numbers
- `--watch` - Watch for file changes
- `--verbose` - Verbose output

### Batch Command

```bash
python2igcse batch <pattern> [options]
```

**Options:**
- `-o, --output-dir <dir>` - Output directory
- `-f, --format <format>` - Output format
- `--config <file>` - Configuration file
- `--parallel <count>` - Number of parallel conversions

### Validate Command

```bash
python2igcse validate <input> [options]
```

**Options:**
- `--strict` - Enable strict validation
- `--verbose` - Verbose output

### Stats Command

```bash
python2igcse stats <input> [options]
```

**Options:**
- `--detailed` - Show detailed statistics

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🏗️ Development

```bash
# Clone the repository
git clone https://github.com/yourusername/python2igcse.git
cd python2igcse

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run CLI in development
npm run cli -- convert example.py
```

## 📖 API Documentation

### Core Classes

#### `Converter`

Main converter class for Python to IGCSE Pseudocode conversion.

```typescript
class Converter {
  constructor(options?: Partial<ConversionOptions>)
  async convert(pythonCode: string): Promise<ConversionResult>
  async convertBatch(files: Array<{name: string, content: string}>): Promise<Array<{name: string, result: ConversionResult}>>
  updateOptions(newOptions: Partial<ConversionOptions>): void
  getOptions(): ConversionOptions
  validateIR(ir: IR): {isValid: boolean, errors: string[], warnings: string[]}
}
```

#### `ConversionResult`

```typescript
interface ConversionResult {
  success: boolean;
  code: string;
  ir: IR;
  errors: Array<{type: string, severity: string, message: string, location: {line: number, column: number}}>;
  warnings: Array<{type: string, severity: string, message: string, location: {line: number, column: number}}>;
  stats: ConversionStats;
}
```

### Utility Functions

```typescript
// Quick conversion
async function convertPythonToIGCSE(pythonCode: string, options?: Partial<ConversionOptions>): Promise<ConversionResult>

// File conversion
async function convertFileToIGCSE(filePath: string, options?: Partial<ConversionOptions>): Promise<ConversionResult>

// Multiple files
async function convertFilesToIGCSE(filePaths: string[], options?: Partial<ConversionOptions>): Promise<Array<{name: string, result: ConversionResult}>>
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for your changes
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Cambridge International Education for IGCSE Computer Science specifications
- The Python Software Foundation
- TypeScript team for excellent tooling
- All contributors and users of this project

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/fairy-pitta/python2igsce/issues)


## 🗺️ Roadmap

- [ ] Support for more Python features
- [ ] Web-based converter interface
- [ ] VS Code extension
- [ ] Integration with popular IDEs
- [ ] Support for other pseudocode formats
- [ ] Advanced optimization algorithms
- [ ] Educational analytics and insights

---

**Made with ❤️ for educators and students worldwide**

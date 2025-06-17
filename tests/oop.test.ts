import { Converter } from '../src/converter';

describe('Object-Oriented Programming (OOP) Tests', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  // CLASS Definition
  describe('CLASS Definition', () => {
    it('should convert a simple Python class to IGCSE CLASS definition', async () => {
      const pythonCode = 
`class Animal:
    def __init__(self, name: str):
        self.name = name # Public attribute by default in Python

    def speak(self):
        print("Generic animal sound")`;
      const result = await converter.convert(pythonCode);
      const expected = 
`CLASS Animal
  PRIVATE name : STRING

  PUBLIC PROCEDURE NEW(initialName : STRING)
    name ← initialName
  ENDPROCEDURE

  PUBLIC PROCEDURE speak()
    OUTPUT "Generic animal sound"
  ENDPROCEDURE
ENDCLASS`;
      // Note: Python's `self.name` is public. IGCSE often defaults to PRIVATE unless specified.
      // The constructor `__init__` maps to `PROCEDURE NEW`.
      // Parameter names in NEW might differ if `self` is handled specially.
      // This expected output assumes some conventions in the converter.
      expect(result.code).toContain('CLASS Animal');
      expect(result.code).toContain('PRIVATE name : STRING'); // Or PUBLIC if converter maps Python's default
      expect(result.code).toContain('PUBLIC PROCEDURE NEW(initialName : STRING)');
      expect(result.code).toContain('name ← initialName');
      expect(result.code).toContain('ENDPROCEDURE'); // For NEW
      expect(result.code).toContain('PUBLIC PROCEDURE speak()');
      expect(result.code).toContain('OUTPUT "Generic animal sound"');
      expect(result.code).toContain('ENDPROCEDURE'); // For speak
      expect(result.code).toContain('ENDCLASS');
    });

    it('should handle class attributes (variables)', async () => {
      const pythonCode = 
`class Circle:
    pi = 3.14159 # Class attribute

    def __init__(self, radius: float):
        self.radius = radius

    def area(self):
        return Circle.pi * self.radius * self.radius`;
      const result = await converter.convert(pythonCode);
      // IGCSE CLASS might not directly support class attributes like Python's `Circle.pi` in the same way.
      // It might be treated as a CONSTANT within the class scope or require specific handling.
      // For now, let's assume instance attributes and methods are the primary focus.
      // The translation of `Circle.pi` is a point of interest.
      // It might become a global constant or a private constant in the class if supported.
      expect(result.code).toContain('CLASS Circle');
      expect(result.code).toContain('PRIVATE radius : REAL'); // Assuming float maps to REAL
      // How 'pi' is handled is key. If it's a shared constant:
      // It might be outside the class or a special part of it.
      // Let's assume it's accessed via the class name if the converter supports that.
      expect(result.code).toContain('PUBLIC FUNCTION area() RETURNS REAL');
      expect(result.code).toContain('RETURN Circle.pi * radius * radius'); // Or just pi if in scope
      expect(result.code).toContain('ENDCLASS');
    });
  });

  // INHERITANCE
  describe('INHERITANCE', () => {
    it('should convert a class inheriting from another class', async () => {
      const pythonCode = 
`class Animal:
    def __init__(self, name: str):
        self.name = name
    def eat(self):
        print(self.name + " is eating.")

class Dog(Animal):
    def speak(self):
        print(self.name + " says Woof!")`;
      const result = await converter.convert(pythonCode);
      const expected_animal = 
`CLASS Animal
  PRIVATE name : STRING
  PUBLIC PROCEDURE NEW(initialName : STRING)
    name ← initialName
  ENDPROCEDURE
  PUBLIC PROCEDURE eat()
    OUTPUT name & " is eating."
  ENDPROCEDURE
ENDCLASS`;
      const expected_dog = 
`CLASS Dog INHERITS Animal
  PUBLIC PROCEDURE speak()
    OUTPUT name & " says Woof!"
  ENDPROCEDURE
ENDCLASS`;
      expect(result.code).toContain(expected_animal);
      expect(result.code).toContain(expected_dog);
    });

    it('should handle calling superclass constructor (super().__init__)', async () => {
      const pythonCode = 
`class Parent:
    def __init__(self, val):
        self.value = val

class Child(Parent):
    def __init__(self, val, extra):
        super().__init__(val)
        self.extra_val = extra`;
      const result = await converter.convert(pythonCode);
      // IGCSE: CALL SUPER.NEW(val) or similar if explicit super call is needed for constructor
      // Or, it might be implicit that Parent's NEW is called.
      // Let's assume an explicit call if `super()` is used.
      const expected_child_new = 
`PUBLIC PROCEDURE NEW(initialVal, initialExtra)
    CALL SUPER.NEW(initialVal) // Or similar syntax for super constructor call
    extra_val ← initialExtra
  ENDPROCEDURE`;
      expect(result.code).toContain('CLASS Child INHERITS Parent');
      expect(result.code).toMatch(/PUBLIC PROCEDURE NEW\(initialVal\s*,\s*initialExtra\)/);
      expect(result.code).toMatch(/CALL SUPER\.NEW\(initialVal\)/); // Regex to be flexible with spacing
      expect(result.code).toContain('extra_val ← initialExtra');
    });
  });

  // Instantiation (NEW)
  describe('Instantiation (NEW)', () => {
    it('should convert Python object instantiation to IGCSE NEW keyword', async () => {
      const pythonCode = 
`class Greeter:
    def __init__(self, message):
        self.greeting = message
    def greet(self):
        print(self.greeting)

my_greeter = Greeter("Hello IGCSE")`;
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('DECLARE my_greeter : Greeter');
      expect(result.code).toContain('my_greeter ← NEW Greeter("Hello IGCSE")');
    });
  });

  // Method Calls
  describe('Method Calls', () => {
    it('should convert Python method calls to IGCSE method calls', async () => {
      const pythonCode = 
`# Assume Greeter class and my_greeter instance from above
# my_greeter.greet()
class Greeter:
    def __init__(self, message):
        self.greeting = message
    def greet(self):
        print(self.greeting)
my_greeter = Greeter("Test")
my_greeter.greet()`;
      const result = await converter.convert(pythonCode);
      // IGCSE: CALL object.Method() or object.Method()
      // Let's assume CALL is preferred for procedures.
      expect(result.code).toContain('CALL my_greeter.greet()');
    });

    it('should convert method calls that return values', async () => {
      const pythonCode = 
`class Calculator:
    def add(self, x, y):
        return x + y
calc = Calculator()
sum_val = calc.add(5, 7)`;
      const result = await converter.convert(pythonCode);
      expect(result.code).toContain('DECLARE calc : Calculator');
      expect(result.code).toContain('calc ← NEW Calculator()');
      expect(result.code).toContain('sum_val ← calc.add(5, 7)');
    });
  });
});
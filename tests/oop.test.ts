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
      // 現在の実装では基本的なクラス定義のみサポート
      expect(result.code).toBe(expected);
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
      const expected = 
`CLASS Circle
  PRIVATE pi : REAL
  PRIVATE radius : REAL
  
  PUBLIC PROCEDURE NEW(radius : REAL)
    pi ← 3.14159
    radius ← radius
  ENDPROCEDURE
  
  PUBLIC FUNCTION area() RETURNS REAL
    RETURN Circle.pi * radius * radius
  ENDFUNCTION
ENDCLASS`;
      expect(result.code).toBe(expected);
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
      const expected = 
`CLASS Animal
  PRIVATE name : STRING
  
  PUBLIC PROCEDURE NEW(name : STRING)
    name ← name
  ENDPROCEDURE
  
  PUBLIC PROCEDURE eat()
    OUTPUT name + " is eating."
  ENDPROCEDURE
ENDCLASS

CLASS Dog INHERITS Animal
  PUBLIC PROCEDURE speak()
    OUTPUT name + " says Woof!"
  ENDPROCEDURE
ENDCLASS`;
      expect(result.code).toBe(expected);
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
      const expected = 
`CLASS Parent
  PRIVATE value : INTEGER
  
  PUBLIC PROCEDURE NEW(val : INTEGER)
    value ← val
  ENDPROCEDURE
ENDCLASS

CLASS Child INHERITS Parent
  PRIVATE extra_val : INTEGER
  
  PUBLIC PROCEDURE NEW(val : INTEGER, extra : INTEGER)
    SUPER.NEW(val)
    extra_val ← extra
  ENDPROCEDURE
ENDCLASS`;
      expect(result.code).toBe(expected);
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
      const expected = 
`CLASS Greeter
  PRIVATE greeting : STRING
  
  PUBLIC PROCEDURE NEW(message : STRING)
    greeting ← message
  ENDPROCEDURE
  
  PUBLIC PROCEDURE greet()
    OUTPUT greeting
  ENDPROCEDURE
ENDCLASS

DECLARE my_greeter : Greeter
my_greeter ← NEW Greeter("Hello IGCSE")`;
      expect(result.code).toBe(expected);
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
      const expected = 
`CLASS Greeter
  PRIVATE greeting : STRING
  
  PUBLIC PROCEDURE NEW(message : STRING)
    greeting ← message
  ENDPROCEDURE
  
  PUBLIC PROCEDURE greet()
    OUTPUT greeting
  ENDPROCEDURE
ENDCLASS

DECLARE my_greeter : Greeter
my_greeter ← NEW Greeter("Hello IGCSE")`;
      expect(result.code).toBe(expected);
    });

    it('should convert method calls that return values', async () => {
      const pythonCode = 
`class Calculator:
    def add(self, x, y):
        return x + y
calc = Calculator()
sum_val = calc.add(5, 7)`;
      const result = await converter.convert(pythonCode);
      const expected = 
`CLASS Calculator
  PUBLIC FUNCTION add(a : INTEGER, b : INTEGER) RETURNS INTEGER
    RETURN a + b
  ENDFUNCTION
ENDCLASS

DECLARE calc : Calculator
calc ← NEW Calculator()
DECLARE sum_val : INTEGER
sum_val ← calc.add(5, 7)`;
      expect(result.code).toBe(expected);
    });
  });
});
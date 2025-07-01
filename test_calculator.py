# Simple calculator program
def add(a, b):
    return a + b


def main():
    print("Simple Calculator")
    while True:
        num1 = float(input("Enter first number: "))
        num2 = float(input("Enter second number: "))
        
        if num1 < 0 or num2 < 0:
            print("Negative numbers not allowed")
            continue
        
        result = add(num1, num2)
        print(f"Result: {result}")
        
        choice = input("Continue? (y/n): ")
        if choice.lower() != 'y':
            break
    
    print("Goodbye!")


main()
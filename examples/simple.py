# Simple Python example for IGCSE conversion

# Variables and basic operations
x = 5
y = 10
result = x + y
print(f"The sum is: {result}")

# Function definition
def calculate_area(length, width):
    """Calculate the area of a rectangle"""
    area = length * width
    return area

# Function call
rectangle_area = calculate_area(8, 6)
print(f"Rectangle area: {rectangle_area}")

# Conditional statement
age = int(input("Enter your age: "))

if age >= 18:
    print("You are an adult")
else:
    print("You are a minor")

# Loop example
print("Counting from 1 to 5:")
for i in range(1, 6):
    print(f"Number: {i}")

# List operations
numbers = [1, 2, 3, 4, 5]
total = 0

for num in numbers:
    total += num

print(f"Total sum: {total}")

# While loop
count = 0
while count < 3:
    print(f"Count: {count}")
    count += 1

print("Done!")
def test_if_else(x):
    if x > 10:
        print("Large number")
        result = x * 2
    elif x > 5:
        print("Medium number")
        result = x + 5
    elif x > 0:
        print("Small positive number")
        result = x + 1
    else:
        print("Zero or negative")
        result = 0
    return result

def simple_if_else(n):
    if n % 2 == 0:
        print("Even")
    else:
        print("Odd")

# Test the functions
print(test_if_else(15))
print(test_if_else(7))
print(test_if_else(3))
print(test_if_else(-1))
print(simple_if_else(4))
print(simple_if_else(5))
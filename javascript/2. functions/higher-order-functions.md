I'll explain higher-order functions in JavaScript for you. This is a fundamental concept in functional programming that's widely used in JavaScript.

## What are Higher-Order Functions?

A **higher-order function** is a function that either:

1. **Takes one or more functions as arguments**, or
2. **Returns a function as its result**

This makes JavaScript functions "first-class citizens" - they can be treated like any other value (strings, numbers, objects, etc.).

## Key Characteristics

### 1. Functions as Arguments

Higher-order functions can accept other functions as parameters:

```javascript
// Example 1: Function that takes a function as an argument
function processArray(arr, callback) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(callback(arr[i]));
  }
  return result;
}

// Usage
const numbers = [1, 2, 3, 4, 5];
const doubled = processArray(numbers, function (num) {
  return num * 2;
});
console.log(doubled); // [2, 4, 6, 8, 10]
```

### 2. Functions as Return Values

Higher-order functions can return new functions:

```javascript
// Example 2: Function that returns a function
function createMultiplier(factor) {
  return function (number) {
    return number * factor;
  };
}

// Usage
const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

## Common Built-in Higher-Order Functions

JavaScript has several built-in higher-order functions for arrays:

### 1. `map()`

Transforms each element in an array:

```javascript
const numbers = [1, 2, 3, 4, 5];
const squared = numbers.map(function (num) {
  return num * num;
});
console.log(squared); // [1, 4, 9, 16, 25]

// With arrow function
const squaredArrow = numbers.map((num) => num * num);
```

### 2. `filter()`

Creates a new array with elements that pass a test:

```javascript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const evens = numbers.filter(function (num) {
  return num % 2 === 0;
});
console.log(evens); // [2, 4, 6, 8, 10]

// With arrow function
const evensArrow = numbers.filter((num) => num % 2 === 0);
```

### 3. `reduce()`

Reduces an array to a single value:

```javascript
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce(function (accumulator, current) {
  return accumulator + current;
}, 0);
console.log(sum); // 15

// With arrow function
const sumArrow = numbers.reduce((acc, curr) => acc + curr, 0);
```

### 4. `forEach()`

Executes a function for each element:

```javascript
const fruits = ["apple", "banana", "orange"];
fruits.forEach(function (fruit, index) {
  console.log(`${index}: ${fruit}`);
});
```

## Advanced Examples

### 1. Function Composition

Combining multiple functions:

```javascript
function compose(...functions) {
  return function (input) {
    return functions.reduceRight((result, fn) => fn(result), input);
  };
}

const addOne = (x) => x + 1;
const multiplyByTwo = (x) => x * 2;
const square = (x) => x * x;

const composed = compose(square, multiplyByTwo, addOne);
console.log(composed(3)); // ((3 + 1) * 2)² = 64
```

### 2. Partial Application

Creating a function with some arguments pre-filled:

```javascript
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}

function greet(greeting, name) {
  return `${greeting}, ${name}!`;
}

const sayHello = partial(greet, "Hello");
console.log(sayHello("John")); // "Hello, John!"
```

### 3. Currying

Converting a function that takes multiple arguments into a series of functions:

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...moreArgs) {
      return curried.apply(this, args.concat(moreArgs));
    };
  };
}

function add(a, b, c) {
  return a + b + c;
}

const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
console.log(curriedAdd(1, 2, 3)); // 6
```

## Benefits of Higher-Order Functions

1. **Code Reusability**: Write functions once and reuse them with different behaviors
2. **Abstraction**: Hide complex logic behind simple function interfaces
3. **Composability**: Combine simple functions to create complex behavior
4. **Readability**: Code becomes more declarative and easier to understand
5. **Testability**: Easier to test individual functions in isolation


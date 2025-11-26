# Closures

## What is a Closure?

A closure is a function that has access to its outer function's variables, even after the outer function has returned.

```javascript
function outer() {
  const message = "Hello";

  function inner() {
    console.log(message); // Has access to 'message'
  }

  return inner;
}

const myFunc = outer();
myFunc(); // "Hello" - closure remembers 'message'
```

## How Closures Work

When a function is created, it maintains a reference to its lexical environment (scope chain). This allows it to access variables from outer scopes even after those scopes have finished executing.

## Common Use Cases

### 1. Data Privacy / Encapsulation

```javascript
function counter() {
  let count = 0;

  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}

const myCounter = counter();
myCounter.increment(); // 1
myCounter.increment(); // 2
// count is private, cannot be accessed directly
```

### 2. Function Factories

```javascript
function multiplier(factor) {
  return function (number) {
    return number * factor;
  };
}

const double = multiplier(2);
const triple = multiplier(3);

double(5); // 10
triple(5); // 15
```

### 3. Callbacks & Event Handlers

```javascript
function setupButton(buttonId) {
  const button = document.getElementById(buttonId);
  let clickCount = 0;

  button.addEventListener("click", function () {
    clickCount++;
    console.log(`Clicked ${clickCount} times`);
  });
}
```

### 4. Partial Application / Currying

```javascript
function greet(greeting) {
  return function (name) {
    return `${greeting}, ${name}!`;
  };
}

const sayHello = greet("Hello");
sayHello("Alice"); // "Hello, Alice!"
sayHello("Bob"); // "Hello, Bob!"
```

## Common Pitfall: Loop Closures

```javascript
// Problem
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3 (var is function-scoped)

// Solution 1: Use let (block-scoped)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2

// Solution 2: IIFE
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 100);
  })(i);
}
// Output: 0, 1, 2
```

## Key Points

- Closures give functions access to their outer scope
- They're created automatically when functions are defined
- Useful for data privacy, callbacks, and function factories
- Be mindful of memory - closures keep references to outer variables
- Modern JavaScript (ES6+) with `let`/`const` reduces closure-related bugs

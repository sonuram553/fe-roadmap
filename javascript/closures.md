In JavaScript, a **closure** is a feature where an inner function has access to the outer (enclosing) function's variables—even after the outer function has finished executing.

---

## How it Works

To understand closures, you need to understand two things:

1. **Lexical Scoping:** Functions look "upward" to find variables defined in their parent scopes.
2. **Persistent Scope:** Usually, when a function finishes, its local variables are deleted. However, if an inner function is still hanging around (e.g., returned or stored in a variable), the engine keeps those outer variables alive.

---

## Practical Examples

### 1. The Basic Closure

Here is the most straightforward look at a closure in action:

```javascript
function greet(name) {
  const message = "Hello, ";

  return function() {
    // This inner function "closes over" the message and name variables
    console.log(message + name);
  };
}

const sayHiToJohn = greet("John"); 
sayHiToJohn(); // Output: Hello, John

```

Even though `greet("John")` has finished running, the anonymous function inside it still "remembers" `message` and `name`.

### 2. Private Variables (The Data Encapsulator)

Closures are often used to create private state that can't be accessed or modified from the outside.

```javascript
function createCounter() {
  let count = 0; // Private variable

  return {
    increment: function() {
      count++;
      return count;
    },
    decrement: function() {
      count--;
      return count;
    }
  };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
// console.log(count); // ReferenceError: count is not defined

```

In this example, `count` is truly private. The only way to change it is through the methods provided.

---

## Why Should You Care?

Closures are more than just a "trick"; they are fundamental to how modern JavaScript works:

* **Event Handlers:** Remembering data when a user clicks a button.
* **Callbacks:** Keeping track of state during asynchronous operations.
* **Functional Programming:** Creating "curried" functions or partial applications.

### A Common "Gotcha"

In older code (using `var`), closures in loops often caused bugs because `var` isn't block-scoped. Using `let` in loops solves this because it creates a new scope—and thus a new closure—for every iteration.

---

## Currying
**Currying** is a functional programming technique where a function with multiple arguments is transformed into a series of nesting functions, each taking **exactly one argument**.

It relies heavily on **closures** because each inner function "remembers" the arguments passed to its parents.

---

### How it Looks in Code

Instead of calling a function like `sum(1, 2, 3)`, a curried version is called like `sum(1)(2)(3)`.

#### The Standard Way

```javascript
function add(a, b) {
    return a + b;
}
add(2, 3); // 5

```

#### The Curried Way

```javascript
function curryAdd(a) {
    return function(b) {
        return a + b; // Closure: 'b' is local, 'a' is remembered from parent
    };
}

const addTwo = curryAdd(2); 
console.log(addTwo(3)); // 5

```

---

### Why Use Currying?

#### 1. Reusability (Partial Application)

Currying allows you to "lock in" certain parameters and create specialized utility functions from a generic one. This avoids repeating the same arguments over and over.

```javascript
const log = (date) => (type) => (message) => 
    `[${date.getHours()}:${date.getMinutes()}] [${type}] ${message}`;

// Partial application: Lock in the date
const logNow = log(new Date());

// Further specialization: Lock in the error type
const logErrorNow = logNow("ERROR");

console.log(logErrorNow("Database connection failed!")); 
// Output: [14:30] [ERROR] Database connection failed!

```

#### 2. Better Function Composition

In complex applications, you often want to pass a function as an argument to another (like in `.map()` or `.filter()`). Curried functions are "ready to go" because they only expect one argument at a time.

#### 3. Avoiding "Side Effect" Pollution

By breaking a function down into smaller pieces, you ensure that each step only handles one specific piece of data, making the code easier to test and debug.

---

### Summary Table: Normal vs. Curried

| Feature | Normal Function | Curried Function |
| --- | --- | --- |
| **Arguments** | Takes all at once: `f(a, b, c)` | Takes one at a time: `f(a)(b)(c)` |
| **Flexibility** | Rigid; requires all data upfront. | High; can "wait" for data to arrive. |
| **Use Case** | Simple, direct calculations. | Event handling, logging, API wrappers. |

---

## Auto-Curry
An **Auto-Curry** utility is a higher-order function that takes a regular function (which expects multiple arguments) and transforms it into a curried version. 

The "magic" happens by checking how many arguments the original function needs versus how many you’ve provided so far.

---

### The Logic Behind Auto-Curry
To build this, we use two key JavaScript features:
1.  **`fn.length`**: This property tells us how many arguments a function expects in its definition.
2.  **Recursion**: If we haven't received enough arguments yet, the function returns *itself* to wait for more.



---

### The Implementation

Here is a clean, modern implementation of an `autocurry` helper:

```javascript
function curry(fn) {
  return function curried(...args) {
    // If we have enough arguments, execute the original function
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    } else {
      // Otherwise, return a new function to collect more arguments
      return function(...nextArgs) {
        return curried.apply(this, args.concat(nextArgs));
      };
    }
  };
}
```

### How to Use It
Let’s take a standard function that calculates the volume of a cylinder: $V = \pi r^2 h$

```javascript
// 1. Define a standard function
const volume = (pi, radius, height) => pi * (radius ** 2) * height;

// 2. Auto-curry it
const curriedVolume = curry(volume);

// 3. Use it flexibly!
console.log(curriedVolume(3.14)(2)(10)); // 125.6 (Full currying)
console.log(curriedVolume(3.14, 2)(10)); // 125.6 (Partial currying)

// 4. Create specialized tools
const calculateWithStandardPi = curriedVolume(3.14);
const cylinderWithRadiusFive = calculateWithStandardPi(5);

console.log(cylinderWithRadiusFive(10)); // 785
console.log(cylinderWithRadiusFive(20)); // 1570
```

---

### Why Auto-Curry is Better Than Manual Currying
* **Flexibility:** It allows the function to be called in *any* combination (one by one, or all at once).
* **Readability:** You don't have to write nested `return function` blocks for every argument.
* **Compatibility:** You can take existing libraries (like Lodash or Ramda) and make their functions curriable instantly.

---

### A Common "Gotcha"
Auto-currying relies on `fn.length`. If your function uses **default parameters** (e.g., `function(a, b = 10)`) or **rest parameters** (e.g., `function(...args)`), `fn.length` will not count them correctly. In those specific cases, auto-currying requires a more manual approach.

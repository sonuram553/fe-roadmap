Hoisting is a behavior in JavaScript where declarations (variables, functions, classes, and imports) are moved to the top of their containing scope during the compilation phase, before the code is executed.

However, **how** they are hoisted varies significantly depending on what is being declared.

---

### 1. Variable Hoisting (`var` vs `let/const`)
The behavior changes based on the keyword used to declare the variable.

* **`var`**: Only the **declaration** is hoisted, not the initialization. The variable is initialized with `undefined`.
* **`let` and `const`**: These are hoisted, but they are not initialized. They enter a **Temporal Dead Zone (TDZ)** from the start of the block until the line where they are declared. Accessing them before declaration results in a `ReferenceError`.


```javascript
console.log(x); // undefined (hoisted and initialized to undefined)
var x = 5;

console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 10;
```

---

### 2. Function Hoisting
Function **declarations** are fully hoisted. This means both the function name and the entire function body are moved to the top, allowing you to call the function before it appears in the source code.

* **Note:** This does **not** apply to function expressions (e.g., `var myFunc = function() {}`), which follow variable hoisting rules.

```javascript
sayHello(); // "Hello!" - This works because of hoisting

function sayHello() {
  console.log("Hello!");
}
```

---

### 3. Class Declaration Hoisting
Classes in JavaScript are hoisted, but like `let` and `const`, they remain uninitialized. They also reside in the **Temporal Dead Zone**. You cannot instantiate a class (using `new`) before the line where it is defined.


```javascript
const car = new Vehicle(); // ReferenceError: Cannot access 'Vehicle' before initialization

class Vehicle {
  constructor() {
    this.type = "car";
  }
}
```

---

### 4. Import Declarations
Import declarations are **hoisted to the very top** of the module. Regardless of where the `import` statement is written in the file, the module is loaded and available before any of the code in that file starts executing.

* This is why you typically see all imports at the top of a file; placing them elsewhere doesn't change when they are processed.
* **Restriction:** Imports can only appear at the top level of a module (not inside functions or `if` blocks).

```javascript
// This works even if the import is at the bottom of the file
sayHi(); 

import { sayHi } from './module.js';
```

---

### Summary Table: Hoisting Behaviors

| Feature | Hoisted? | Initialized? | Access before declaration |
| :--- | :--- | :--- | :--- |
| **`var`** | Yes | `undefined` | Returns `undefined` |
| **`let` / `const`** | Yes | No | `ReferenceError` (TDZ) |
| **Function Decl.** | Yes | Full Body | Works perfectly |
| **Class Decl.** | Yes | No | `ReferenceError` (TDZ) |
| **Module `import`** | Yes | Loaded | Works perfectly |
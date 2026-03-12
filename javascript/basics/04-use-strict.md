

# JavaScript Strict Mode: A Complete Guide

**Strict Mode** is a feature introduced in ES5 that allows you to place a program, or a function, in a "strict" operating context. This strict context prevents certain actions from being taken and throws more exceptions.

---

## 1. Why Use Strict Mode?

- **Catch Bugs Early:** It turns silent errors into "throw" errors.
- **Performance:** It allows JavaScript engines to perform optimizations more easily.
- **Security:** It prevents accidental access to the global object.

---

## 2. How to Enable It

### Global Level

Place `"use strict";` at the very top of your script file.

```javascript
"use strict";
let x = 3.14; // Correct
```

### Function Level

Place it at the start of a function body to apply it only to that scope.

```javascript
function strictFunction() {
  "use strict";
  y = 10; // Throws ReferenceError: y is not defined
}
```

---

## 3. Key Examples of Strict Mode in Action

### A. Preventing Accidental Globals

In "sloppy" mode, forgetting to declare a variable creates a global variable. In strict mode, it fails.

```javascript
// Sloppy Mode: user = "John" (creates window.user)
// Strict Mode:
"use strict";
userName = "Alice";
// ❌ Uncaught ReferenceError: userName is not defined
```

### B. Securing the `this` Keyword

In standard functions, `this` defaults to the global object (e.g., `window`). In strict mode, it is `undefined`.

```javascript
"use strict";
function showThis() {
  console.log(this);
}

showThis();
// ❌ Output: undefined (Prevents accidental global modifications)
```

### C. No Duplicate Parameter Names

Strict mode forbids using the same name for multiple function arguments.

```javascript
"use strict";
function sum(a, a, b) {
  // ❌ Uncaught SyntaxError: Duplicate parameter name not allowed in this context
  return a + a + b;
}
```

### D. Deleting Un-deletable Properties

Strict mode throws an error when you try to delete something that cannot be deleted, like a variable or a function.

```javascript
"use strict";
let x = 5;
delete x;
// ❌ Uncaught SyntaxError: Delete of an unqualified identifier in strict mode.
```

### E. Securing `eval()`

In standard JavaScript, `eval()` can introduce new variables into the surrounding scope. This makes code optimization nearly impossible and leads to security vulnerabilities. Strict mode gives `eval()` its own private scope.

```javascript
// Sloppy Mode:
eval("var x = 10;");
console.log(x); // 10 (Variable "leaked" out of eval)

// Strict Mode:
"use strict";
eval("var y = 20;");
console.log(typeof y);
// ❌ Output: "undefined" (y exists only inside the eval string)
```

---

## 4. Summary Table

| Feature                        | Sloppy Mode                | Strict Mode               |
| ------------------------------ | -------------------------- | ------------------------- |
| **Undeclared variables**       | Created globally           | **Throws ReferenceError** |
| **`this` in global functions** | `window` / `global`        | **`undefined`**           |
| **Duplicate arguments**        | Allowed                    | **Throws SyntaxError**    |
| **`with` statement**           | Allowed                    | **Forbidden**             |
| **`eval` scope**               | Leaks to surrounding scope | **Isolated scope**        |

---

> **Note:** Modern JavaScript features, such as ES6 Modules and Classes, are strictly in strict mode by default. You don't need to add `"use strict";` inside them.

# var, let, and const - Comparison

## Quick Overview

| Feature                    | var                                  | let            | const          |
| -------------------------- | ------------------------------------ | -------------- | -------------- |
| **Scope**                  | Function-scoped                      | Block-scoped   | Block-scoped   |
| **Hoisting**               | Hoisted (initialized as `undefined`) | Hoisted (TDZ)  | Hoisted (TDZ)  |
| **Re-declaration**         | ✅ Allowed                           | ❌ Not allowed | ❌ Not allowed |
| **Re-assignment**          | ✅ Allowed                           | ✅ Allowed     | ❌ Not allowed |
| **Initialization**         | Optional                             | Optional       | Required       |
| **Global Object Property** | Yes (when global)                    | No             | No             |

## Scope

### var - Function Scoped

```javascript
function example() {
  if (true) {
    var x = 10;
  }
  console.log(x); // 10 - accessible outside block
}
```

### let & const - Block Scoped

```javascript
function example() {
  if (true) {
    let x = 10;
    const y = 20;
  }
  console.log(x); // ReferenceError: x is not defined
  console.log(y); // ReferenceError: y is not defined
}
```

## Hoisting

### var - Hoisted and Initialized

```javascript
console.log(x); // undefined
var x = 5;
// Equivalent to:
// var x;
// console.log(x);
// x = 5;
```

### let & const - Temporal Dead Zone (TDZ)

```javascript
console.log(x); // ReferenceError: Cannot access 'x' before initialization
let x = 5;

console.log(y); // ReferenceError: Cannot access 'y' before initialization
const y = 10;
```

## Best Practices

1. **Use `const` by default** - prevents accidental re-assignment
2. **Use `let`** when you need to re-assign values (loops, conditionals)
3. **Avoid `var`** - use only for legacy code compatibility

## Common Pitfalls

### var in loops

```javascript
// Problem with var
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3 (all see the same 'i')

// Fixed with let
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2 (each iteration has its own 'i')
```

### const with objects

```javascript
const obj = { count: 1 };
obj.count = 2; // ✅ Works - mutating properties is allowed
obj = { count: 3 }; // ❌ Error - re-assigning the reference is not allowed
```

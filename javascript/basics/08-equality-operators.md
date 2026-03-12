# Equality Operators: == vs ===

## Overview

JavaScript has two equality operators:

- `===` (Strict Equality) - No type coercion
- `==` (Loose Equality) - With type coercion

## Strict Equality (===)

Compares both **value AND type** without conversion.

```javascript
5 === 5; // true
5 === "5"; // false (number vs string)
true === 1; // false
null === undefined; // false
NaN === NaN; // false
```

**Returns `true` only if both value and type match.**

## Loose Equality (==)

Converts operands to the same type before comparison.

```javascript
5 == "5"; // true (string '5' → number 5)
true == 1; // true (true → 1)
false == 0; // true (false → 0)
null == undefined; // true (special case)
"" == false; // true ('' → 0, false → 0)
```

### Type Coercion Rules

1. **String + Number**: String converted to number

   ```javascript
   "42" == 42; // true
   ```

2. **Boolean**: Converted to number (true → 1, false → 0)

   ```javascript
   true == 1; // true
   false == 0; // true
   ```

3. **null and undefined**: Only equal to each other

   ```javascript
   null == undefined; // true
   null == 0; // false
   ```

4. **Object**: Converted to primitive via `valueOf()` or `toString()`
   ```javascript
   [1] == 1; // true
   ```

## Common Gotchas

```javascript
// Unexpected coercions
'' == '0'         // false
0 == ''           // true
0 == '0'          // true

// Arrays
[] == false       // true
[] == ![]         // true (!)
[1,2] == '1,2'    // true

// Objects (reference comparison)
{} == {}          // false
{} === {}         // false
```

## When to Use

### Use === (Recommended)

- **Default choice** for all comparisons
- More predictable and explicit
- Prevents unexpected type coercion bugs

### Use == (Rarely)

- Only when you need type coercion
- Common acceptable use: checking for null/undefined
  ```javascript
  if (value == null) {
    // Catches both null and undefined
  }
  // Equivalent to: value === null || value === undefined
  ```

## Best Practices

1. **Always use `===`** unless you have a specific reason
2. Enable ESLint rule `eqeqeq` to enforce strict equality
3. Same rules apply to `!==` (strict) and `!=` (loose)

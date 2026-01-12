# Miscellaneous JavaScript Concepts

## Falsy Values

JavaScript has exactly **8 falsy values**:

1. `false`
2. `0`
3. `-0`
4. `0n` (BigInt zero)
5. `""` (empty string)
6. `null`
7. `undefined`
8. `NaN`

All other values are truthy (including `[]`, `{}`, and `"0"`).

---

## Logical Operator Precedence

**Order (Highest to Lowest):**

1. `!` (NOT)
2. `&&` (AND)
3. `||` (OR)

### Example

```javascript
let x = 7;

x === 7 || (x === 3 && x > 10);
// Evaluated as: x === 7 || (x === 3 && x > 10)
// Result: true || (false && false) → true
```

**Key Point:** `&&` has higher precedence than `||`, so it's evaluated first.

---

## Scope

Variable visibility, the location where a variable is defined, dictates where we have access to that variable.

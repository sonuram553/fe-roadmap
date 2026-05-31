# NaN and Infinity in JavaScript

## NaN (Not a Number)

`NaN` represents "Not-a-Number" - a special numeric value for undefined/unrepresentable values.

### Key Points

```javascript
// When NaN occurs
0 / 0; // NaN
Math.sqrt(-1); // NaN
parseInt("hello"); // NaN

// Type
typeof NaN; // "number"

// Unique property: NOT equal to itself
NaN === NaN; // false (!)
```

---

## Number.isNaN() vs isNaN()

### Number.isNaN() ✅ (Recommended)

No type coercion - only checks if the value is literally `NaN`

```javascript
Number.isNaN(NaN); // true
Number.isNaN("hello"); // false (string is not NaN)
Number.isNaN(undefined); // false
Number.isNaN({}); // false
Number.isNaN("123"); // false
```

### isNaN()

Coerces to number first - returns `true` if value becomes `NaN` after conversion

```javascript
isNaN(NaN); // true
isNaN("hello"); // true (Number("hello") → NaN)
isNaN(undefined); // true (Number(undefined) → NaN)
isNaN({}); // true (Number({}) → NaN)
isNaN("123"); // false (Number("123") → 123)
```

**Use `Number.isNaN()` to avoid false positives from type coercion.**

---

## Infinity

`Infinity` represents mathematical infinity (∞) - a value greater than any other number.

### Key Points

```javascript
// When Infinity occurs
1 / 0; // Infinity
-1 / 0; // -Infinity
Number.MAX_VALUE * 2; // Infinity

// Type
typeof Infinity; // "number"

// Comparisons
Infinity === Infinity; // true (unlike NaN)
Infinity > 1000000; // true

// Checking for Infinity
Number.isFinite(100); // true
Number.isFinite(Infinity); // false ✅
```

---

## Common Gotchas

```javascript
// Division by zero
0 / 0; // NaN (special case)
5 / 0; // Infinity

// Arithmetic
Infinity - Infinity; // NaN
0 * Infinity; // NaN

// JSON serialization
JSON.stringify({ a: NaN, b: Infinity }) // '{"a":null,"b":null}'

// Array methods
[1, NaN, 3].indexOf(NaN);  // -1 (can't find, === doesn't work for NaN)
[1, NaN, 3].includes(NaN); // true ✅ (uses SameValueZero)
```

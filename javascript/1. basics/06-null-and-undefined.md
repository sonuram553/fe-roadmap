# Null and Undefined

JavaScript has two ways to represent "nothing" or "no value": `null` and `undefined`. Understanding the difference is crucial for writing clean code.

## What are they?

- **`undefined`**: Represents a variable that has been declared but not assigned a value. JavaScript automatically assigns this.
- **`null`**: Represents an intentional absence of value. Developers explicitly assign this to indicate "no value".

## When they occur

### undefined (Automatic)

JavaScript assigns `undefined` in these situations:

```javascript
// 1. Declared but not initialized
let x;
console.log(x); // undefined

// 2. Missing function parameters
function fn(param) {
  console.log(param);
}
fn(); // undefined

// 3. Non-existent object properties
const obj = { name: "John" };
console.log(obj.age); // undefined

// 4. Functions without explicit return
function doNothing() {
  // no return
}
console.log(doNothing()); // undefined

// 5. Array holes
const arr = [1, 2, 3];
console.log(arr[10]); // undefined
```

### null (Intentional)

Developers use `null` to explicitly indicate "no value":

```javascript
// Explicitly no user selected
let currentUser = null;

// API returns null when not found
function findUserById(id) {
  // search logic...
  return null; // user not found
}

// Clearing a reference
let cache = { data: "..." };
cache = null; // intentionally clear it
```

## Key Differences

| Feature        | `undefined`                      | `null`                   |
| -------------- | -------------------------------- | ------------------------ |
| **Type**       | `"undefined"`                    | `"object"` (legacy bug)  |
| **Assignment** | Automatic (by JavaScript engine) | Manual (by developer)    |
| **Meaning**    | "Not initialized yet"            | "Intentionally no value" |
| **Use Case**   | Default state                    | Explicit emptiness       |
| **Primitive**  | Yes                              | Yes                      |

## Comparisons

```javascript
// Equality
null == undefined; // true
null === undefined; // false

// Both are falsy
Boolean(null); // false
Boolean(undefined); // false

// Arithmetic
1 + undefined; // NaN
1 + null; // 1 (null → 0)

// typeof
typeof undefined; // "undefined"
typeof null; // "object" (legacy bug)
```

## Default Parameters

**Important difference**: `undefined` triggers default parameters, but `null` does not:

```javascript
function greet(name = "Guest") {
  return `Hello, ${name}`;
}

greet(); // "Hello, Guest" - no argument = undefined
greet(undefined); // "Hello, Guest" - undefined triggers default
greet(null); // "Hello, null" - null does NOT trigger default
```

Why? Because `null` is considered a valid value that was explicitly passed.

## Checking for null/undefined

### Check for both (recommended)

```javascript
// Using loose equality (checks both null and undefined)
if (value == null) {
  console.log("value is null or undefined");
}

// Explicit check
if (value === null || value === undefined) {
  console.log("value is null or undefined");
}
```

### Modern operators

**Nullish Coalescing (`??`)**: Returns right side only if left is `null` or `undefined`

```javascript
const result = value ?? "default"; // default if null/undefined
const port = config.port ?? 3000; // 3000 if not set

// Different from ||
0 ?? "default"; // 0 (not nullish)
0 || "default"; // "default" (0 is falsy)

"" ?? "default"; // "" (not nullish)
"" || "default"; // "default" ("" is falsy)
```

**Optional Chaining (`?.`)**: Safely access nested properties

```javascript
const user = {
  name: "John",
  address: null,
};

// Without optional chaining - throws error
console.log(user.address.street); // TypeError!

// With optional chaining - returns undefined
console.log(user?.address?.street); // undefined (safe)

// Works with methods too
user.getName?.(); // undefined if getName doesn't exist
```

## Common Pitfalls

### 1. JSON.stringify behavior

```javascript
// undefined properties are omitted in objects
JSON.stringify({ a: 1, b: undefined, c: null });
// '{"a":1,"c":null}' - b is missing!

// But in arrays, undefined becomes null
JSON.stringify([1, undefined, null]);
// '[1,null,null]' - undefined converted to null
```

### 2. Avoid explicitly assigning undefined

```javascript
// ❌ Don't do this
let x = undefined;

// ✅ Do this - already undefined by default
let x;

// ✅ Use null for intentional absence
let user = null;
```

## Best Practices

1. **Let JavaScript use `undefined` naturally** - don't assign it yourself
2. **Use `null` when you want to explicitly say "no value"**
3. **Use `==` to check for both** - `if (value == null)` checks both
4. **Use `??` for default values** - better than `||` for nullish checks
5. **Use `?.` for safe property access** - prevents errors on null/undefined

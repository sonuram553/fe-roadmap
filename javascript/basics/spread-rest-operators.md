# Spread and Rest Operators

Both use `...` syntax but serve opposite purposes.

| Operator   | Purpose           | Example                             |
| ---------- | ----------------- | ----------------------------------- |
| **Spread** | Expands elements  | `[...arr1, ...arr2]`, `{...obj}`    |
| **Rest**   | Collects elements | `function(...args)`, `[a, ...rest]` |

---

## Spread (`...`) - Expands

**Expands** an iterable into individual elements.

### Arrays

```javascript
const arr1 = [1, 2];
const arr2 = [3, 4];

const combined = [...arr1, ...arr2]; // [1, 2, 3, 4]
const clone = [...arr1]; // [1, 2] (shallow copy)
const inserted = [0, ...arr1, 3]; // [0, 1, 2, 3]
```

### Objects

```javascript
const user = { name: "John", age: 30 };

const clone = { ...user }; // { name: "John", age: 30 }
const updated = { ...user, age: 31, city: "NYC" }; // later props override
```

### Function Calls

```javascript
const numbers = [1, 5, 9];
Math.max(...numbers); // 9 (same as Math.max(1, 5, 9))
```

---

## Rest (`...`) - Collects

**Collects** remaining elements into an array. Must be **last**.

### Function Parameters

```javascript
function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10

// With other params
function log(level, ...messages) {
  console.log(`[${level}]`, ...messages);
}
```

### Array Destructuring

```javascript
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first: 1, second: 2, rest: [3, 4, 5]
```

### Object Destructuring

```javascript
const user = { id: 1, name: "John", password: "secret" };
const { password, ...safeUser } = user;
// safeUser: { id: 1, name: "John" }
```

---

## Common Patterns

```javascript
// Merge with defaults
const settings = { ...defaults, ...userPrefs };

// Remove property from object
const { unwanted, ...clean } = obj;

// Convert NodeList to Array
const divArray = [...document.querySelectorAll("div")];

// Clone with modification
const updated = { ...user, lastLogin: Date.now() };
```

---

## Key Points

- Spread **expands**, Rest **collects**
- Both create **shallow copies** (nested objects still share references)
- Rest must be **last** in parameters/destructuring
- Introduced in **ES6** (ES2015)

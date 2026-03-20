In JavaScript, the difference between a shallow copy and a deep copy comes down to how **nested objects** (objects inside objects) are handled.

### 1. Shallow Copy
A **shallow copy** creates a new object, but it only copies the "top-level" values. If any of those values are references to other objects (like an array or object), the copy will point to the **same reference** as the original.

* **Key Behavior:** Changing a top-level primitive (like a string or number) in the copy won't affect the original. However, changing a **nested** object in the copy **will** change the original because they share the same memory reference.
* **Common Methods:**
    * Spread Syntax: `[...original]` or `{...original}`
    * `Object.assign()`
    * `Array.from()`
    * `Array.prototype.slice()`


**Example:**
```javascript
const original = ["noodles", { list: ["eggs", "flour"] }];
const copy = Array.from(original);

// Changing a nested object affects BOTH
copy[1].list = ["water"];
console.log(original[1].list); // ["water"] (Original changed!)

// Changing a top-level value affects ONLY the copy
copy[0] = "rice noodles";
console.log(original[0]); // "noodles" (Original stayed same)
```

---

### 2. Deep Copy
A **deep copy** creates a new object and recursively copies **everything** inside it. The new object and the original share absolutely no references; they are completely independent in memory.

* **Key Behavior:** Changing anything in the copy (even deeply nested values) will **never** affect the original.
* **Common Methods:**
    * **`structuredClone(obj)`**: The modern, native Web API for deep cloning. It handles most types (like `Date`, `Set`, `Map`).
    * **`JSON.parse(JSON.stringify(obj))`**: An older "hack." It works for simple data but fails if the object contains functions, `undefined`, `Symbols`, or circular references.

**Example:**
```javascript
const original = ["noodles", { list: ["eggs", "flour"] }];
const deepCopy = structuredClone(original);

// Changing a nested object affects ONLY the copy
deepCopy[1].list = ["water"];
console.log(original[1].list); // ["eggs", "flour"] (Original safe!)
```

---

### The Custom `deepCopy` Implementation

```javascript
function deepCopy(val) {
  // 1. Handle primitives (number, string, boolean, etc.) and null
  // These are passed by value, so we can just return them.
  if (val === null || typeof val !== 'object') {
    return val;
  }

  // 2. Handle Dates
  if (val instanceof Date) {
    return new Date(val.getTime());
  }

  // 3. Handle Arrays
  if (Array.isArray(val)) {
    const arrayCopy = [];
    for (let i = 0; i < val.length; i++) {
      arrayCopy[i] = deepCopy(val[i]); // Recursive call
    }
    return arrayCopy;
  }

  // 4. Handle Objects
  const objectCopy = {};
  for (const key in val) {
    if (Object.hasOwn(val, key)) {
      objectCopy[key] = deepCopy(val[key]); // Recursive call
    }
  }

  return objectCopy;
}
```
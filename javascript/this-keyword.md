# The `this` Keyword in JavaScript

> **`this` is determined at runtime, based on how a function is called (not where it's defined).**

Unlike languages like Java or C++ where `this` always refers to the current instance, JavaScript's `this` is dynamic and depends on the **call-site** — the location in code where a function is invoked.

---

## `this` in Different Contexts

### 1. Global Context

When code runs outside any function, `this` refers to the global object.

```javascript
console.log(this); // Window (browser) or global (Node.js)
```

### 2. Regular Function

In a standalone function call, `this` defaults to the global object. In strict mode, it's `undefined`.

```javascript
function showThis() {
  console.log(this);
}
showThis(); // Window (or undefined in strict mode)
```

Why `undefined` in strict mode? It prevents accidental global variable creation and makes errors more visible.

### 3. Object Method

When a function is called as a property of an object, `this` refers to that object. The object "owns" the method at call time.

```javascript
const person = {
  name: "Alice",
  greet() {
    console.log(this.name); // "Alice" - this = person
  },
};
person.greet();
```

**⚠️ Pitfall: Extracting method loses `this`**

When you assign a method to a variable, you lose the object context. The function is now a standalone function.

```javascript
const fn = person.greet;
fn(); // undefined - 'this' is now global!
```

### 4. Constructor (`new`)

When a function is called with `new`, JavaScript creates a fresh object and sets `this` to point to it. The constructor initializes the new instance.

```javascript
function Person(name) {
  this.name = name; // this = new instance being created
}
const alice = new Person("Alice");
console.log(alice.name); // "Alice"
```

Behind the scenes, `new` does:

1. Creates a new empty object
2. Sets `this` to that object
3. Links the object to the function's prototype
4. Returns the object (unless function returns something else)

### 5. Arrow Functions

Arrow functions are fundamentally different — they **don't have their own `this`**. They capture `this` from the surrounding lexical scope at definition time, not call time.

```javascript
const person = {
  name: "Alice",
  // Arrow as method - BAD: inherits global 'this'
  greet: () => {
    console.log(this.name); // undefined!
  },

  // Arrow inside method - GOOD: inherits method's 'this'
  greetFriends() {
    ["Bob", "Charlie"].forEach((friend) => {
      console.log(`${this.name} → ${friend}`); // "Alice → Bob", "Alice → Charlie"
    });
  },
};
```

**When to use arrow functions:**

- Inside methods/callbacks where you want to preserve the outer `this`
- Event handlers in React components

**When NOT to use:**

- As object methods (they'll inherit wrong `this`)
- When you need dynamic `this` binding

### 6. Event Handlers

In DOM event handlers, `this` refers to the element that received the event.

```javascript
button.addEventListener("click", function () {
  console.log(this); // The button element
  this.disabled = true; // Works!
});

// Arrow function behaves differently
button.addEventListener("click", () => {
  console.log(this); // Window (inherits from outer scope)
});
```

### 7. Classes

In ES6 classes, `this` refers to the instance. However, class methods have the same `this` binding behavior as regular functions.

```javascript
class Person {
  constructor(name) {
    this.name = name;
  }

  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
}

const alice = new Person("Alice");
alice.greet(); // "Hello, I'm Alice" ✓
```

**⚠️ Same pitfall: Extracting methods loses `this`**

```javascript
const greetFn = alice.greet;
greetFn(); // TypeError: Cannot read property 'name' of undefined
```

Why `undefined` and not `window`? **Classes are always in strict mode** by default — you don't need to add `"use strict"`. In strict mode, `this` is `undefined` when a function is called without a context.

**Solutions to preserve `this` in classes:**

**1. Bind in constructor**

```javascript
class Person {
  constructor(name) {
    this.name = name;
    this.greet = this.greet.bind(this); // Bind once
  }

  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
}

const alice = new Person("Alice");
const greetFn = alice.greet;
greetFn(); // "Hello, I'm Alice" ✓
```

**2. Arrow function as class field (recommended)**

Arrow functions capture `this` lexically. When used as class fields, they automatically bind to the instance.

```javascript
class Person {
  constructor(name) {
    this.name = name;
  }

  // Arrow function class field - auto-binds 'this'
  greet = () => {
    console.log(`Hello, I'm ${this.name}`);
  };
}

const alice = new Person("Alice");
const greetFn = alice.greet;
greetFn(); // "Hello, I'm Alice" ✓

// Perfect for event handlers
button.addEventListener("click", alice.greet); // Works!
```

**Trade-offs:**

| Approach                | Pros                          | Cons                        |
| ----------------------- | ----------------------------- | --------------------------- |
| `bind()` in constructor | Methods on prototype (shared) | Verbose, manual binding     |
| Arrow class fields      | Clean syntax, auto-bound      | Each instance gets own copy |

**Note:** Arrow class fields create a new function per instance (more memory), while regular methods live on the prototype (shared). For most apps, this difference is negligible.

---

## `call()`, `apply()`, `bind()`

These methods let you explicitly control what `this` refers to.

### `call()` — Invoke immediately with explicit `this`

Calls the function immediately with the first argument as `this`, followed by individual arguments.

```javascript
function greet(greeting, punctuation) {
  console.log(`${greeting}, ${this.name}${punctuation}`);
}

const person = { name: "Alice" };
greet.call(person, "Hello", "!"); // "Hello, Alice!"
```

**Common use:** Borrowing methods from other objects

```javascript
// Convert array-like object to array
const arrayLike = { 0: "a", 1: "b", length: 2 };
const arr = Array.prototype.slice.call(arrayLike); // ["a", "b"]
```

### `apply()` — Same as `call()`, but args as array

Identical to `call()`, but takes arguments as an array. Useful when you have arguments in array form.

```javascript
greet.apply(person, ["Hello", "!"]); // "Hello, Alice!"

// Finding max in array (pre-spread syntax)
const nums = [5, 2, 8, 1];
Math.max.apply(null, nums); // 8

// Modern equivalent using spread
Math.max(...nums); // 8
```

### `bind()` — Returns new function with bound `this`

Unlike `call`/`apply`, `bind` doesn't invoke the function. It returns a **new function** with `this` permanently set. Can also pre-fill arguments (partial application).

```javascript
const boundGreet = greet.bind(person);
boundGreet("Hi", "!"); // "Hi, Alice!"

// Partial application - pre-fill some arguments
const sayHello = greet.bind(person, "Hello");
sayHello("!!!"); // "Hello, Alice!!!"
```

---

## Binding Precedence

When multiple rules could apply, this is the priority order:

1. **`new`** — highest priority (always wins)
2. **`call` / `apply` / `bind`** — explicit binding
3. **Object method** (`obj.method()`) — implicit binding
4. **Default** — global / undefined (lowest)

```javascript
const obj = { name: "Object" };
function greet() {
  console.log(this.name);
}

const bound = greet.bind(obj);
bound(); // "Object" (explicit wins over default)

// But 'new' even beats bind!
function Person(name) {
  this.name = name;
}
const BoundPerson = Person.bind({ name: "Ignored" });
const p = new BoundPerson("Alice");
console.log(p.name); // "Alice" — new wins!
```

---

## Quick Reference

| Context             | `this` Value                    |
| ------------------- | ------------------------------- |
| Global              | `window` / `global`             |
| Regular function    | `window` / `undefined` (strict) |
| Object method       | The object                      |
| `new Constructor()` | New instance                    |
| Arrow function      | Enclosing scope's `this`        |
| Event handler       | Element receiving event         |
| Class method        | Class instance                  |
| Arrow class field   | Class instance (auto-bound)     |
| `call/apply/bind`   | Explicitly specified object     |

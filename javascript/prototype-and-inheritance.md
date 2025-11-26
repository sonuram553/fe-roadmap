## What is a Prototype in JavaScript?

A **prototype** in JavaScript is a fundamental mechanism that enables inheritance and object-oriented programming. Every JavaScript object has a prototype, which is another object that the original object "inherits" properties and methods from.

## Key Concepts

### 1. **Prototype Chain**

JavaScript uses a prototype chain for inheritance. When you try to access a property or method on an object, JavaScript:

1. First looks for it on the object itself
2. If not found, looks on the object's prototype
3. Continues up the prototype chain until it finds the property or reaches `null`

### 2. **`__proto__` vs `prototype`**

- **`__proto__`**: A property that points to the prototype of an object instance
- **`prototype`**: A property of constructor functions that becomes the prototype of objects created with that constructor

## Examples

### Basic Prototype Example

```javascript
// Creating an object with a prototype
const animal = {
  name: "Animal",
  speak() {
    return `${this.name} makes a sound`;
  },
};

const dog = {
  name: "Dog",
  breed: "Golden Retriever",
};

// Setting dog's prototype to animal
Object.setPrototypeOf(dog, animal);

console.log(dog.speak()); // "Dog makes a sound"
console.log(dog.breed); // "Golden Retriever"
```

### Constructor Function Example

```javascript
function Person(name, age) {
  this.name = name;
  this.age = age;
}

// Adding methods to the prototype
Person.prototype.greet = function () {
  return `Hello, I'm ${this.name} and I'm ${this.age} years old`;
};

Person.prototype.haveBirthday = function () {
  this.age++;
  return `Happy birthday! I'm now ${this.age}`;
};

// Creating instances
const alice = new Person("Alice", 25);
const bob = new Person("Bob", 30);

console.log(alice.greet()); // "Hello, I'm Alice and I'm 25 years old"
console.log(bob.haveBirthday()); // "Happy birthday! I'm now 31"
```

### Class Syntax (ES6+)

```javascript
class Vehicle {
  constructor(make, model) {
    this.make = make;
    this.model = model;
  }

  getInfo() {
    return `${this.make} ${this.model}`;
  }
}

class Car extends Vehicle {
  constructor(make, model, year) {
    super(make, model);
    this.year = year;
  }

  getFullInfo() {
    return `${this.getInfo()} (${this.year})`;
  }
}

const myCar = new Car("Toyota", "Camry", 2020);
console.log(myCar.getFullInfo()); // "Toyota Camry (2020)"
```

## Prototype Chain Visualization

```javascript
// Prototype chain example
const arr = [1, 2, 3];

console.log(arr.__proto__ === Array.prototype); // true
console.log(Array.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__ === null); // true

// The chain: arr → Array.prototype → Object.prototype → null
```

## Why Prototypes Matter

1. **Memory Efficiency**: Methods shared via prototype are stored once, not duplicated for each instance
2. **Dynamic Updates**: You can add methods to existing objects by modifying their prototype
3. **Inheritance**: Enables object-oriented programming patterns
4. **Built-in Methods**: All built-in JavaScript objects (arrays, strings, etc.) inherit their methods from prototypes

## Modern JavaScript

While ES6 classes provide a cleaner syntax, they still use prototypes under the hood:

```javascript
class MyClass {
  constructor() {
    this.instanceProperty = "value";
  }

  instanceMethod() {
    return "method";
  }

  static staticMethod() {
    return "static";
  }
}

// This is equivalent to:
function MyClass() {
  this.instanceProperty = "value";
}
MyClass.prototype.instanceMethod = function () {
  return "method";
};
MyClass.staticMethod = function () {
  return "static";
};
```

Prototypes are a core concept in JavaScript that enables inheritance, method sharing, and object-oriented programming patterns. Understanding prototypes is essential for writing efficient and maintainable JavaScript code.

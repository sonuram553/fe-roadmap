## 1. Factory Functions

A **factory function** is any function that isn't a class or constructor but returns a new object. It literally "manufactures" objects and hands them back to you.

### Example:

```javascript
function createRobot(name, task) {
  return {
    name: name,
    task: task,
    report: function () {
      console.log(`${this.name} is currently ${this.task}.`);
    },
  };
}

const robot1 = createRobot("Optimus", "leading");
robot1.report(); // Optimus is currently leading.
```

### The Shortcomings

While simple and flexible, factory functions have a major drawback regarding **memory efficiency**:

- **Method Duplication:** Every time you create a new object, a new copy of the methods (like `report` above) is created in memory. If you have 10,000 robots, you have 10,000 identical function objects sitting in RAM.
- **No Prototype Link:** Unlike constructors, objects created via simple factories don't share a common prototype by default, making it harder to track their "type" using `instanceof`.

---

## 2. Constructor Functions

A **constructor function** is a regular function used with the `new` keyword. By convention, they start with a **Capital Letter**. They solve the memory issue by using the **Prototype Pattern**.

### The `new` Operator

When you call a function with `new`, four things happen behind the scenes:

1.  A brand **new empty object** `{}` is created.
2.  The object is **linked** to the constructor’s prototype property.
3.  The `this` keyword is **bound** to the new object.
4.  The function **automatically returns** the new object (unless you manually return another object).

### Example:

```javascript
function Person(name, age) {
  // 1. New object created: {}
  // 2. this = that new object
  this.name = name;
  this.age = age;
  // 4. Returns this object automatically
}

// Adding a method to the prototype so it's shared (Memory efficient!)
Person.prototype.greet = function () {
  console.log(`Hi, I'm ${this.name}`);
};

const user1 = new Person("Alice", 25);
user1.greet();
```

# Getters and Setters in Classes

Getters and setters are special methods that allow you to define custom behavior when reading or writing to object properties. They provide a way to encapsulate logic while maintaining a simple property-like interface.

## Getter

A **getter** is a method that gets the value of a property. It's called when you access the property without parentheses.

```javascript
class User {
  constructor(firstName, lastName) {
    this._firstName = firstName;
    this._lastName = lastName;
  }

  get fullName() {
    return `${this._firstName} ${this._lastName}`;
  }
}

const user = new User('John', 'Doe');
console.log(user.fullName); // "John Doe" (no parentheses!)
```

## Setter

A **setter** is a method that sets the value of a property. It allows you to add validation or logic when assigning a value.

```javascript
class User {
  constructor(age) {
    this._age = age;
  }

  get age() {
    return this._age;
  }

  set age(value) {
    if (value < 0) {
      console.log('Age cannot be negative');
      return;
    }
    this._age = value;
  }
}

const user = new User(25);
user.age = 30; // Uses setter
console.log(user.age); // 30 (uses getter)
user.age = -5; // "Age cannot be negative"
```

## Key Benefits

| Feature | Benefit |
|---------|---------|
| **Encapsulation** | Hide internal implementation, expose clean interface |
| **Validation** | Control what values can be set |
| **Computed Properties** | Calculate values on-the-fly without storing them |
| **Clean Syntax** | Access like regular properties, not method calls |
| **Data Privacy** | Prevent direct modification of internal state |

## Naming Convention

- Use `_propertyName` (underscore prefix) for the actual stored value
- Define `get propertyName()` and `set propertyName(value)` without the underscore
- This signals to other developers that the property should be accessed via getter/setter, not directly

```javascript
class BankAccount {
  constructor(balance) {
    this._balance = balance; // Private (by convention)
  }

  get balance() {
    return this._balance;
  }

  set balance(amount) {
    if (amount < 0) {
      throw new Error('Balance cannot be negative');
    }
    this._balance = amount;
  }
}
```

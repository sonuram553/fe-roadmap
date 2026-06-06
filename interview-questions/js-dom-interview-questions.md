# JavaScript & DOM Interview Questions
> For Frontend and Senior Frontend Developers

---

## Legend
- 🟢 Frontend level
- 🟣 Senior level
- 🔵 Both levels

---

## 1. JS Fundamentals

1. 🔵 What is the difference between `var`, `let`, and `const`?
2. 🔵 Explain hoisting in JavaScript. How does it work for variables and functions?
3. 🟢 What is the difference between `==` and `===`?
4. 🔵 What are closures? Give a practical use case.
5. 🟢 What is the difference between `null` and `undefined`?
6. 🔵 Explain the concept of `this` in JavaScript. How does it behave in different contexts?
7. 🟢 What is the Temporal Dead Zone (TDZ)?
8. 🟢 What is the difference between a function declaration and a function expression?

---

## 2. Scope & Execution

1. 🔵 How does the JavaScript event loop work?
2. 🟢 What is a call stack and how does it work?
3. 🟣 Explain execution context and the phases involved.
4. 🟣 What is scope chain and how does JS resolve variable lookups?
5. 🟣 What is the difference between lexical scope and dynamic scope?
6. 🟣 Explain how garbage collection works in JavaScript.

---

## 3. Async JavaScript

1. 🔵 What is the difference between callbacks, Promises, and async/await?
2. 🟣 What are microtasks and macrotasks? Give examples of each.
3. 🟢 What happens when you `await` a non-Promise value?
4. 🔵 How does `Promise.all` differ from `Promise.allSettled`, `Promise.any`, and `Promise.race`?
5. 🟢 How would you handle errors in async/await vs Promise chains?
6. 🔵 What is the output of this code? *(setTimeout + Promise ordering question)*
7. 🟣 Explain how async generators work and when you'd use them.

---

## 4. Prototypes & OOP

1. 🔵 What is prototypal inheritance in JavaScript?
2. 🟢 What is the difference between `__proto__` and `prototype`?
3. 🟢 How does `Object.create()` work?
4. 🟣 What is the difference between classical inheritance and prototypal inheritance?
5. 🟣 How does the `new` keyword work under the hood?
6. 🟣 What are mixins? How would you implement multiple inheritance?
7. 🟢 What is the difference between `Object.assign` and a deep clone?

---

## 5. DOM & Browser APIs

1. 🔵 What is the difference between event bubbling and event capturing?
2. 🔵 What is event delegation and why is it useful?
3. 🟢 What is the difference between `innerHTML`, `textContent`, and `innerText`?
4. 🔵 Explain the difference between reflow and repaint.
5. 🟢 What is the difference between `document.querySelector` and `getElementById`?
6. 🟢 How does the virtual DOM differ from the real DOM?
7. 🟣 What is Shadow DOM and when would you use it?
8. 🟢 How do you prevent default behavior and stop propagation? When would you use each?
9. 🟣 What is `MutationObserver` and when would you use it instead of event listeners?

---

## 6. Performance & Memory

1. 🔵 What is debouncing vs throttling? Implement one from scratch.
2. 🟣 What causes memory leaks in JavaScript? How do you detect them?
3. 🟢 What is lazy loading and how would you implement it?
4. 🟣 How do you optimize a page that is rendering slowly?
5. 🟣 What are Web Workers and when would you use them?
6. 🟣 Explain Critical Rendering Path and how to optimize it.
7. 🟢 What is `requestAnimationFrame` and when should you use it over `setTimeout`?

---

## 7. ES6+ Features

1. 🟣 What are generators and iterators? When would you use them?
2. 🟢 What is destructuring? Show a non-trivial use case.
3. 🔵 What is the difference between `Map`/`Set` and regular objects/arrays?
4. 🟣 What are `WeakMap` and `WeakSet`? When would you use them over `Map`/`Set`?
5. 🟣 Explain how `Symbol` works and its practical use cases.
6. 🟣 What are tagged template literals? Give an example.
7. 🟢 What is optional chaining (`?.`) and nullish coalescing (`??`)?

---

## 8. Patterns & Architecture

1. 🔵 What are higher-order functions? Give an example.
2. 🟣 Implement a basic pub/sub (event emitter) pattern.
3. 🔵 What is memoization and how would you implement it?
4. 🟣 What is currying? Implement a `curry` function.
5. 🟣 Explain the Module pattern and how it's different from ES modules.
6. 🟣 What is the Observer pattern? How is it related to reactive programming?
7. 🟣 How would you design a rate limiter in JavaScript?

---

*60 questions across 8 topic areas. Coding/implementation questions (debounce, curry, pub-sub, memoize) are often asked verbally first, then live-coded. Output/tracing questions (async ordering, event loop) are extremely common at both levels.*

# Mastering Asynchronous JavaScript and Promises

JavaScript's asynchronous nature is what allows it to handle heavy tasks (like fetching data from a server) without freezing the entire browser.

---

## I. Core Concepts: Single-Threaded vs. Asynchronous

### 1. JS is Single-Threaded

JavaScript has **one call stack** and **one memory heap**. It executes code line-by-line. If you ran a network request synchronously, the browser would be completely unresponsive (you couldn't even click a button) until the data arrived.

### 2. What is Asynchronous Code?

Asynchronous code is code that **starts now and finishes later**. Instead of the thread waiting for a task to finish, it "hands off" the task to the Browser APIs and continues executing the rest of the script.

**How it's handled (The Event Loop):**

When an async task (like a timer or fetch) finishes, its callback is moved to a **Task Queue**. The **Event Loop** constantly checks if the Call Stack is empty; if it is, it pushes the first task from the queue onto the stack to be executed.

---

## II. Understanding Promises

In JavaScript, a **Promise** is an object representing the eventual completion (or failure) of an asynchronous operation and its resulting value.

### 1. The Three States of a Promise

A Promise is always in one of these three states:

- **Pending**: Initial state, neither fulfilled nor rejected.
- **Fulfilled (Resolved)**: The operation completed successfully.
- **Rejected**: The operation failed.

### 2. Creating a Promise

You create a promise using the `new Promise` constructor, which takes an executor function with two arguments: `resolve` and `reject`.

```javascript
const weatherPromise = new Promise((resolve, reject) => {
  const isSunny = true;

  setTimeout(() => {
    if (isSunny) {
      resolve("It's a beautiful day! ☀️"); // Success
    } else {
      reject("It's raining. 🌧️"); // Failure
    }
  }, 2000);
});
```

---

## III. Solving the "Pyramid of Doom"

### The Problem: Callback Hell

Before Promises, we used callbacks. If you had five dependent async tasks, your code would crawl to the right in a "Pyramid of Doom," making it impossible to read or debug.

```javascript
// Callback Hell example
getData(function (a) {
  getMoreData(a, function (b) {
    getEvenMoreData(b, function (c) {
      console.log(c);
    });
  });
});
```

### The Solution: Promise Chaining

To solve Callback Hell, we use **Promise Chaining**. This works because every `.then()` method returns a **new Promise**.

```javascript
// Each function now returns a Promise instead of taking a callback
getData()
  .then((a) => getMoreData(a)) // Return the next promise
  .then((b) => getEvenMoreData(b)) // The chain waits for this to finish
  .then((c) => {
    console.log(c); // Finally, use the data
  })
  .catch((err) => {
    console.error("Error at any stage:", err); // One catch for all!
  });
```

---

## IV. Consuming Promises: Methods

### 1. `.then(onFulfilled, onRejected)`

The `.then()` method is used to handle the **success** (fulfillment) of a promise. It takes two optional arguments: a callback for success and a callback for failure. However, most developers only use it for success.

- **When it runs:** When the internal state of the promise changes to `fulfilled`.
- **What it receives:** The value passed into the `resolve()` function.

```javascript
fetchData().then((data) => {
  console.log("Got the data:", data);
  return data.id; // Passed to the NEXT .then()
});
```

### 2. `.catch(onRejected)`

The `.catch()` method is used specifically for **error handling**. It is actually a shorthand for `.then(null, onRejected)`.

- **When it runs:** When the promise is `rejected` OR if an error is thrown inside a previous `.then()`.
- **What it receives:** The error object or reason passed into the `reject()` function.

```javascript
fetchData()
  .then((data) => {
    throw new Error("Something went wrong");
  })
  .catch((error) => {
    console.error("Caught an error:", error.message);
  });
```

### 3. `.finally(onFinally)`

The `.finally()` method allows you to run a piece of code **regardless of the outcome** (success or failure). It does not receive any arguments (it doesn't know if it succeeded or failed).

- **When it runs:** Whenever the promise settles (is no longer `pending`).
- **Common Use Case:** Hiding a loading spinner or closing a database connection.

```javascript
let isLoading = true;
fetchData()
  .then((data) => console.log(data))
  .catch((err) => console.error(err))
  .finally(() => {
    isLoading = false;
    console.log("Cleanup complete.");
  });
```

---

## V. Advanced Combinators and Polyfills

In addition to `Promise.all` and `Promise.race`, modern JavaScript (ES2020/ES2021) introduced `Promise.allSettled` and `Promise.any`.

### Summary Comparison Table

| Method                   | Main Goal        | Behavior on First Success | Behavior on First Failure |
| :----------------------- | :--------------- | :------------------------ | :------------------------ |
| **`Promise.all`**        | All or nothing.  | Waits for all.            | **Rejects immediately.**  |
| **`Promise.allSettled`** | Complete report. | Waits for all.            | Waits for all.            |
| **`Promise.race`**       | Fastest result.  | **Resolves immediately.** | **Rejects immediately.**  |
| **`Promise.any`**        | First success.   | **Resolves immediately.** | Ignores (until all fail). |

To understand how these four methods work at once, imagine you are building a travel app that needs to fetch data from multiple airlines.

Here is how each `Promise` method would behave if you fired three requests at the same time.

---

### The Setup: Three Simulated API Calls

```javascript
const airlineA = new Promise((res) =>
  setTimeout(() => res("✈️ Airline A: $200"), 1000),
);
const airlineB = new Promise((res) =>
  setTimeout(() => res("✈️ Airline B: $180"), 2000),
);
const airlineC = new Promise((_, rej) =>
  setTimeout(() => rej("❌ Airline C: Offline"), 1500),
);

const allRequests = [airlineA, airlineB, airlineC];
```

---

### 1. `Promise.all()` — The Perfectionist

It waits for **everyone** to succeed. If one fails, the whole thing is ruined.

```javascript
Promise.all(allRequests)
  .then((data) => console.log("Success:", data))
  .catch((err) => console.log("All Failed because:", err));

// Output (after 1.5s): "All Failed because: ❌ Airline C: Offline"
```

> **Result:** Even though A and B were working fine, `all` rejected immediately because C failed.

---

### 2. `Promise.allSettled()` — The Reporter

It waits for **everything** to finish and gives you a full status report on each one.

```javascript
Promise.allSettled(allRequests).then((results) =>
  console.log("Report:", results),
);

/* Output (after 2s):
[
  { status: "fulfilled", value: "✈️ Airline A: $200" },
  { status: "fulfilled", value: "✈️ Airline B: $180" },
  { status: "rejected", reason: "❌ Airline C: Offline" }
]
*/
```

> **Result:** This is the most "stable" choice for a UI. You can show the user the two prices you found and a warning for the one that failed.

---

### 3. `Promise.race()` — The Speed Demon

It returns the **first** one to settle, whether it's a success or a failure.

```javascript
Promise.race(allRequests)
  .then((val) => console.log("Winner:", val))
  .catch((err) => console.log("First one failed:", err));

// Output (after 1s): "Winner: ✈️ Airline A: $200"
```

> **Result:** Airline A was the fastest (1s), so it won. If Airline C had been the fastest (e.g., failed in 0.5s), the whole race would have rejected.

---

### 4. `Promise.any()` — The Optimist

It returns the **first successful** one. It ignores failures unless everything fails.

```javascript
Promise.any(allRequests)
  .then((val) => console.log("First Success:", val))
  .catch((err) => console.log("All failed"));

// Output (after 1s): "First Success: ✈️ Airline A: $200"
```

> **Result:** It picked Airline A. If A had failed, it would have ignored that failure and waited for Airline B. It only goes to the `.catch()` if A, B, and C all crash.

---

### 3. Custom Polyfills

#### Polyfill: `Promise.all`

```javascript
function myPromiseAll(promises) {
  let completed = 0;
  const results = [];

  return new Promise((resolve, reject) => {
    promises.forEach((promise, index) => {
      promise
        .then((res) => {
          results[index] = res;
          completed++;

          if (completed === promises.length) resolve(results);
        })
        .catch(reject);
    });
  });
}
```

#### Polyfill: `Promise.allSettled`

```javascript
function myPromiseAllSettled(promises) {
  let completed = 0;
  const results = [];

  return new Promise((resolve) => {
    promises.forEach((promise, index) => {
      promise
        .then((value) => {
          results[index] = { status: "fulfilled", value };
        })
        .catch((reason) => {
          results[index] = { status: "rejected", reason };
        })
        .finally(() => {
          completed++;
          if (completed === promises.length) resolve(results);
        });
    });
  });
}
```

#### Polyfill: `Promise.race`

```javascript
function myPromiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach((promise) => {
      Promise.resolve(promise).then(resolve).catch(reject);
    });
  });
}
```

---

**Promises start executing the moment they are created, not when they are passed into the method.**

To understand how to manage API requests efficiently, you first need to understand the mechanics of **async/await**. This syntax allows you to write asynchronous code (tasks that take time, like network requests) that reads like synchronous, top-to-bottom code.

---

## 1. The Core Concept: Async/Await

In JavaScript, an `async` function always returns a **Promise**. The `await` keyword pauses the execution of that specific function until the Promise is settled (resolved or rejected).

* **Async:** Tells the engine, "This function will perform tasks in the background."
* **Await:** Tells the engine, "Wait here until this specific background task is finished before moving to the next line."

### The Syntax
```javascript
async function getUserData() {
  // The code "pauses" at await, but the main thread stays free
  const response = await fetch('https://api.example.com/user');
  const data = await response.json();
  return data;
}
```

---

## 2. Sequential vs. Parallel Requests

The way you use `await` determines whether your requests happen one after another or all at once.

### **Sequential Requests (One-by-One)**
In a sequential flow, you `await` each request before starting the next one. This is necessary **only if** the second request depends on data from the first.

* **Behavior:** Request A starts → finishes → Request B starts → finishes.
* **Total Time:** Time(A) + Time(B).



```javascript
async function getSequential() {
  const user = await fetch('/user'); // Takes 1s
  const posts = await fetch('/posts'); // Takes 1s
  // Total time: 2 seconds
}
```

### **Parallel Requests (All at Once)**
In a parallel flow, you initiate all requests simultaneously. This is the best practice when the requests are independent.

* **Behavior:** Request A and Request B start at the same time.
* **Total Time:** Max(Time(A), Time(B)).
* **Method:** Usually handled via `Promise.all()`.

```javascript
async function getParallel() {
  // Start both requests immediately without awaiting yet
  const userPromise = fetch('/user'); 
  const postsPromise = fetch('/posts');

  // Await them both together
  const [user, posts] = await Promise.all([userPromise, postsPromise]);
  // Total time: ~1 second
}
```

---

## 3. Error Handling

### **try/catch (Sequential)**
Wrap `await` calls in a `try/catch` block to handle errors, just like synchronous code.

```javascript
async function getUserData() {
  try {
    const response = await fetch('/user');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Request failed:', error);
  }
}
```

### **Promise.all with try/catch (Parallel)**
`Promise.all` rejects immediately if **any** promise fails. Wrap it in `try/catch` to handle the failure.

```javascript
async function getParallel() {
  try {
    const [user, posts] = await Promise.all([
      fetch('/user'),
      fetch('/posts'),
    ]);
  } catch (error) {
    // Triggers if either request fails
    console.error('One of the requests failed:', error);
  }
}
```

### **Promise.allSettled (Independent Failures)**
Use `Promise.allSettled` when you want all requests to complete regardless of individual failures.

```javascript
async function getParallelSafe() {
  const results = await Promise.allSettled([
    fetch('/user'),
    fetch('/posts'),
  ]);

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      console.log('Success:', result.value);
    } else {
      console.error('Failed:', result.reason);
    }
  });
}
```

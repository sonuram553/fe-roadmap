

> 📺 **Video Explanation:** [What the heck is the event loop anyway? – Philip Roberts](https://www.youtube.com/watch?v=eiC58R16hb8)

&nbsp;

The **Event Loop** is the secret sauce that allows JavaScript to be "non-blocking" and performant, despite being a **single-threaded** language. 

Because JavaScript can only do one thing at a time, the Event Loop coordinates how and when different pieces of code (like clicks, timers, or API fetches) get to run on that single thread.

---

## The Core Architecture
To understand the loop, you have to look at the four main pieces of the browser's runtime:

### 1. The Call Stack
This is where your code is actually executed. It follows the **LIFO** (Last In, First Out) principle. When you call a function, it's pushed onto the stack; when it returns, it's popped off.
* **The Problem:** If a function takes too long (like a massive loop), it "blocks" the stack, and the browser freezes.

### 2. Web APIs
The browser provides "superpowers" that aren't part of the JavaScript engine itself. These include `setTimeout`, `fetch`, and the `DOM`. When you call one of these, JavaScript hands the task off to the browser and moves on to the next line immediately.

### 3. The Callback Queues
When a Web API finishes its task (e.g., a timer ends or data arrives), it doesn't jump straight back into your code. Instead, it places its "callback function" into a queue. There are two main types:
* **Task Queue (Macrotasks):** For things like `setTimeout`, `setInterval`, and I/O.
* **Microtask Queue:** For higher-priority things like **Promises** (`.then()`, `.catch()`, `.finally()`), `async/await` continuations, `MutationObserver`, `queueMicrotask()`, and `MessageChannel` port handlers.

### 4. The Event Loop
The Event Loop has one simple job: **Monitor the Call Stack and the Queues.** * If the Call Stack is **empty**, it looks at the Microtask Queue first. It processes **all** waiting microtasks.
* Once microtasks are clear, it takes **one** task from the Task Queue and pushes it onto the Call Stack to run.



---

## A Practical Example
Look at this common interview snippet. What is the order of logs?

```javascript
console.log("Start");

setTimeout(() => {
  console.log("Timeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("End");
```

### The Step-by-Step Execution:
1.  **"Start"** is logged immediately (Call Stack).
2.  `setTimeout` is sent to the **Web APIs**. Even though it's 0ms, it moves to the **Task Queue**.
3.  `Promise` callback is moved to the **Microtask Queue**.
4.  **"End"** is logged immediately (Call Stack).
5.  **The Stack is now empty.**
6.  The Event Loop checks the **Microtask Queue** first. **"Promise"** is logged.
7.  The Event Loop then picks one from the **Task Queue**. **"Timeout"** is logged.

**Final Order:** `Start` -> `End` -> `Promise` -> `Timeout`

---

## Why does this matter for the UI?
The browser tries to "repaint" the screen every **16.6ms** (for 60fps). The Event Loop will only allow a **Render** to happen when the Call Stack is empty. 
* If you have a function that runs for 100ms on the stack, the Event Loop can't trigger a repaint, and the user sees a "janky" or frozen screen.
* **Microtasks** can also block rendering. The Event Loop always drains the **entire** microtask queue before allowing a repaint — so if a microtask keeps scheduling new microtasks, the queue never empties and the browser is starved of the chance to render.

---
# Node.js Architecture and Event Loop

## 1. Node.js Architecture

Node.js is a server-side JavaScript runtime environment with a unique architecture designed for high concurrency.

### Core Components

#### **V8 JavaScript Engine**

This engine, developed by Google for the Chrome browser, compiles and executes JavaScript code. It consists of two primary engines:

- **Ignition**: An interpreter that produces bytecode
- **TurboFan**: Produces highly optimized machine code for frequently executed code

#### **Single-Threaded Event Loop**

This core component allows Node.js to handle multiple client requests simultaneously without creating a new thread for each one. The Event Loop processes non-blocking I/O operations and delegates complex, blocking tasks to the thread pool.

#### **Non-Blocking I/O**

Node.js executes I/O operations (like file system access or database interactions) asynchronously. It starts the operation and immediately moves on to the next task, handling the completed operation with a callback function when it finishes.

#### **Libuv Library**

A C++ library that powers the Event Loop and handles asynchronous I/O. It provides the worker threads for CPU-intensive tasks, freeing the main thread to remain responsive.

#### **Event Queue and Thread Pool**

Incoming requests are stored in an Event Queue. The Event Loop pulls requests from the queue and either processes them directly or, for blocking tasks, assigns a thread from the Thread Pool to handle it using external resources (e.g., a database or file system).

## Node.js Event Loop Architecture

Node.js uses a single-threaded, event-driven architecture to handle concurrent requests in a non-blocking manner. This design makes it highly efficient for I/O-intensive tasks, such as real-time applications and streaming services, by offloading operations to the system kernel and processing results through an event loop.

### Core Components

#### **V8 JavaScript Engine**

Node.js is built on Google's open-source V8 engine, the same one used in the Chrome browser. It compiles JavaScript code directly into native machine code at runtime, which allows for faster execution and better performance.

- **Ignition**: A fast, low-level interpreter that produces bytecode
- **TurboFan**: An optimizing compiler that creates highly optimized machine code for "hot" or frequently executed code paths

#### **libuv Library**

This multi-platform C++ library provides the asynchronous I/O capabilities for Node.js.

- **I/O operations**: It abstracts the complexity of non-blocking I/O, handling tasks like file system access, DNS resolution, and networking
- **Thread pool**: For tasks that cannot be handled asynchronously by the operating system, libuv uses a pool of worker threads. This includes computationally heavy operations like file I/O and cryptographic functions, preventing them from blocking the main event loop

#### **Event Loop**

The event loop is the core of the Node.js architecture that allows it to manage asynchronous operations despite running on a single main thread.

1. **Incoming requests**: A client sends a request to the Node.js server
2. **Event queue**: The server places the request into an event queue
3. **Event loop**: The event loop continuously checks the event queue. If a request is simple and non-blocking, it processes it immediately
4. **Worker threads**: If a request involves a blocking operation, the event loop delegates it to a thread in the libuv thread pool
5. **Callbacks**: Once the operation is complete, the thread places the corresponding callback function into the event queue
6. **Response**: The event loop picks up the callback and executes it on the main thread, allowing the server to send the response back to the client

#### **Worker Threads**

As of Node.js v12, the `worker_threads` module allows developers to create and run JavaScript code in parallel threads. This is used for CPU-intensive tasks to prevent them from blocking the event loop.

- **Isolation**: Worker threads run in isolated V8 instances, so data must be explicitly passed between threads via messages or shared memory
- **Best for CPU-bound tasks**: Worker threads are ideal for complex computations, while non-blocking I/O is still best handled by Node.js's native async APIs

### Asynchronous vs. Synchronous Operations

The architecture's performance relies on the distinction between two types of tasks:

#### **Non-blocking (asynchronous)**

These are I/O-bound tasks that do not need to be processed on the main thread, such as network requests and database queries. Node.js offloads them, allowing the main thread to continue processing other requests.

#### **Blocking (synchronous)**

These are CPU-bound tasks that can temporarily freeze the event loop and halt all other processing. Long-running synchronous code should be avoided on the main thread and instead moved to a worker thread.

---

## Event Loop Phases

The Node.js event loop follows a specific order of six phases, which are repeated as long as there is pending work. Microtasks, such as `process.nextTick()` and Promises, have a higher priority and run between each of these phases.

### Microtask Queue

While not a part of the six main phases, the microtask queue is checked and drained after a phase completes and before the event loop moves to the next one.

- **`process.nextTick()` callbacks**: These are run immediately after the current operation finishes. Callbacks scheduled with `process.nextTick()` are prioritized over other asynchronous operations
- **Promise callbacks**: The `then()`, `catch()`, and `finally()` methods of Promises also add callbacks to the microtask queue

### Event Loop Phases

The phases of the event loop execute in a continuous cycle.

#### **1. Timers**

This phase executes callbacks scheduled by `setTimeout()` and `setInterval()`. Timers do not guarantee an exact execution time; they are a minimum threshold. The actual timing depends on the state of the event loop and if it is blocked by other tasks.

#### **2. Pending callbacks**

This phase executes system-level callbacks that were deferred to the next loop iteration. Examples include certain TCP socket errors, such as `ECONNREFUSED`.

#### **3. Idle, prepare**

This is an internal-only phase used by Node.js for housekeeping and preparing for the poll phase.

#### **4. Poll**

This is the central phase of the event loop, responsible for two main functions:

- **Checking for new I/O events**: It retrieves new I/O events (like completed file or network operations) from the system and executes their callbacks
- **Handling the queue**: If the poll queue is not empty, the event loop processes the callbacks until the queue is empty or a hard system limit is reached
- **Determining whether to block**: If the poll queue is empty, the event loop checks for expired timers or scheduled `setImmediate()` callbacks. It may wait here for new I/O callbacks or for timers to expire

#### **5. Check**

This phase executes callbacks that were scheduled with `setImmediate()`. `setImmediate()` is designed to execute its callback immediately after the poll phase completes. If both `setImmediate()` and `setTimeout(fn, 0)` are called from within an I/O callback, `setImmediate()` is guaranteed to run first.

#### **6. Close callbacks**

This final phase executes callbacks for "close" events, such as `socket.on('close')` or `stream.on('end')`, to clean up resources.

### Execution Order Example

```javascript
console.log("Script Start");

// process.nextTick is a microtask
process.nextTick(() => {
  console.log("nextTick callback");
});

// setTimeout is a timers phase callback
setTimeout(() => {
  console.log("setTimeout callback");
}, 0);

// setImmediate is a check phase callback
setImmediate(() => {
  console.log("setImmediate callback");
});

console.log("Script End");
```

The output for this code will be consistent:

1. Script Start
2. Script End
3. nextTick callback
4. setImmediate callback
5. setTimeout callback

**Explanation of the output:**

- The synchronous code (`console.log`) is executed first
- The `process.nextTick()` callback is added to the microtask queue and runs immediately after the current script finishes, but before the event loop phases begin
- The event loop then moves into its phases. The `setImmediate()` callback is executed in the check phase, and the `setTimeout()` callback is executed in the timers phase of the **next** loop cycle

---

## Microtask Queue Execution

Yes, microtask queue callbacks are executed after each phase of the Node.js event loop, not just before the first one. In fact, they are handled at multiple points to ensure high-priority tasks run as soon as possible. This gives callbacks from Promises and `process.nextTick()` higher priority than macrotasks like `setTimeout`.

### How the Microtask Queue Interacts with the Event Loop

The microtask queue is checked and fully drained after these key moments:

- **After initial script execution**: All microtasks generated by the synchronous code (the first script to run) are processed before the event loop even begins its first phase
- **Between event loop phases**: After a specific phase (like timers or poll) has finished executing its callbacks, the microtask queues are drained completely before the event loop moves to the next phase
- **After individual macrotasks**: In some cases, like within the timers or check phases, the event loop can execute a single macrotask callback, then immediately drain the microtask queue before proceeding to the next macrotask
- **After the last phase**: Before a new event loop cycle begins, the microtask queue is drained one last time if any callbacks were queued during the "close callbacks" phase

### Higher Priority for Microtasks

The microtask queue, which includes `Promise.then()` and `process.nextTick()`, has a higher priority than the macrotask queues of the event loop phases (timers, poll, check).

For example, consider this code:

```javascript
setTimeout(() => console.log("setTimeout"), 0);
Promise.resolve().then(() => console.log("Promise"));
console.log("Synchronous");
```

The output will be:

1. Synchronous
2. Promise
3. setTimeout

**Why?**

- The synchronous `console.log('Synchronous')` runs first
- The `Promise.then()` callback is a microtask, and after the synchronous code finishes, the event loop checks for and empties the microtask queue before starting the timers phase
- The `setTimeout(..., 0)` is a macrotask that waits for its turn in the timers phase, which is processed after the microtasks

### The Special Case of `process.nextTick()`

In Node.js, `process.nextTick()` has an even higher priority than other microtasks like Promises. It is executed immediately after the currently running function and before any other asynchronous callbacks, even those in the Promise microtask queue. This means that `process.nextTick()` callbacks are essentially drained at the earliest possible point.

---

## setImmediate vs setTimeout Timing

When comparing `setTimeout(callback, 0)` and `setImmediate(callback)`, the callback for `setImmediate` is not always called first. The execution order is deterministic only in certain contexts, particularly within an I/O cycle.

### Unpredictable Timing in the Main Module

When `setTimeout(..., 0)` and `setImmediate()` are called directly from the main module, their execution order is non-deterministic and can vary between runs. This is due to the inherent timing differences in how Node.js and the underlying system schedule timers.

- `setTimeout(callback, 0)` technically has a minimum delay, which is often 1ms or more, depending on the system timer. If the timers phase completes before a timer is due, the event loop will move on
- `setImmediate()` schedules its callback to run in the check phase, which occurs later in the same event loop cycle

If the main script finishes quickly, it's a race to see whether the timers phase or the check phase is reached first. The result can vary based on the performance of the machine and other running applications.

### Predictable Timing Within an I/O Cycle

The execution order is always guaranteed when the calls are placed inside an I/O callback (e.g., within an `fs.readFile()` callback). In this scenario, `setImmediate()` will consistently run before `setTimeout(..., 0)`.

**Here's why:**

- An I/O callback is executed in the poll phase of the event loop
- The event loop progresses in a set order: **poll** → **check** → **close** → **timers**
- When a `setImmediate()` callback is scheduled during the **poll** phase, it is queued for the **check** phase of the **current** cycle. The event loop proceeds directly to the **check** phase to empty this queue
- Meanwhile, when a `setTimeout(..., 0)` callback is scheduled during the **poll** phase, it must wait for the timers phase of the **next** event loop cycle

### Example of an I/O Cycle

```javascript
const fs = require("fs");

fs.readFile(__filename, () => {
  console.log("I/O callback executed");

  setTimeout(() => {
    console.log("setTimeout from I/O callback");
  }, 0);

  setImmediate(() => {
    console.log("setImmediate from I/O callback");
  });
});
```

**Output:**

1. I/O callback executed
2. setImmediate from I/O callback
3. setTimeout from I/O callback

**Explanation:**

1. The `fs.readFile` operation starts and the script continues
2. The script ends, and the event loop starts its cycle. The `fs.readFile` finishes in the background and its callback is queued
3. The event loop enters the **poll** phase and executes the `fs.readFile` callback, printing the first message
4. Inside this callback, `setImmediate` is called, queuing its callback for the **check** phase. `setTimeout` is also called, queuing its callback for the **timers** phase of the **next** cycle
5. Since the event loop is in the **poll** phase and there are pending `setImmediate` callbacks, it immediately transitions to the **check** phase
6. The `setImmediate` callback is executed
7. The loop completes the **check** phase and starts a new cycle
8. It enters the **timers** phase of the new cycle, where it finds and executes the `setTimeout` callback

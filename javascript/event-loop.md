# Event Loop in Node.js

The Event Loop is the core mechanism that enables Node.js to perform non-blocking I/O operations despite JavaScript being single-threaded. It's what makes Node.js efficient for handling multiple concurrent operations.

## Node.js Architecture: V8 + libuv

Node.js is built on two core technologies:

### **V8 Engine**

- Google's JavaScript engine written in **C++** that executes JavaScript code
- Handles the main thread (single-threaded)
- Manages memory allocation and garbage collection
- Provides the JavaScript runtime environment
- Compiles JavaScript to machine code for high performance

### **libuv**

- Cross-platform asynchronous I/O library written in **C++**
- Provides the Event Loop implementation
- Handles file system operations and some I/O operations
- Manages thread pool for CPU-intensive tasks
- Abstracts platform differences (Windows, Linux, macOS)
- Low-level system interface that V8 can call into
- **Note**: Network operations are primarily handled by Node.js core modules (http, https, net, dgram)

### **How They Work Together**

![Node.js Architecture](./nodejs-architecture.svg)

_Node.js architecture showing V8 and libuv components and their interactions_

### **Thread Model**

```javascript
// Main Thread (V8 C++) - Single-threaded
console.log("Main thread executing");

// I/O Operations (libuv C++ thread pool)
const fs = require("fs");
fs.readFile("file.txt", (err, data) => {
  // Callback executed on main thread after I/O completes
  console.log("I/O completed on main thread");
});

// CPU-intensive tasks (libuv C++ thread pool)
const crypto = require("crypto");
crypto.pbkdf2("password", "salt", 100000, 64, "sha512", (err, key) => {
  // Callback executed on main thread after computation
  console.log("CPU task completed on main thread");
});
```

## V8's Role in the Event Loop

### **V8's Single-Threaded Nature**

V8 executes JavaScript code in a single thread, which means:

```javascript
// All JavaScript code runs sequentially on the main thread
console.log("1. Start");
const result = heavyComputation(); // Blocks the thread
console.log("2. After heavy computation:", result);
console.log("3. End");

function heavyComputation() {
  let sum = 0;
  for (let i = 0; i < 1000000000; i++) {
    sum += i;
  }
  return sum;
}
```

### **V8's Call Stack**

V8 maintains a call stack for function execution:

```javascript
function first() {
  console.log("First function");
  second();
}

function second() {
  console.log("Second function");
  third();
}

function third() {
  console.log("Third function");
  // Call stack: third -> second -> first -> global
}

first();
```

### **V8 and Asynchronous Operations**

V8 cannot handle I/O operations directly, so it delegates to libuv:

```javascript
// V8 executes this synchronously
console.log("V8: Starting file read");

// V8 delegates to libuv
const fs = require("fs");
fs.readFile("file.txt", (err, data) => {
  // V8 executes this callback when libuv signals completion
  console.log("V8: File read completed");
});

// V8 continues executing
console.log("V8: File read initiated, continuing...");
```

## What is the Event Loop?

The Event Loop is a mechanism that allows Node.js to perform non-blocking I/O operations by offloading operations to the system kernel whenever possible. Since most modern kernels are multi-threaded, they can handle multiple operations executing in the background.

## How the Event Loop Works

```javascript
console.log("1. Start");

setTimeout(() => {
  console.log("2. Timer callback");
}, 0);

Promise.resolve().then(() => {
  console.log("3. Promise microtask");
});

console.log("4. End");

// Output:
// 1. Start
// 4. End
// 3. Promise microtask
// 2. Timer callback
```

## libuv's Role in the Event Loop

### **libuv Thread Pool**

libuv maintains a thread pool (default: 4 threads) for CPU-intensive operations:

```javascript
// CPU-intensive operations use libuv thread pool
const crypto = require("crypto");
const fs = require("fs");

// These operations run on libuv thread pool
crypto.pbkdf2("password", "salt", 100000, 64, "sha512", (err, key) => {
  console.log("Crypto operation completed");
});

fs.readFile("large-file.txt", (err, data) => {
  console.log("File read completed");
});

// Thread pool size can be configured
process.env.UV_THREADPOOL_SIZE = 8; // Default is 4
```

### **libuv's Event Loop Implementation**

libuv (C++) implements the actual Event Loop that V8 uses:

```javascript
// libuv (C++) handles these operations
setTimeout(() => {
  console.log("Timer handled by libuv");
}, 1000);

setImmediate(() => {
  console.log("setImmediate handled by libuv");
});

// File I/O handled by libuv (C++)
const fs = require("fs");
fs.readFile("file.txt", (err, data) => {
  console.log("File I/O handled by libuv");
});

// Network I/O handled by Node.js core modules (not directly by libuv)
const http = require("http");
http.get("http://example.com", (res) => {
  console.log("Network I/O handled by Node.js http module");
});
```

### **libuv's Platform Abstraction**

libuv (C++) provides consistent APIs across different platforms:

```javascript
// Same code works on Windows, Linux, macOS
const fs = require("fs");

// libuv (C++) handles platform differences internally
fs.readFile("file.txt", (err, data) => {
  // Works the same on all platforms
  console.log("File read completed");
});

// Signal handling (platform-specific, abstracted by libuv C++)
process.on("SIGINT", () => {
  console.log("Received SIGINT");
  process.exit(0);
});
```

### **Network Operations Clarification**

It's important to understand that network operations in Node.js are handled differently:

```javascript
// ❌ INCORRECT: libuv doesn't directly handle HTTP
// const http = require("http");
// http.get("http://example.com", (res) => {
//   console.log("This is NOT handled by libuv directly");
// });

// ✅ CORRECT: Network operations are handled by Node.js core modules
const http = require("http");
const net = require("net");

// HTTP/HTTPS: Handled by Node.js http/https modules
http.get("http://example.com", (res) => {
  console.log("HTTP handled by Node.js http module");
});

// TCP/UDP: Handled by Node.js net/dgram modules
const socket = net.createConnection(80, "example.com");
socket.on("connect", () => {
  console.log("TCP connection handled by Node.js net module");
});

// What libuv actually handles:
// - File system operations (fs module)
// - Timers (setTimeout, setInterval)
// - Process signals
// - Thread pool for CPU-intensive tasks
// - Event loop implementation
```

### **Actual Node.js Architecture for Network Operations**

```
┌─────────────────────────────────────────────────────────────┐
│                Node.js Application                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   V8 Engine     │    │      Node.js Core Modules       │ │
│  │    (C++)        │    │                                 │ │
│  │                 │    │ • http/https (HTTP/HTTPS)       │ │
│  │ • JavaScript    │◄──►│ • net (TCP)                     │ │
│  │   Execution     │    │ • dgram (UDP)                   │ │
│  │ • Memory Mgmt   │    │ • tls (TLS/SSL)                 │ │
│  │ • Garbage       │    │ • crypto (Cryptography)         │ │
│  │   Collection    │    │                                 │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    libuv (C++)                          │ │
│  │                                                         │ │
│  │ • Event Loop Implementation                             │ │
│  │ • File System Operations                                │ │
│  │ • Timers (setTimeout, setInterval)                      │ │
│  │ • Process Signals                                       │ │
│  │ • Thread Pool (CPU-intensive tasks)                     │ │
│  │ • Platform Abstraction                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**

- **libuv** handles the event loop, file I/O, timers, and thread pool
- **Node.js core modules** (http, https, net, dgram) handle network operations
- **V8** executes JavaScript and manages memory
- Network modules use libuv's event loop but implement their own network logic

## Event Loop Phases

The Event Loop has several phases that it cycles through:

### 1. **Timers Phase**

Executes callbacks scheduled by `setTimeout()` and `setInterval()`.

```javascript
setTimeout(() => {
  console.log("Timer executed");
}, 1000);

setInterval(() => {
  console.log("Interval executed");
}, 2000);
```

### 2. **Pending Callbacks Phase**

Executes I/O callbacks deferred to the next loop iteration.

### 3. **Idle, Prepare Phase**

Used internally by Node.js.

### 4. **Poll Phase**

- Retrieves new I/O events
- Executes I/O related callbacks
- Node.js will block here when appropriate

```javascript
const fs = require("fs");

fs.readFile("file.txt", (err, data) => {
  if (err) throw err;
  console.log("File read:", data);
});
```

### 5. **Check Phase**

Executes `setImmediate()` callbacks.

```javascript
setImmediate(() => {
  console.log("setImmediate executed");
});
```

### 6. **Close Callbacks Phase**

Executes close event callbacks.

```javascript
const server = require("net").createServer();

server.on("close", () => {
  console.log("Server closed");
});
```

## Event Loop Phases Diagram

![Event Loop Cycle](./event-loop-cycle.svg)

_Event Loop Cycle showing all phases and microtask processing_

### **Phase Execution Flow**

![Event Loop Flow](./event-loop-flow.svg)

_Linear flow showing the exact order of phase execution and microtask processing_

### **Microtask Processing**

Microtasks are processed after each phase:

```javascript
console.log("1. Start");

setTimeout(() => {
  console.log("2. Timer phase");

  Promise.resolve().then(() => {
    console.log("3. Microtask after timer");
  });
}, 0);

setImmediate(() => {
  console.log("4. Check phase");

  process.nextTick(() => {
    console.log("5. Microtask after setImmediate");
  });
});

Promise.resolve().then(() => {
  console.log("6. Microtask after script");
});

console.log("7. End");

// Output:
// 1. Start
// 7. End
// 6. Microtask after script
// 2. Timer phase
// 3. Microtask after timer
// 4. Check phase
// 5. Microtask after setImmediate
```

## V8 and libuv Coordination

### **How V8 and libuv Communicate**

```javascript
// 1. V8 (C++) executes JavaScript code
console.log("V8: Starting application");

// 2. V8 delegates I/O to libuv (C++)
const fs = require("fs");
fs.readFile("file.txt", (err, data) => {
  // 5. V8 executes callback when libuv signals completion
  console.log("V8: Processing file data");
});

// 3. V8 continues executing
console.log("V8: I/O delegated to libuv");

// 4. libuv (C++) handles I/O in background
// 6. libuv signals V8 when I/O completes
```

### **Event Loop Coordination**

```javascript
// V8's call stack and libuv's event loop work together
function processData() {
  console.log("V8: Processing data");

  // V8 delegates to libuv
  setTimeout(() => {
    console.log("libuv: Timer completed, V8 executing callback");
  }, 1000);

  // V8 continues immediately
  console.log("V8: Timer scheduled, continuing...");
}

processData();
```

### **Thread Pool Coordination**

```javascript
// CPU-intensive task coordination
const crypto = require("crypto");

console.log("V8: Starting crypto operation");

crypto.pbkdf2("password", "salt", 100000, 64, "sha512", (err, key) => {
  // V8 executes this when libuv thread pool completes
  console.log("V8: Crypto operation completed");
  console.log("V8: Processing result");
});

console.log("V8: Crypto operation delegated to libuv thread pool");
console.log("V8: Continuing with other work");
```

## Microtasks vs Macrotasks

### Microtasks

- Execute immediately after the current execution context
- Examples: `Promise.then()`, `process.nextTick()`, `queueMicrotask()`

### Macrotasks

- Execute in the next Event Loop iteration
- Examples: `setTimeout()`, `setInterval()`, `setImmediate()`, I/O operations

```javascript
console.log("1. Script start");

setTimeout(() => {
  console.log("2. setTimeout (macrotask)");
}, 0);

Promise.resolve().then(() => {
  console.log("3. Promise (microtask)");
});

process.nextTick(() => {
  console.log("4. nextTick (microtask)");
});

console.log("5. Script end");

// Output:
// 1. Script start
// 5. Script end
// 4. nextTick (microtask)
// 3. Promise (microtask)
// 2. setTimeout (macrotask)
```

## What is a "Tick"?

A **tick** is one complete cycle of the Event Loop. It represents the time it takes for the Event Loop to process all the phases and execute all available callbacks. Understanding ticks is crucial for understanding the timing and execution order of asynchronous operations.

### Tick Lifecycle

1. **Start of Tick**: Event Loop begins processing
2. **Phase Execution**: Goes through all phases (timers, pending callbacks, poll, check, close)
3. **Microtask Processing**: Executes all available microtasks
4. **End of Tick**: Event Loop completes one full cycle
5. **Next Tick**: Begins the next iteration

## Priority Order

1. **Synchronous code** (executes immediately)
2. **Microtasks** (process.nextTick, Promises, queueMicrotask)
3. **Macrotasks** (setTimeout, setInterval, setImmediate, I/O)

## Understanding Ticks in Practice

### process.nextTick() - Next Tick Queue

`process.nextTick()` adds a callback to the **next tick queue**, which has the highest priority among microtasks. It executes immediately after the current operation completes, before the next tick begins.

```javascript
console.log("1. Start");

setTimeout(() => {
  console.log("2. setTimeout (next tick)");
}, 0);

Promise.resolve().then(() => {
  console.log("3. Promise (microtask)");
});

process.nextTick(() => {
  console.log("4. nextTick (next tick queue)");
});

console.log("5. End");

// Output:
// 1. Start
// 5. End
// 4. nextTick (next tick queue) - Highest priority microtask
// 3. Promise (microtask)
// 2. setTimeout (next tick) - Macrotask
```

### Tick Boundaries

Each tick represents a clear boundary for when operations will execute:

```javascript
console.log("Tick 1 - Start");

setTimeout(() => {
  console.log("Tick 2 - setTimeout");

  process.nextTick(() => {
    console.log("Tick 2 - nextTick inside setTimeout");
  });

  Promise.resolve().then(() => {
    console.log("Tick 2 - Promise inside setTimeout");
  });
}, 0);

Promise.resolve().then(() => {
  console.log("Tick 1 - Promise");

  setTimeout(() => {
    console.log("Tick 3 - setTimeout inside Promise");
  }, 0);
});

process.nextTick(() => {
  console.log("Tick 1 - nextTick");
});

console.log("Tick 1 - End");

// Output:
// Tick 1 - Start
// Tick 1 - End
// Tick 1 - nextTick
// Tick 1 - Promise
// Tick 2 - setTimeout
// Tick 2 - nextTick inside setTimeout
// Tick 2 - Promise inside setTimeout
// Tick 3 - setTimeout inside Promise
```

### Tick vs setImmediate

```javascript
console.log("Start");

setImmediate(() => {
  console.log("setImmediate - executes in check phase");
});

process.nextTick(() => {
  console.log("nextTick - executes before next tick");
});

setTimeout(() => {
  console.log("setTimeout - executes in timers phase");
}, 0);

console.log("End");

// Output:
// Start
// End
// nextTick - executes before next tick
// setImmediate - executes in check phase
// setTimeout - executes in timers phase
```

### Recursive nextTick - Starvation Warning

Be careful with recursive `process.nextTick()` calls as they can prevent the Event Loop from progressing:

```javascript
// ❌ Dangerous - Can cause starvation
function recursiveNextTick() {
  process.nextTick(() => {
    console.log("Recursive nextTick");
    recursiveNextTick(); // This prevents other operations
  });
}

// ✅ Better - Use setImmediate for recursion
function recursiveSetImmediate() {
  setImmediate(() => {
    console.log("Recursive setImmediate");
    recursiveSetImmediate(); // Allows other operations
  });
}

// Start one of these (not both!)
// recursiveNextTick(); // Can block the event loop
// recursiveSetImmediate(); // Safer recursion
```

### queueMicrotask() vs process.nextTick()

Both are microtasks, but they have different priorities:

```javascript
console.log("Start");

Promise.resolve().then(() => {
  console.log("Promise microtask");
});

queueMicrotask(() => {
  console.log("queueMicrotask");
});

process.nextTick(() => {
  console.log("nextTick");
});

console.log("End");

// Output:
// Start
// End
// nextTick - Highest priority
// Promise microtask
// queueMicrotask - Same priority as Promise
```

### Microtask Priority Order

1. **process.nextTick()** - Highest priority microtask
2. **Promise.then()** - Standard microtask
3. **queueMicrotask()** - Same priority as Promise

```javascript
console.log("1. Script start");

process.nextTick(() => {
  console.log("2. nextTick 1");

  process.nextTick(() => {
    console.log("3. nextTick 2");
  });
});

Promise.resolve().then(() => {
  console.log("4. Promise 1");

  process.nextTick(() => {
    console.log("5. nextTick in Promise");
  });

  Promise.resolve().then(() => {
    console.log("6. Promise in Promise");
  });
});

queueMicrotask(() => {
  console.log("7. queueMicrotask");
});

console.log("8. Script end");

// Output:
// 1. Script start
// 8. Script end
// 2. nextTick 1
// 3. nextTick 2
// 4. Promise 1
// 5. nextTick in Promise
// 6. Promise in Promise
// 7. queueMicrotask
```

## Practical Examples

### Example 1: Understanding Execution Order

```javascript
console.log("Start");

setTimeout(() => {
  console.log("Timeout 1");
  Promise.resolve().then(() => {
    console.log("Promise in timeout");
  });
}, 0);

Promise.resolve().then(() => {
  console.log("Promise 1");
  setTimeout(() => {
    console.log("Timeout in promise");
  }, 0);
});

console.log("End");

// Output:
// Start
// End
// Promise 1
// Timeout 1
// Promise in timeout
// Timeout in promise
```

### Example 2: Blocking the Event Loop

```javascript
// ❌ Bad - Blocks the event loop
function blockingOperation() {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    // This blocks for 5 seconds
  }
  console.log("Blocking operation completed");
}

// ✅ Good - Non-blocking
function nonBlockingOperation() {
  setTimeout(() => {
    console.log("Non-blocking operation completed");
  }, 5000);
}

console.log("Before operation");
// blockingOperation(); // This would block everything
nonBlockingOperation(); // This doesn't block
console.log("After operation");
```

### Example 3: setImmediate vs setTimeout

```javascript
setTimeout(() => {
  console.log("setTimeout");
}, 0);

setImmediate(() => {
  console.log("setImmediate");
});

// Output can vary:
// Sometimes: setTimeout, setImmediate
// Sometimes: setImmediate, setTimeout
```

### Example 4: process.nextTick vs setImmediate

```javascript
console.log("Start");

setImmediate(() => {
  console.log("setImmediate");
});

process.nextTick(() => {
  console.log("nextTick");
});

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("End");

// Output:
// Start
// End
// nextTick
// Promise
// setImmediate
```

## Common Pitfalls

### 1. **Blocking the Event Loop**

```javascript
// ❌ Avoid this
function heavyComputation() {
  let result = 0;
  for (let i = 0; i < 1000000000; i++) {
    result += i;
  }
  return result;
}

// ✅ Use setImmediate for chunking
function chunkedComputation() {
  let result = 0;
  let i = 0;

  function processChunk() {
    const chunkSize = 1000000;
    const end = Math.min(i + chunkSize, 1000000000);

    for (; i < end; i++) {
      result += i;
    }

    if (i < 1000000000) {
      setImmediate(processChunk);
    } else {
      console.log("Computation complete:", result);
    }
  }

  processChunk();
}
```

### 2. **Memory Leaks with Timers**

```javascript
// ❌ Bad - Timer not cleared
function startTimer() {
  setInterval(() => {
    console.log("Timer running");
  }, 1000);
}

// ✅ Good - Clear timer when done
function startTimer() {
  const intervalId = setInterval(() => {
    console.log("Timer running");
  }, 1000);

  // Clear after 10 seconds
  setTimeout(() => {
    clearInterval(intervalId);
    console.log("Timer stopped");
  }, 10000);
}
```

## Performance Implications of V8 + libuv

### **Thread Pool Sizing**

```javascript
// Default thread pool size is 4
console.log("Default thread pool size:", process.env.UV_THREADPOOL_SIZE || 4);

// Increase for CPU-intensive applications
process.env.UV_THREADPOOL_SIZE = 8;

// Monitor thread pool usage
const crypto = require("crypto");

// These will queue if thread pool is full
for (let i = 0; i < 10; i++) {
  crypto.pbkdf2("password", "salt", 100000, 64, "sha512", (err, key) => {
    console.log(`Crypto operation ${i} completed`);
  });
}
```

### **V8 Memory Management**

```javascript
// V8's garbage collector affects performance
const largeArray = [];

// This can cause GC pauses
for (let i = 0; i < 1000000; i++) {
  largeArray.push({ id: i, data: "some data" });
}

// Better: Process in chunks
function processInChunks(items, chunkSize = 1000) {
  let index = 0;

  function processChunk() {
    const chunk = items.slice(index, index + chunkSize);

    // Process chunk
    chunk.forEach((item) => {
      // Process item
    });

    index += chunkSize;

    if (index < items.length) {
      setImmediate(processChunk); // Allow GC between chunks
    }
  }

  processChunk();
}
```

### **libuv I/O Optimization**

```javascript
// Use streaming for large files
const fs = require("fs");

// ❌ Bad - Loads entire file into memory
fs.readFile("large-file.txt", (err, data) => {
  console.log("File loaded:", data.length);
});

// ✅ Good - Streams file in chunks
const readStream = fs.createReadStream("large-file.txt");
readStream.on("data", (chunk) => {
  console.log("Processing chunk:", chunk.length);
});
readStream.on("end", () => {
  console.log("File processing complete");
});
```

## Best Practices

1. **Avoid blocking operations** in the main thread
2. **Use microtasks** for immediate execution after current context
3. **Use macrotasks** for deferring execution to next tick
4. **Clear timers** to prevent memory leaks
5. **Break heavy computations** into chunks using `setImmediate()`
6. **Understand execution order** for debugging async code
7. **Configure thread pool size** based on your application needs
8. **Use streaming** for large I/O operations
9. **Monitor memory usage** and garbage collection
10. **Profile your application** to identify bottlenecks

## Debugging Event Loop Issues

```javascript
// Monitor event loop lag
const start = Date.now();
setImmediate(() => {
  const lag = Date.now() - start;
  console.log(`Event loop lag: ${lag}ms`);
});

// Check if event loop is blocked
setInterval(() => {
  const start = Date.now();
  setImmediate(() => {
    const lag = Date.now() - start;
    if (lag > 100) {
      console.warn(`Event loop blocked for ${lag}ms`);
    }
  });
}, 1000);

// Monitor tick execution
let tickCount = 0;
setImmediate(() => {
  tickCount++;
  console.log(`Tick ${tickCount} completed`);

  // Schedule next tick monitoring
  setImmediate(() => {
    tickCount++;
    console.log(`Tick ${tickCount} completed`);
  });
});

// Track microtask vs macrotask timing
console.log("Start timing test");

const microtaskStart = Date.now();
Promise.resolve().then(() => {
  const microtaskTime = Date.now() - microtaskStart;
  console.log(`Microtask executed in ${microtaskTime}ms`);
});

const macrotaskStart = Date.now();
setTimeout(() => {
  const macrotaskTime = Date.now() - macrotaskStart;
  console.log(`Macrotask executed in ${macrotaskTime}ms`);
}, 0);

console.log("End timing test");
```

The Event Loop is fundamental to understanding Node.js performance and writing efficient asynchronous code. Mastery of these concepts helps you build scalable applications and debug performance issues effectively.

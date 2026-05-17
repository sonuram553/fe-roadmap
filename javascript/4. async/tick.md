## What is a "Tick"?

A **tick** is **one complete cycle/iteration of the Event Loop**. It represents the time it takes for the event loop to:
1. Process all phases (in Node.js) or complete one round of checking queues (in browsers)
2. Execute available callbacks
3. Process microtasks
4. Return to the beginning to start the next cycle

### Simple Analogy:
Think of the event loop as a **clock that ticks**. Each "tick" is one complete rotation of the clock hand through all its positions.

### Browser Context (Frontend Interviews):

```javascript
console.log('Tick 1 - Start');

setTimeout(() => {
  console.log('Tick 2 - This executes in the NEXT tick');
}, 0);

Promise.resolve().then(() => {
  console.log('Tick 1 - Microtasks execute in the SAME tick');
});

console.log('Tick 1 - End');

// Output:
// Tick 1 - Start
// Tick 1 - End
// Tick 1 - Microtasks execute in the SAME tick
// Tick 2 - This executes in the NEXT tick
```

### What Happens During One Tick:

```
┌──────────────────────────────────────────────┐
│              ONE TICK CYCLE                   │
├──────────────────────────────────────────────┤
│                                               │
│  1. Execute all SYNCHRONOUS code              │
│     ↓                                         │
│  2. Process ALL MICROTASKS                    │
│     - Promise.then()                          │
│     - queueMicrotask()                        │
│     - MutationObserver                        │
│     ↓                                         │
│  3. Execute ONE MACROTASK                     │
│     - setTimeout callback                     │
│     - setInterval callback                    │
│     - DOM event callback                      │
│     ↓                                         │
│  4. Render (if needed in browser)             │
│     - Update UI                               │
│     - Repaint/reflow                          │
│     ↓                                         │
│  5. Back to step 1 for NEXT TICK             │
│                                               │
└──────────────────────────────────────────────┘
```

### Key Concept: Tick Boundaries

```javascript
// TICK 1
console.log('1. Synchronous code - Tick 1');

// Schedules for TICK 2
setTimeout(() => {
  console.log('3. Macrotask - Tick 2');
  
  // This microtask runs in TICK 2, right after the setTimeout callback
  Promise.resolve().then(() => {
    console.log('4. Microtask in Tick 2');
  });
  
  // This schedules for TICK 3
  setTimeout(() => {
    console.log('6. Macrotask - Tick 3');
  }, 0);
}, 0);

// This microtask runs in TICK 1 (same tick)
Promise.resolve().then(() => {
  console.log('2. Microtask - Tick 1');
  
  // This also runs in TICK 1
  Promise.resolve().then(() => {
    console.log('2.5. Nested microtask - Still Tick 1');
  });
  
  // This schedules for TICK 2
  setTimeout(() => {
    console.log('5. Macrotask from microtask - Tick 2 (or 3)');
  }, 0);
});

// Output with tick markers:
// 1. Synchronous code - Tick 1
// 2. Microtask - Tick 1
// 2.5. Nested microtask - Still Tick 1
// ← END OF TICK 1 →
// 3. Macrotask - Tick 2
// 4. Microtask in Tick 2
// ← END OF TICK 2 →
// 5. Macrotask from microtask - Tick 2 (or 3)
// ← END OF TICK 3 →
// 6. Macrotask - Tick 3
// ← END OF TICK 4 →
```

### Important Rules About Ticks:

**1. Microtasks Execute in the SAME Tick**
```javascript
console.log('Start of tick');

Promise.resolve().then(() => {
  console.log('Microtask 1 - same tick');
  
  Promise.resolve().then(() => {
    console.log('Microtask 2 - STILL same tick');
    
    Promise.resolve().then(() => {
      console.log('Microtask 3 - STILL same tick');
    });
  });
});

setTimeout(() => {
  console.log('Macrotask - NEXT tick');
}, 0);

console.log('End of synchronous code');

// All microtasks complete before moving to next tick!
```

**2. Each Macrotask Starts a New Tick**
```javascript
setTimeout(() => console.log('Tick 2'), 0);
setTimeout(() => console.log('Tick 3'), 0);
setTimeout(() => console.log('Tick 4'), 0);

// Each setTimeout callback executes in a separate tick
```

**3. Microtasks Have Priority Within a Tick**
```javascript
setTimeout(() => {
  console.log('Macrotask');
}, 0);

// These ALL execute before the setTimeout, even though setTimeout was scheduled first
for (let i = 0; i < 1000; i++) {
  Promise.resolve().then(() => {
    // All 1000 microtasks execute in the same tick
    // Before moving to the setTimeout macrotask
  });
}
```

### Node.js vs Browser Ticks:

**Node.js Tick (More Complex):**
- Has 6 distinct phases: timers → pending callbacks → idle → poll → check → close
- One "tick" = one complete cycle through all 6 phases
- Microtasks processed after EACH phase

**Browser Tick (Simpler):**
- Execute one macrotask
- Execute ALL microtasks
- Render (if needed)
- Repeat

### Common Interview Questions:

**Q: What does "next tick" mean?**

**A:** "Next tick" means the next iteration of the event loop - after the current synchronous code and all microtasks have completed.

**Q: How is `process.nextTick()` different from `setTimeout(fn, 0)`?**

**A (Node.js context):**
```javascript
// process.nextTick() executes in the CURRENT tick (after synchronous code)
process.nextTick(() => {
  console.log('2. Executes before setTimeout');
});

// setTimeout executes in the NEXT tick
setTimeout(() => {
  console.log('3. Executes in next tick');
}, 0);

console.log('1. Synchronous');

// Output: 1, 2, 3
```

**Q: Can microtasks delay the next tick indefinitely?**

**A:** YES! This is called "microtask starvation":
```javascript
function infiniteMicrotasks() {
  Promise.resolve().then(() => {
    console.log('Creating another microtask');
    infiniteMicrotasks(); // Creates another microtask in same tick
  });
}

infiniteMicrotasks();

// This setTimeout will NEVER execute because we never complete the current tick!
setTimeout(() => {
  console.log('This will never run!');
}, 0);
```

### Practical Tick Example:

```javascript
console.log('=== TICK 1 START ===');
console.log('A');

setTimeout(() => {
  console.log('=== TICK 2 START ===');
  console.log('B');
  
  Promise.resolve().then(() => {
    console.log('C (microtask in tick 2)');
  });
  
  console.log('=== TICK 2 END ===');
}, 0);

Promise.resolve().then(() => {
  console.log('D (microtask in tick 1)');
  
  setTimeout(() => {
    console.log('=== TICK 3 START ===');
    console.log('E');
    console.log('=== TICK 3 END ===');
  }, 0);
  
  Promise.resolve().then(() => {
    console.log('F (nested microtask in tick 1)');
  });
});

console.log('G');
console.log('=== TICK 1 END ===');

/* Output:
=== TICK 1 START ===
A
G
=== TICK 1 END ===
D (microtask in tick 1)
F (nested microtask in tick 1)
=== TICK 2 START ===
B
=== TICK 2 END ===
C (microtask in tick 2)
=== TICK 3 START ===
E
=== TICK 3 END ===
*/
```

### Memory Aid for Interviews:

**One Tick = One Trip Around the Loop**

```
Current Tick:
  ✅ All synchronous code
  ✅ ALL microtasks (no matter how many are queued)
  
Next Tick:
  ⏭️  ONE macrotask
  ✅ ALL resulting microtasks
  ⏭️  Repeat
```

### Summary:

- **Tick** = One complete iteration of the event loop
- **Same tick** = Synchronous code + all microtasks
- **Next tick** = After current synchronous code + microtasks complete
- **Microtasks** don't create new ticks (same tick)
- **Macrotasks** create new ticks (next tick)
- Understanding ticks helps predict execution order in async code

This concept is **crucial** for frontend interviews because it explains why Promise callbacks execute before setTimeout callbacks, even when setTimeout is scheduled first! 🎯
Debouncing and Throttling in JavaScript - two important techniques for controlling the frequency of function execution.

## Debouncing

**Debouncing** delays the execution of a function until a certain amount of time has passed since it was last called. If the function is called again before the delay expires, the timer resets.

### How it works:

- Function execution is delayed by a specified time
- If called again before the delay, the previous call is cancelled
- Only the last call executes after the delay period

### Example:

```javascript
function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    // Clear the previous timeout
    clearTimeout(timeoutId);

    // Set a new timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Usage
const searchInput = document.getElementById("search");
const debouncedSearch = debounce((query) => {
  console.log("Searching for:", query);
  // API call here
}, 300);

searchInput.addEventListener("input", (e) => {
  debouncedSearch(e.target.value);
});
```

## Throttling

**Throttling** limits the execution of a function to once every specified time interval, regardless of how many times it's called.

### How it works:

- Function executes immediately on first call
- Subsequent calls are ignored until the time interval passes
- After the interval, the next call can execute

### Example:

```javascript
function throttle(func, delay) {
  let lastCall = 0;

  return function (...args) {
    const now = Date.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

// Usage
const throttledScroll = throttle(() => {
  console.log("Scroll event handled");
  // Update scroll position, parallax effects, etc.
}, 100);

window.addEventListener("scroll", throttledScroll);
```

## Key Differences

| Aspect               | Debouncing                                | Throttling                    |
| -------------------- | ----------------------------------------- | ----------------------------- |
| **Execution**        | Only after delay period with no new calls | At regular intervals          |
| **First call**       | Delayed                                   | Executed immediately          |
| **Subsequent calls** | Reset the timer                           | Ignored until interval passes |
| **Use case**         | Wait for user to stop action              | Limit frequency of action     |

## Common Use Cases

### Debouncing:

- **Search suggestions**: Wait for user to stop typing
- **Form validation**: Validate after user stops editing
- **API calls**: Prevent excessive requests
- **Window resize**: Layout calculations after resizing stops

### Throttling:

- **Scroll events**: Update UI elements during scrolling
- **Mouse movement**: Track cursor position
- **Button clicks**: Prevent rapid submissions
- **Animation frames**: Smooth animations

```javascript
// Infinite scroll with throttling
const throttledScrollCheck = throttle(() => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

  if (scrollTop + clientHeight >= scrollHeight - 100) {
    loadMoreContent();
  }
}, 200);

window.addEventListener("scroll", throttledScrollCheck);
```

## When to Choose Which?

- **Use Debouncing when**: You want to wait for a "pause" in events (user stops typing, stops resizing window)
- **Use Throttling when**: You want to limit the frequency of continuous events (scrolling, mouse movement, button spam)

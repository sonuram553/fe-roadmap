# Understanding `passive: true` in Event Listeners

The `passive` option is a performance hint for the browser. It tells the engine that the event listener will **never** call `event.preventDefault()`, allowing the browser to optimize scrolling and touch interactions.

## 1. The Problem: Scrolling "Jank"

When a user touches the screen or uses a scroll wheel, the browser usually waits for your JavaScript to finish executing to see if you want to cancel that scroll. If your JS is slow, the scroll stutters.

## 2. The Solution: `passive: true`

By setting `passive: true`, you promise the browser: _"I will not stop the scroll. Go ahead and start moving the page immediately while I run my code in the background."_

### Syntax

```javascript
// The third argument is the 'options' object
window.addEventListener("touchstart", myHandler, {
  passive: true,
});
```

---

## 3. Comparison Table

| Feature                | `passive: false` (Default\*)    | `passive: true`                      |
| ---------------------- | ------------------------------- | ------------------------------------ |
| **Performance**        | Can be slow/stuttery            | Instant and smooth                   |
| **`preventDefault()`** | Works as intended               | **Ignored** (throws console warning) |
| **Main Use Case**      | Modals, Drawing, Custom Sliders | Analytics, Scroll tracking, Parallax |

\*_Note: Modern browsers now default to `true` for `touchstart` on the `window` or `body` to force performance._

---

## 4. Practical Implementation: The "Scroll Lock"

If you are building a **modal** or a **drawing canvas**, you must explicitly set `passive: false` to regain the ability to stop the scroll.

```javascript
// Function to lock background scrolling
function lockScroll(event) {
  event.preventDefault();
}

// You MUST set passive: false to allow preventDefault() to work
window.addEventListener("touchmove", lockScroll, { passive: false });

// To unlock:
// window.removeEventListener('touchmove', lockScroll);
```

---

## 5. Key Takeaways

1. **Use `passive: true`** for almost everything (scrolling, tracking, animations) to keep the UI smooth.
2. **Use `passive: false`** ONLY when you need to stop the page from moving (like preventing background scroll behind a popup).
3. **The `scroll` event** is already non-blocking; `passive` is only relevant for `wheel`, `touchstart`, and `touchmove`.

---

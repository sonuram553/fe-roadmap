JavaScript has four main equality algorithms, each designed for different use cases:

## 1. `==` Abstract Equality (Loose Equality)

Performs **type coercion** before comparing. If types differ, JS converts one or both values to a common type first.

```js
0 == ""        // true  (both coerce to 0)
0 == false     // true  (false → 0)
null == undefined  // true  (special case)
"1" == 1       // true  (string → number)
[] == false    // true  ([] → "" → 0, false → 0)
```

The coercion rules are complex and often surprising, which is why `==` is generally discouraged.

---

## 2. `===` Strict Equality

**No type coercion.** Both value and type must match. Only one quirk:

```js
1 === 1        // true
1 === "1"      // false
null === null  // true
NaN === NaN    // false ← the famous exception
+0 === -0      // true  ← another subtle one
```

This is the right default for most comparisons.

---

## 3. `Object.is()` SameValue Equality

Behaves like `===` but fixes the two edge cases:

```js
Object.is(NaN, NaN)   // true  ✅
Object.is(+0, -0)     // false ✅
Object.is(1, 1)       // true
Object.is(1, "1")     // false
```

Use this when you genuinely need to distinguish `+0` from `-0`, or safely check for `NaN` (e.g., in polyfills or math-heavy code).

---

## 4. `SameValueZero` Used Internally by JS

Same as `Object.is()` **except** it treats `+0` and `-0` as equal. You can't call it directly — it's used internally by:

- `Array.prototype.includes()`
- `Map` and `Set` key lookup
- `TypedArray` search methods

```js
[NaN].includes(NaN)       // true  (SameValueZero handles NaN)
new Set([+0, -0]).size    // 1     (+0 and -0 are treated as same)
```

---

## Why do these differences exist?

| Reason | Explanation |
|---|---|
| **Legacy** | `==` dates back to JS's early days when coercion was seen as a convenience feature |
| **Pragmatism** | `===` was added to give developers a reliable, coercion-free option |
| **Math correctness** | `Object.is` intentionally breaks from IEEE 754 for `NaN` — because from a programming utility standpoint, you often need to ask "is this thing the same `NaN` I put in?" and the IEEE rule makes that impossible. So `NaN` → IEEE 754 says they're unequal, but `Object.is` makes them equal. For `+0`/`-0` → IEEE 754 says they're distinct, `===` ignores that, but `Object.is` respects it — because sign of zero matters in some math. |
| **Collection ergonomics** | `SameValueZero` is used in `Map`/`Set` because treating `+0 === -0` makes key lookups predictable, while still correctly handling `NaN` as a valid unique key |

---

## Quick decision guide

```
Need to check for NaN or distinguish +0/-0?  →  Object.is()
General comparisons in your code?           →  ===
Working with Map/Set/includes?              →  JS uses SameValueZero automatically
Legacy code or intentional coercion?        →  == (use sparingly, document why)
```

The core takeaway: JS grew organically, and each algorithm was added to solve real problems that the previous one couldn't handle cleanly.
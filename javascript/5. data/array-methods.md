# JavaScript Array Methods

## Non-Mutating Methods (Don't Change Original Array)

```javascript
arr.slice(start, end)

// Searching
arr.indexOf(element)
arr.lastIndexOf(element)
arr.includes(element)
arr.find(callback)
arr.findIndex(callback)

// Transformation
arr.map(callback)
arr.filter(callback)
arr.flat(depth)
arr.flatMap(callback)
arr.concat(arr2, ...)

// Iteration
arr.forEach(callback)
arr.every(callback)
arr.some(callback)
arr.reduce(callback, initialValue)
arr.reduceRight(callback, initialValue)

// Conversion
arr.join(separator)
arr.toString()
```

---

## Mutating Methods (Change Original Array)

```javascript
// Add/Remove
arr.push(element);
arr.pop();
arr.unshift(element); // Add to start
arr.shift(); // Remove from start
arr.splice(start, deleteCount, ...items);

// Reorder
arr.sort(compareFn);
arr.reverse();

// Fill
arr.fill(value, start, end);
```

---

## `array.flat(depth)` and `array.flatMap(callback)`

### `array.flat(depth)`

Flattens nested arrays by the specified depth level.

**Syntax:**

```javascript
arr.flat(depth); // depth defaults to 1
```

**Examples:**

```javascript
// Flatten one level (default)
[1, [2, 3], [4, 5]].flat()  // [1, 2, 3, 4, 5]

// Flatten two levels
[1, [2, [3, 4]]].flat(2)  // [1, 2, 3, 4]

// Flatten all levels
[1, [2, [3, [4, [5]]]]].flat(Infinity)  // [1, 2, 3, 4, 5]

// Removes empty slots
[1, 2, , 4, 5].flat()  // [1, 2, 4, 5]
```

### `array.flatMap(callback)`

Maps each element using callback, then flattens the result by one level. Equivalent to `map()` followed by `flat(1)`.

**Syntax:**

```javascript
arr.flatMap((element) => {
  // return new value or array
});
```

**Examples:**

**Example 1: Split strings and flatten**

```javascript
["Hello World", "How are you"].flatMap((str) => str.split(" "));

// Step 1 (map): [['Hello', 'World'], ['How', 'are', 'you']]
// Step 2 (flat): ['Hello', 'World', 'How', 'are', 'you']
```

**Example 2: Filter and map**

```javascript
[1, 2, 3, 4].flatMap((x) => (x % 2 === 0 ? [x * 2] : []));

// Step 1 (map): [[], [4], [], [8]]
// Step 2 (flat): [4, 8]  // Empty arrays removed
```

---

## `array.sort(compareFn)`

Sorts array **in place**. Default sort converts elements to strings.

**Syntax:**

```javascript
arr.sort((a, b) => a - b); // Ascending numbers
arr.sort((a, b) => b - a); // Descending numbers
```

**Compare Function Rules:**

- Positive Result → swap (b comes before a)
- Negative or Zero Result → don't swap (a stays before b)

**Examples:**

```javascript
// Objects
users.sort((a, b) => a.age - b.age);
users.sort((a, b) => a.name.localeCompare(b.name));
```

---

## `array.reduce(callback, initialValue)`

Reduces array to a single value by executing callback on each element.

**Syntax:**

```javascript
arr.reduce((accumulator, currentValue) => {
  // return new accumulator
}, initialValue);
```

**Examples:**

```javascript
// Sum
[1, 2, 3]
  .reduce((acc, curr) => acc + curr, 0) // 6

// Count occurrences
["a", "b", "a"].reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {}) // { a: 2, b: 1 }

// Flatten
[[1, 2], [3, 4]].reduce((acc, curr) => acc.concat(curr), []); // [1, 2, 3, 4]
```

**Important:** Always return the accumulator and provide `initialValue` to avoid errors with empty arrays

**Without initialValue:**

- Accumulator starts with `array[0]`
- Iteration starts from `array[1]`
- Throws `TypeError` on empty arrays

```javascript
[1, 2, 3].reduce((acc, curr) => acc + curr)  // 6 (starts: acc=1, curr=2)
[5].reduce((acc, curr) => acc + curr)        // 5 (callback never called)
[].reduce((acc, curr) => acc + curr)         // ❌ TypeError!
```


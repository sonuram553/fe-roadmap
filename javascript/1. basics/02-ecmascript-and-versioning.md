# ECMAScript & JavaScript Versioning

## What is ECMAScript?

- **ECMA International**: Standards organization that creates specifications for technologies (e.g., ECMA-262 for JavaScript, ECMA-404 for JSON, ECMA-334 for C#)
- **ECMAScript**: The specification (ECMA-262) that defines the scripting language standard
- **JavaScript**: A programming language that conforms to the ECMAScript specification
- **Relationship**: JavaScript is an implementation of ECMAScript (like a blueprint vs. the actual building)

## Who's in Charge?

- **TC39 Committee**: Technical Committee 39 - the group that maintains and evolves ECMAScript
- Members include representatives from major browser vendors (Google, Mozilla, Apple, Microsoft), tech companies, and community members
- Proposals go through a 5-stage process (Stage 0-4) before becoming part of the standard

## JavaScript Versions (Key Milestones)

- **ES3 (1999)**: Foundation for modern JavaScript
- **ES5 (2009)**: Added strict mode, JSON support, array methods (map, filter, forEach)
- **ES6/ES2015**: Biggest update - **arrow functions**, **classes**, **let/const**, **promises**, **modules**, **template literals**, **Array Rest/Spread properties**
- **ES2016+**: Annual releases with incremental improvements
  - `async/await`
  - Optional chaining (`?.`), nullish coalescing (`??`)
  - `Array.flat()`, `Array.includes()`
  - `Object.entries()`, `Object.values()`, `Object.fromEntries()`
  - Top-level await, private class fields
- **Recent additions (ES2023–2025)**
  - ES2023: Non-mutating array methods: `toReversed()`, `toSorted()`, `toSpliced()`, `with()`
  - ES2023: `Array.findLast()`, `Array.findLastIndex()`
  - ES2024: `Object.groupBy()` / `Map.groupBy()` — group items by a key
  - ES2024: `Promise.withResolvers()` — expose `resolve`/`reject` outside the constructor
  - ES2024: `Set` methods: `union()`, `intersection()`, `difference()`, `isSubsetOf()`
  - ES2025: `Promise.try()` — wrap sync/async code uniformly
  - ES2025: Iterator helpers: `.map()`, `.filter()`, `.take()`, `.drop()` directly on iterators
  - ES2025: `import` attributes — `import data from './f.json' with { type: 'json' }`

## Browser Support

- Modern browsers continuously implement new ECMAScript features
- Tools like Babel transpile newer JavaScript to older versions for compatibility
- Check [caniuse.com](https://caniuse.com) for feature support across browsers


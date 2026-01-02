# Let and Const Declarations Across Multiple Script Tags

## The Statement Explained

> **Note**: `let` and `const` declarations are only processed when the current script gets processed. If you have two `<script>` elements running in script mode within one HTML, the first script is not subject to the TDZ restrictions for top-level `let` or `const` variables declared in the second script, although if you declare a `let` or `const` variable in the first script, declaring it again in the second script will cause a redeclaration error.

## Key Concepts

### 1. Each Script Block Has Its Own TDZ Context

The **Temporal Dead Zone (TDZ)** is the period between entering a scope and the actual declaration where a variable cannot be accessed. Each `<script>` tag is processed independently for TDZ purposes.

#### Example - No TDZ error across scripts:

```html
<script>
  // First script runs
  console.log(typeof x); // "undefined" - No TDZ error!
  // x doesn't exist in this script's context yet
</script>

<script>
  // Second script runs
  let x = 5;
  console.log(x); // 5
</script>
```

This works because the first script doesn't know about `x` yet - it hasn't been processed.

#### Contrast - TDZ error within the same script:

```html
<script>
  console.log(typeof x); // ReferenceError: Cannot access 'x' before initialization
  let x = 5; // TDZ applies within the same script
</script>
```

### 2. Scripts Share the Same Global Scope

Even though each script has its own TDZ context, they all contribute to the same global scope. This means **redeclaration is not allowed**.

#### Example - Redeclaration error:

```html
<script>
  let x = 5;
  console.log(x); // 5
</script>

<script>
  let x = 10; // SyntaxError: Identifier 'x' has already been declared
</script>
```

### 3. Contrast with `var`

With `var`, you can redeclare because it doesn't create a lexical binding in the same way:

```html
<script>
  var x = 5;
</script>

<script>
  var x = 10; // This works! (though not recommended)
  console.log(x); // 10
</script>
```

## Summary

- **TDZ is per-script**: You won't get TDZ errors for variables declared in _future_ scripts
- **Scope is shared**: You _will_ get redeclaration errors for `let`/`const` variables declared in _previous_ scripts
- Each `<script>` tag is processed sequentially, but each has its own TDZ context while contributing to a shared global scope
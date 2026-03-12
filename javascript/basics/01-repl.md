# REPL (Read-Eval-Print Loop)

## What is REPL?

REPL stands for **Read-Eval-Print Loop**. It's an interactive programming environment that takes single user inputs, executes them, and returns the result to the user.

## How it Works

The REPL cycle follows four steps:

1. **Read** - Reads and parses the user's input
2. **Eval** - Evaluates the input (executes the code)
3. **Print** - Prints the result of the evaluation
4. **Loop** - Waits for the next input and repeats the cycle

## Common Examples

### Node.js REPL

```bash
$ node
> 2 + 2
4
> const greeting = "Hello, World!"
undefined
> greeting
'Hello, World!'
> console.log(greeting)
Hello, World!
undefined
```

### Browser Console

The browser's JavaScript console (DevTools) is also a REPL environment where you can:

- Test JavaScript code snippets
- Debug code
- Interact with the DOM
- Inspect variables and objects

## Popular REPL Environments

- **Node.js** - JavaScript runtime REPL
- **Browser Console** - Built into all modern browsers
- **Python REPL** - Interactive Python shell
- **Online REPLs** - JSFiddle, CodePen, Repl.it, etc.

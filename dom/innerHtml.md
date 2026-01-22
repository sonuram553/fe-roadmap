# innerHTML

`innerHTML` is a property that gets or sets the **HTML markup** contained within an element. Unlike `textContent` or `innerText` which deal with plain text, `innerHTML` works with HTML strings.

---

## Getting HTML Content

When you read `innerHTML`, it returns the HTML source code inside the element as a string.

```html
<div id="container">
  <p>Hello <strong>World</strong></p>
</div>
```

```javascript
const el = document.getElementById("container");
console.log(el.innerHTML);
// Output: "\n  <p>Hello <strong>World</strong></p>\n"
```

---

## Setting HTML Content

When you set `innerHTML`, the browser parses the string as HTML and replaces the element's content with the resulting DOM nodes.

```javascript
const el = document.getElementById("container");
el.innerHTML = "<h1>New Title</h1><p>New paragraph</p>";
```

This completely replaces the existing content with the new parsed HTML.

---

## innerHTML vs textContent vs innerText

| Feature                  | `innerHTML`           | `textContent`     | `innerText`           |
| ------------------------ | --------------------- | ----------------- | --------------------- |
| **Returns/Sets**         | HTML markup           | Raw text          | Rendered text         |
| **Parses HTML**          | ✅ Yes                | ❌ No             | ❌ No                 |
| **XSS vulnerability**    | ⚠️ Yes (if misused)   | ✅ Safe           | ✅ Safe               |
| **Performance**          | Slower (parsing)      | ⚡ Fast           | 🐢 Slower (reflow)    |
| **Preserves formatting** | HTML structure        | Plain text only   | Plain text only       |

---

## Security Considerations (XSS)

**Never use `innerHTML` with untrusted user input!** It can lead to Cross-Site Scripting (XSS) attacks.

### ❌ Dangerous

```javascript
// User input could contain malicious scripts
const userInput = '<img src="x" onerror="alert(\'Hacked!\')">';
element.innerHTML = userInput; // Script executes!
```

### ✅ Safe Alternatives

```javascript
// Use textContent for plain text (auto-escapes HTML)
element.textContent = userInput;

// Or use createElement for dynamic content
const p = document.createElement("p");
p.textContent = userInput;
element.appendChild(p);
```

### Using DOMPurify for Sanitization

If you must render user-provided HTML, use a sanitization library:

```javascript
import DOMPurify from "dompurify";

const cleanHTML = DOMPurify.sanitize(userInput);
element.innerHTML = cleanHTML;
```

---

## Common Use Cases

### 1. Rendering Templates

```javascript
const items = ["Apple", "Banana", "Cherry"];
const list = document.getElementById("list");

list.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
```

### 2. Clearing an Element

```javascript
element.innerHTML = ""; // Removes all child nodes
```

### 3. Checking if Element is Empty

```javascript
if (element.innerHTML.trim() === "") {
  console.log("Element is empty");
}
```

---

## Performance Considerations

### Avoid Repeated innerHTML Modifications

```javascript
// ❌ Bad: Causes multiple reflows and re-parses
for (const item of items) {
  list.innerHTML += `<li>${item}</li>`; // Re-parses entire HTML each time!
}

// ✅ Better: Build string first, then assign once
list.innerHTML = items.map((item) => `<li>${item}</li>`).join("");

// ✅ Best: Use DocumentFragment for complex DOM operations
const fragment = document.createDocumentFragment();
items.forEach((item) => {
  const li = document.createElement("li");
  li.textContent = item;
  fragment.appendChild(li);
});
list.appendChild(fragment);
```

### Why Repeated innerHTML is Slow

When you do `element.innerHTML += "<li>new</li>"`, here's what happens:

1. **Serialize existing DOM** → The browser converts that element's **children** (its subtree) into an HTML string
2. **Concatenate** → Appends the new HTML to that string
3. **Parse back to DOM** → The combined string is parsed into new DOM nodes
4. **Replace all child nodes** → All existing children of that element are destroyed and replaced with the newly parsed nodes

This is why it's inefficient in loops — you're repeatedly destroying and recreating the same child nodes.

---

## innerHTML vs outerHTML

| Property     | Description                                 |
| ------------ | ------------------------------------------- |
| `innerHTML`  | Content **inside** the element              |
| `outerHTML`  | The element **itself** including its markup |

```html
<div id="box"><span>Hello</span></div>
```

```javascript
const box = document.getElementById("box");

console.log(box.innerHTML);
// Output: "<span>Hello</span>"

console.log(box.outerHTML);
// Output: "<div id=\"box\"><span>Hello</span></div>"
```

---

## Script Tags and innerHTML

Scripts inserted via `innerHTML` are **not executed** for security reasons.

```javascript
element.innerHTML = '<script>alert("Hello")</script>';
// The script tag is inserted but DOES NOT run
```

If you need to execute scripts dynamically, use:

```javascript
const script = document.createElement("script");
script.textContent = 'console.log("Executed!")';
document.body.appendChild(script);
```
---
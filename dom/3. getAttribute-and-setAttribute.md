# `getAttribute()` and `setAttribute()` Methods

## Overview

The `getAttribute()` and `setAttribute()` methods are used to read and modify **HTML attributes** on DOM elements. These are fundamental methods for working with element attributes in JavaScript.

| Method | Purpose |
|--------|---------|
| `getAttribute()` | Read the value of an attribute |
| `setAttribute()` | Set or update the value of an attribute |
| `removeAttribute()` | Remove an attribute entirely |
| `hasAttribute()` | Check if an attribute exists |

---

## `getAttribute()` Method

Returns the value of a specified attribute on the element.

### Syntax

```javascript
const value = element.getAttribute(attributeName);
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `attributeName` | A string specifying the name of the attribute (case-insensitive for HTML) |

### Return Value

| Condition | Returns |
|-----------|---------|
| Attribute exists | The attribute's value as a string |
| Attribute doesn't exist | `null` |

### Examples

```javascript
const link = document.querySelector('a');

// Get href attribute
const href = link.getAttribute('href');
console.log(href); // '/about'

// Get data attributes
const card = document.querySelector('.card');
const userId = card.getAttribute('data-user-id');
console.log(userId); // '123'

// Get class attribute
const classes = card.getAttribute('class');
console.log(classes); // 'card active featured'

// Non-existent attribute
const missing = card.getAttribute('data-nonexistent');
console.log(missing); // null
```

---

## `setAttribute()` Method

Sets the value of an attribute on the specified element. If the attribute already exists, the value is updated; otherwise, a new attribute is added.

### Syntax

```javascript
element.setAttribute(name, value);
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `name` | The name of the attribute to set |
| `value` | The value to assign (automatically converted to string) |

### Return Value

`undefined` (no return value)

### Examples

```javascript
const img = document.querySelector('img');

// Set src attribute
img.setAttribute('src', '/images/photo.jpg');

// Set alt attribute
img.setAttribute('alt', 'A beautiful sunset');

// Set custom data attribute
img.setAttribute('data-loaded', 'true');

// Set multiple attributes
const link = document.createElement('a');
link.setAttribute('href', 'https://example.com');
link.setAttribute('target', '_blank');
link.setAttribute('rel', 'noopener noreferrer');
```

### Value Coercion

```javascript
const element = document.getElementById('box');

// Numbers are converted to strings
element.setAttribute('data-count', 42);
console.log(element.getAttribute('data-count')); // '42' (string)

// Booleans are converted to strings
element.setAttribute('data-active', true);
console.log(element.getAttribute('data-active')); // 'true' (string)

// Objects are converted using toString()
element.setAttribute('data-obj', { key: 'value' });
console.log(element.getAttribute('data-obj')); // '[object Object]' ❌
```

---

## `hasAttribute()` and `removeAttribute()`

### `hasAttribute()`

```javascript
const button = document.querySelector('button');

if (button.hasAttribute('disabled')) {
  console.log('Button is disabled');
}

// Check for custom attribute
if (button.hasAttribute('data-action')) {
  const action = button.getAttribute('data-action');
  performAction(action);
}
```

### `removeAttribute()`

```javascript
const input = document.querySelector('input');

// Remove disabled attribute to enable the input
input.removeAttribute('disabled');

// Remove a data attribute
input.removeAttribute('data-temp');

// Remove required validation
input.removeAttribute('required');
```

---

## Properties vs Attributes

Understanding the difference between HTML **attributes** and DOM **properties** is crucial.

### Key Differences

| Aspect | Attributes | Properties |
|--------|------------|------------|
| **Location** | HTML markup | DOM object |
| **Access** | `getAttribute()` / `setAttribute()` | Dot notation (e.g., `element.id`) |
| **Type** | Always strings | Can be any type (boolean, object, etc.) |
| **Synchronization** | Initial value from HTML | May differ from attribute after changes |

### Example: Attribute vs Property Divergence

```html
<input type="text" value="initial">
```

```javascript
const input = document.querySelector('input');

// Initially, they're the same
console.log(input.getAttribute('value')); // 'initial'
console.log(input.value);                  // 'initial'

// User types "hello" in the input...

// Attribute stays the same (reflects HTML)
console.log(input.getAttribute('value')); // 'initial'

// Property reflects current value
console.log(input.value);                  // 'hello'
```

### Boolean Attributes

```html
<input type="checkbox" checked>
<button disabled>Click me</button>
```

```javascript
const checkbox = document.querySelector('input[type="checkbox"]');
const button = document.querySelector('button');

// Attributes return strings (or null)
console.log(checkbox.getAttribute('checked')); // '' (empty string)
console.log(button.getAttribute('disabled'));  // '' (empty string)

// Properties return booleans
console.log(checkbox.checked);  // true
console.log(button.disabled);   // true

// Setting boolean attributes
checkbox.setAttribute('checked', '');     // Adds checked
checkbox.removeAttribute('checked');       // Removes checked

// Setting boolean properties (preferred)
checkbox.checked = true;  // Checks the box
checkbox.checked = false; // Unchecks the box
```

### When to Use Which

| Use Case | Recommended Approach |
|----------|---------------------|
| Standard HTML attributes (id, class, href, src) | Property access (`element.id`) |
| Custom data attributes (`data-*`) | `getAttribute()` / `dataset` |
| Boolean attributes (checked, disabled) | Property access (`element.disabled`) |
| Non-standard/custom attributes | `getAttribute()` / `setAttribute()` |
| ARIA attributes | `getAttribute()` / `setAttribute()` |

---

## Working with `data-*` Attributes

### Using `getAttribute` / `setAttribute`

```javascript
const card = document.querySelector('.card');

// Get data attribute
const userId = card.getAttribute('data-user-id');
const status = card.getAttribute('data-status');

// Set data attribute
card.setAttribute('data-loaded', 'true');
card.setAttribute('data-timestamp', Date.now());
```

### Using the `dataset` Property (Preferred)

```javascript
const card = document.querySelector('.card');

// Get data attributes (camelCase conversion)
const userId = card.dataset.userId;     // data-user-id → userId
const status = card.dataset.status;     // data-status → status

// Set data attributes
card.dataset.loaded = 'true';           // Sets data-loaded="true"
card.dataset.lastUpdated = '2024-01-15'; // Sets data-last-updated="2024-01-15"

// Delete data attribute
delete card.dataset.status;
```

### `dataset` Naming Convention

| HTML Attribute | `dataset` Property |
|----------------|-------------------|
| `data-id` | `dataset.id` |
| `data-user-id` | `dataset.userId` |
| `data-last-modified` | `dataset.lastModified` |
| `data-XMLParser` | `dataset.xmlparser` |

---

## Practical Use Cases

### 1. Form State Management

```javascript
function setFieldError(input, message) {
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', `${input.id}-error`);
  
  const errorEl = document.getElementById(`${input.id}-error`);
  errorEl.textContent = message;
}

function clearFieldError(input) {
  input.removeAttribute('aria-invalid');
  input.removeAttribute('aria-describedby');
}
```

### 2. Toggle Button State

```javascript
function toggleButton(button) {
  const isPressed = button.getAttribute('aria-pressed') === 'true';
  button.setAttribute('aria-pressed', !isPressed);
}
```

### 3. Dynamic Link Generation

```javascript
function createExternalLink(url, text) {
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  link.textContent = text;
  return link;
}
```

### 4. Storing Component State

```javascript
const accordion = document.querySelector('.accordion');

function toggleAccordion(section) {
  const isExpanded = section.getAttribute('data-expanded') === 'true';
  
  section.setAttribute('data-expanded', !isExpanded);
  section.querySelector('.content').style.display = isExpanded ? 'none' : 'block';
}
```

### 5. Accessible Tab Navigation

```javascript
function switchTab(tabs, panels, selectedIndex) {
  tabs.forEach((tab, index) => {
    const isSelected = index === selectedIndex;
    tab.setAttribute('aria-selected', isSelected);
    tab.setAttribute('tabindex', isSelected ? '0' : '-1');
  });
  
  panels.forEach((panel, index) => {
    panel.setAttribute('aria-hidden', index !== selectedIndex);
  });
}
```

---

## Common Gotchas

### 1. Case Sensitivity

```javascript
// HTML attributes are case-insensitive
element.setAttribute('DATA-ID', '123');
element.getAttribute('data-id'); // '123' ✅

// But be consistent - use lowercase
element.setAttribute('data-id', '123'); // Preferred
```

### 2. Null vs Empty String

```javascript
const element = document.getElementById('box');

// Non-existent attribute returns null
element.getAttribute('data-missing'); // null

// Empty attribute returns empty string
// <div data-empty="">
element.getAttribute('data-empty'); // ''

// Check properly
if (element.hasAttribute('data-value')) {
  const value = element.getAttribute('data-value');
}
```

### 3. Boolean Attribute Pitfall

```javascript
// ❌ Wrong - this enables the button, not disables it!
button.setAttribute('disabled', 'false');
// The presence of the attribute disables it, regardless of value

// ✅ Correct - remove the attribute
button.removeAttribute('disabled');

// ✅ Or use the property
button.disabled = false;
```

### 4. Attribute Names with Special Characters

```javascript
// ❌ Invalid attribute names
element.setAttribute('my attribute', 'value'); // Space not allowed
element.setAttribute('data-123', 'value');     // Cannot start with number

// ✅ Valid attribute names
element.setAttribute('my-attribute', 'value');
element.setAttribute('data-item-123', 'value');
```

### 5. Property and Attribute Sync Issues

```javascript
const input = document.querySelector('input');

// Setting attribute doesn't always update property
input.setAttribute('value', 'new value');
console.log(input.value); // May still be old value if user has typed

// For form elements, set the property directly
input.value = 'new value'; // Always works
```

### 6. Performance with Many Attributes

```javascript
// ❌ Inefficient - multiple DOM operations
element.setAttribute('data-a', '1');
element.setAttribute('data-b', '2');
element.setAttribute('data-c', '3');

// ✅ Better for many data attributes - use dataset
Object.assign(element.dataset, {
  a: '1',
  b: '2', 
  c: '3'
});
```

---

# The `style` Object and `getComputedStyle()` Method

## Overview

When working with CSS in JavaScript, there are three primary ways to access an element's styles:

1. **`element.style`** - Access/modify inline styles directly
2. **`getComputedStyle()`** - Read the final computed styles (read-only)
3. **`element.classList`** - Add, remove, and toggle CSS classes

---

## The `style` Object

The `style` property provides access to an element's **inline styles** (styles set via the `style` attribute in HTML or via JavaScript).

### Syntax

```javascript
element.style.propertyName = 'value';
```

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Read/Write** | Can both get and set styles |
| **Scope** | Only accesses inline styles |
| **CSS Property Names** | Uses camelCase (e.g., `backgroundColor`, not `background-color`) |
| **Return Value** | Returns empty string if style isn't set inline |

### Examples

```javascript
const box = document.getElementById('box');

// Setting styles
box.style.backgroundColor = 'blue';
box.style.width = '200px';
box.style.marginTop = '20px';

// Getting inline styles
console.log(box.style.backgroundColor); // 'blue'

// Multiple properties at once using cssText
box.style.cssText = 'color: white; padding: 10px; border: 1px solid black;';
```

### Setting Multiple Styles

```javascript
// Using Object.assign
Object.assign(box.style, {
  backgroundColor: 'coral',
  padding: '20px',
  borderRadius: '8px'
});
```

### Important Limitation

```html
<style>
  #box { background-color: red; }
</style>
<div id="box">Hello</div>

<script>
  const box = document.getElementById('box');
  console.log(box.style.backgroundColor); // '' (empty string!)
  // The style is in a stylesheet, not inline
</script>
```

---

## The `getComputedStyle()` Method

This method returns an object containing the **final computed values** of all CSS properties for an element, after applying all stylesheets and resolving any computations.

### Syntax

```javascript
const styles = window.getComputedStyle(element);
const styles = window.getComputedStyle(element, pseudoElement);
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `element` | The DOM element to get computed styles for |
| `pseudoElement` | Optional. A string specifying a pseudo-element (e.g., `'::before'`, `'::after'`) |

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Read-Only** | Cannot modify styles through this object |
| **Complete** | Returns all CSS properties, even those not explicitly set |
| **Computed Values** | Returns resolved values (e.g., `em` converted to `px`) |
| **Live** | Returns a live `CSSStyleDeclaration` object |

### Examples

```javascript
const box = document.getElementById('box');
const computedStyles = window.getComputedStyle(box);

// Get computed background color (from any source - inline, stylesheet, inherited)
console.log(computedStyles.backgroundColor); // 'rgb(255, 0, 0)'

// Get computed width (always in pixels)
console.log(computedStyles.width); // '300px'

// Alternative syntax using getPropertyValue()
console.log(computedStyles.getPropertyValue('background-color')); // 'rgb(255, 0, 0)'
```

### Working with Pseudo-Elements

```javascript
const element = document.querySelector('.decorated');
const beforeStyles = window.getComputedStyle(element, '::before');

console.log(beforeStyles.content); // '"★"'
console.log(beforeStyles.color);   // 'rgb(255, 215, 0)'
```

---

## Comparison Table

| Aspect | `element.style` | `getComputedStyle()` |
|--------|-----------------|---------------------|
| **Access Type** | Read/Write | Read-Only |
| **Style Source** | Inline styles only | All sources (inline, stylesheet, inherited, browser defaults) |
| **Property Names** | camelCase | camelCase or `getPropertyValue('kebab-case')` |
| **Values** | As set (e.g., `'2em'`) | Computed (e.g., `'32px'`) |
| **Performance** | Faster | Slightly slower (causes reflow) |
| **Pseudo-elements** | Not supported | Supported |

---

## Practical Use Cases

### 1. Reading Actual Dimensions

```javascript
function getElementDimensions(element) {
  const styles = window.getComputedStyle(element);
  return {
    width: parseFloat(styles.width),
    height: parseFloat(styles.height),
    paddingTop: parseFloat(styles.paddingTop),
    paddingBottom: parseFloat(styles.paddingBottom)
  };
}
```

### 2. Toggle Dark Mode

```javascript
function toggleDarkMode(element) {
  const currentBg = window.getComputedStyle(element).backgroundColor;
  
  // Parse RGB values
  const rgb = currentBg.match(/\d+/g).map(Number);
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  
  if (brightness > 128) {
    element.style.backgroundColor = '#1a1a1a';
    element.style.color = '#ffffff';
  } else {
    element.style.backgroundColor = '#ffffff';
    element.style.color = '#1a1a1a';
  }
}
```

### 3. Animate Based on Current Values

```javascript
function expandWidth(element) {
  const currentWidth = parseFloat(getComputedStyle(element).width);
  element.style.width = (currentWidth * 1.5) + 'px';
}
```

### 4. Check if Element is Hidden

```javascript
function isHidden(element) {
  const styles = window.getComputedStyle(element);
  return styles.display === 'none' || 
         styles.visibility === 'hidden' || 
         styles.opacity === '0';
}
```

---

## The `classList` Object

The `classList` property returns a live `DOMTokenList` collection of the class attributes of an element. It provides a convenient way to add, remove, toggle, and check for CSS classes.

### Syntax

```javascript
element.classList.method(className);
```

### Key Characteristics

| Feature | Description |
|---------|-------------|
| **Type** | Returns a `DOMTokenList` (array-like object) |
| **Live** | Automatically updates when classes change |
| **Read-Only Property** | The `classList` itself is read-only, but you can modify its contents |
| **Space Handling** | Automatically handles spaces; no need to manually parse class strings |

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `add(class1, class2, ...)` | Adds one or more classes | `undefined` |
| `remove(class1, class2, ...)` | Removes one or more classes | `undefined` |
| `toggle(class, force?)` | Toggles a class on/off | `boolean` (new state) |
| `contains(class)` | Checks if class exists | `boolean` |
| `replace(oldClass, newClass)` | Replaces a class with another | `boolean` (success) |
| `item(index)` | Returns class at index | `string` or `null` |

### Examples

```javascript
const element = document.getElementById('myElement');

// Toggle with force parameter
element.classList.toggle('active', true);  // Always adds
element.classList.toggle('active', false); // Always removes
element.classList.toggle('visible', isLoggedIn); // Conditional toggle
```

### `classList` vs `className`

| Aspect | `classList` | `className` |
|--------|-------------|-------------|
| **Type** | `DOMTokenList` | `string` |
| **Add Class** | `el.classList.add('new')` | `el.className += ' new'` |
| **Remove Class** | `el.classList.remove('old')` | Requires string manipulation |
| **Toggle** | `el.classList.toggle('active')` | Manual logic needed |
| **Check Class** | `el.classList.contains('active')` | `el.className.includes('active')` (can have false positives) |
| **Multiple Classes** | Handles automatically | Must manage spaces manually |

```javascript
// className approach (error-prone)
element.className = 'class1 class2 class3';
element.className += ' newClass'; // Don't forget the space!

// classList approach (safer)
element.classList.add('class1', 'class2', 'class3');
element.classList.add('newClass'); // No space handling needed
```

### Practical Use Cases

#### 1. Toggle Menu Visibility

```javascript
const menuButton = document.getElementById('menu-toggle');
const menu = document.getElementById('menu');

menuButton.addEventListener('click', () => {
  menu.classList.toggle('open');
  menuButton.classList.toggle('active');
});
```

#### 2. Form Validation Feedback

```javascript
function validateInput(input) {
  const isValid = input.value.trim().length > 0;
  
  input.classList.toggle('valid', isValid);
  input.classList.toggle('invalid', !isValid);
  
  return isValid;
}
```

#### 3. Tab Switching

```javascript
function switchTab(selectedTab) {
  // Remove active from all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Add active to selected tab
  selectedTab.classList.add('active');
}
```

#### 4. Conditional Styling

```javascript
function updateUserStatus(element, user) {
  element.classList.toggle('admin', user.role === 'admin');
  element.classList.toggle('verified', user.isVerified);
  element.classList.toggle('premium', user.subscription === 'premium');
}
```

### Common Gotchas with classList

```javascript
// ❌ Wrong - class names cannot contain spaces
element.classList.add('my class'); // InvalidCharacterError!

// ✅ Correct - add as separate arguments
element.classList.add('my', 'class');

// ❌ Wrong - className.includes() can have false positives
element.className = 'button-primary';
element.className.includes('button'); // true, but 'button' class doesn't exist!

// ✅ Correct - use contains()
element.classList.contains('button'); // false (correct)

// Note: classList.add() ignores duplicates
element.classList.add('active');
element.classList.add('active'); // No error, no duplicate
```

---

## Common Gotchas

### 1. CSS Property Names

```javascript
// ❌ Wrong - uses CSS kebab-case
element.style.background-color = 'red'; // SyntaxError!

// ✅ Correct - uses camelCase
element.style.backgroundColor = 'red';

// ✅ Also correct - using bracket notation
element.style['background-color'] = 'red';
```

### 2. Units Are Required

```javascript
// ❌ Wrong - no unit
element.style.width = 100; // Won't work

// ✅ Correct - include the unit
element.style.width = '100px';
```

### 3. getComputedStyle Returns Strings

```javascript
const styles = getComputedStyle(element);

// ❌ Wrong - comparing string to number
if (styles.opacity > 0.5) { } // Always true ('0.3' > 0.5 is true!)

// ✅ Correct - parse to number first
if (parseFloat(styles.opacity) > 0.5) { }
```

### 4. Performance Considerations

```javascript
// ❌ Inefficient - causes multiple reflows
for (let i = 0; i < elements.length; i++) {
  const height = getComputedStyle(elements[i]).height;
  elements[i].style.width = height;
}

// ✅ Better - batch reads, then batch writes
const heights = elements.map(el => getComputedStyle(el).height);
elements.forEach((el, i) => {
  el.style.width = heights[i];
});
```

---

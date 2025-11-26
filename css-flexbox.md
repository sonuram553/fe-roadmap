# CSS Flexbox - Complete Guide

## What is Flexbox?

Flexbox (Flexible Box Layout) is a one-dimensional layout method that allows you to arrange items in rows or columns. It's designed to provide a more efficient way to lay out, align, and distribute space among items in a container, even when their size is unknown or dynamic.

## Key Concepts

### 1. **Flex Container (Parent)**

The element with `display: flex` or `display: inline-flex`

### 2. **Flex Items (Children)**

The direct children of the flex container

### 3. **Main Axis**

The primary axis along which flex items are laid out (horizontal by default)

### 4. **Cross Axis**

The axis perpendicular to the main axis (vertical by default)

## Basic Setup

```css
.container {
  display: flex; /* Creates a flex container */
}
```

## Flex Container Properties

### 1. **flex-direction**

Defines the direction of the main axis

```css
.container {
  flex-direction: row; /* Default: left to right */
  flex-direction: row-reverse; /* Right to left */
  flex-direction: column; /* Top to bottom */
  flex-direction: column-reverse; /* Bottom to top */
}
```

### 2. **flex-wrap**

Controls whether flex items wrap to new lines

```css
.container {
  flex-wrap: nowrap; /* Default: all items on one line */
  flex-wrap: wrap; /* Items wrap to new lines */
  flex-wrap: wrap-reverse; /* Items wrap in reverse order */
}
```

### 3. **flex-flow**

Shorthand for `flex-direction` and `flex-wrap`

```css
.container {
  flex-flow: row wrap; /* direction and wrap in one property */
}
```

### 4. **justify-content**

Aligns items along the main axis

```css
.container {
  justify-content: flex-start; /* Default: start of main axis */
  justify-content: flex-end; /* End of main axis */
  justify-content: center; /* Center of main axis */
  justify-content: space-between; /* Space between items */
  justify-content: space-around; /* Space around items */
  justify-content: space-evenly; /* Equal space around items */
}
```

### 5. **align-items**

Aligns items along the cross axis

```css
.container {
  align-items: stretch; /* Default: stretch to fill container */
  align-items: flex-start; /* Start of cross axis */
  align-items: flex-end; /* End of cross axis */
  align-items: center; /* Center of cross axis */
  align-items: baseline; /* Align to text baseline */
}
```

### 6. **align-content**

Aligns wrapped lines when there's extra space in the cross axis

```css
.container {
  align-content: stretch; /* Default: stretch lines */
  align-content: flex-start; /* Start of cross axis */
  align-content: flex-end; /* End of cross axis */
  align-content: center; /* Center of cross axis */
  align-content: space-between; /* Space between lines */
  align-content: space-around; /* Space around lines */
  align-content: space-evenly; /* Equal space around lines */
}
```

### 7. **gap**

Controls spacing between flex items

```css
.container {
  gap: 10px; /* Same gap for rows and columns */
  gap: 10px 20px; /* Row gap, column gap */
  row-gap: 10px; /* Only row gap */
  column-gap: 20px; /* Only column gap */
}
```

## Flex Item Properties

### 1. **flex-grow**

Defines how much a flex item should grow relative to other items

```css
.item {
  flex-grow: 0; /* Default: don't grow */
  flex-grow: 1; /* Grow to fill available space */
  flex-grow: 2; /* Grow twice as much as flex-grow: 1 */
}
```

### 2. **flex-shrink**

Defines how much a flex item should shrink relative to other items

```css
.item {
  flex-shrink: 1; /* Default: can shrink */
  flex-shrink: 0; /* Don't shrink */
  flex-shrink: 2; /* Shrink twice as much as flex-shrink: 1 */
}
```

### 3. **flex-basis**

Defines the initial size of a flex item before free space is distributed

```css
.item {
  flex-basis: auto; /* Default: based on content */
  flex-basis: 200px; /* Fixed size */
  flex-basis: 50%; /* Percentage of container */
  flex-basis: 0; /* No base size */
}
```

### 4. **flex**

Shorthand for `flex-grow`, `flex-shrink`, and `flex-basis`

```css
.item {
  flex: 1; /* flex-grow: 1, flex-shrink: 1, flex-basis: 0% */
  flex: 0 1 auto; /* Default values */
  flex: 2 1 200px; /* grow: 2, shrink: 1, basis: 200px */
  flex: none; /* flex: 0 0 auto (no grow, no shrink) */
}
```

### 5. **align-self**

Overrides the container's `align-items` for individual items

```css
.item {
  align-self: auto; /* Default: inherit from container */
  align-self: flex-start; /* Start of cross axis */
  align-self: flex-end; /* End of cross axis */
  align-self: center; /* Center of cross axis */
  align-self: baseline; /* Align to text baseline */
  align-self: stretch; /* Stretch to fill container */
}
```

### 6. **order**

Changes the visual order of flex items without changing HTML structure

```css
.item {
  order: 0; /* Default: natural order */
  order: 1; /* Move after items with order: 0 */
  order: -1; /* Move before items with order: 0 */
}
```

## Practical Examples

### 1. **Centering Content**

```css
.center-container {
  display: flex;
  justify-content: center; /* Horizontal centering */
  align-items: center; /* Vertical centering */
  height: 100vh; /* Full viewport height */
}
```

### 2. **Navigation Bar**

```css
.navbar {
  display: flex;
  justify-content: space-between; /* Logo left, menu right */
  align-items: center;
  padding: 1rem;
}

.nav-links {
  display: flex;
  gap: 2rem; /* Space between menu items */
}
```

### 3. **Card Layout**

```css
.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.card {
  flex: 1 1 300px; /* Grow, shrink, min-width 300px */
  max-width: 400px;
}
```

### 4. **Sidebar Layout**

```css
.layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  flex: 0 0 250px; /* Don't grow, don't shrink, 250px wide */
  background: #f0f0f0;
}

.main-content {
  flex: 1; /* Take remaining space */
  overflow-y: auto;
}
```

### 5. **Form Layout**

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  align-items: end;
}

.form-row .form-group {
  flex: 1; /* Equal width for form fields */
}
```

### 6. **Responsive Grid**

```css
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.grid-item {
  flex: 1 1 calc(33.333% - 1rem); /* 3 columns on desktop */
}

@media (max-width: 768px) {
  .grid-item {
    flex: 1 1 calc(50% - 0.5rem); /* 2 columns on tablet */
  }
}

@media (max-width: 480px) {
  .grid-item {
    flex: 1 1 100%; /* 1 column on mobile */
  }
}
```

## Common Flexbox Patterns

### 1. **Sticky Footer**

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1; /* Takes remaining space */
}

.footer {
  flex: 0 0 auto; /* Fixed height */
}
```

### 2. **Equal Height Columns**

```css
.columns {
  display: flex;
  align-items: stretch; /* Default, but explicit */
}

.column {
  flex: 1;
  /* All columns will have equal height */
}
```

### 3. **Flexible Input Groups**

```css
.input-group {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.input-group input {
  flex: 1;
  border: none;
  padding: 0.5rem;
}

.input-group button {
  flex: 0 0 auto;
  border: none;
  background: #007bff;
  color: white;
  padding: 0.5rem 1rem;
}
```

## Browser Support

Flexbox is supported in all modern browsers:

- Chrome 21+
- Firefox 28+
- Safari 9+
- Edge 12+
- IE 11 (with some limitations)

## Flexbox vs Grid

| Flexbox              | CSS Grid               |
| -------------------- | ---------------------- |
| One-dimensional      | Two-dimensional        |
| Content-based sizing | Container-based sizing |
| Great for components | Great for page layouts |
| Flexible item sizing | Fixed track sizing     |

## Best Practices

1. **Use flexbox for component-level layouts**
2. **Use CSS Grid for page-level layouts**
3. **Don't overuse flexbox** - sometimes simple block/inline-block is better
4. **Test on different screen sizes** - flexbox can behave unexpectedly
5. **Use `flex: 1` instead of `flex-grow: 1`** for better browser support
6. **Consider using `gap` instead of margins** for spacing

## Common Mistakes

1. **Forgetting `display: flex`** on the container
2. **Using `flex: 1` on all items** when you want different sizes
3. **Not understanding the difference** between `justify-content` and `align-items`
4. **Using flexbox for simple layouts** where block/inline would work
5. **Not considering responsive behavior** when using fixed flex-basis values

## Debugging Tips

1. **Use browser dev tools** to visualize flex containers and items
2. **Add temporary borders** to see container and item boundaries
3. **Use `outline` instead of `border`** to avoid affecting layout
4. **Check for conflicting CSS** that might override flex properties
5. **Test with different content lengths** to ensure flexibility works

## Complete Example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flexbox Example</title>
    <style>
      .container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        font-family: Arial, sans-serif;
      }

      .header {
        background: #333;
        color: white;
        padding: 1rem;
        text-align: center;
      }

      .main {
        display: flex;
        flex: 1;
      }

      .sidebar {
        background: #f0f0f0;
        flex: 0 0 200px;
        padding: 1rem;
      }

      .content {
        flex: 1;
        padding: 1rem;
      }

      .card-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .card {
        flex: 1 1 300px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .footer {
        background: #333;
        color: white;
        padding: 1rem;
        text-align: center;
      }

      .button-group {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .btn {
        flex: 1;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      .btn-primary {
        background: #007bff;
        color: white;
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <h1>Flexbox Layout Example</h1>
      </header>

      <main class="main">
        <aside class="sidebar">
          <h3>Sidebar</h3>
          <p>Navigation and additional content</p>
        </aside>

        <section class="content">
          <h2>Main Content</h2>
          <div class="card-grid">
            <div class="card">
              <h3>Card 1</h3>
              <p>This is a flexible card that adapts to available space.</p>
              <div class="button-group">
                <button class="btn btn-primary">Action</button>
                <button class="btn btn-secondary">Cancel</button>
              </div>
            </div>
            <div class="card">
              <h3>Card 2</h3>
              <p>Another flexible card with equal width distribution.</p>
              <div class="button-group">
                <button class="btn btn-primary">Action</button>
                <button class="btn btn-secondary">Cancel</button>
              </div>
            </div>
            <div class="card">
              <h3>Card 3</h3>
              <p>Third card that wraps to new line on smaller screens.</p>
              <div class="button-group">
                <button class="btn btn-primary">Action</button>
                <button class="btn btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p>&copy; 2024 Flexbox Example. All rights reserved.</p>
      </footer>
    </div>
  </body>
</html>
```

This comprehensive guide covers all the essential aspects of CSS Flexbox, from basic concepts to advanced patterns and real-world examples. Flexbox is a powerful tool for creating flexible, responsive layouts that work well across different screen sizes and devices.


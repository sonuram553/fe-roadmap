**SVG** stands for **Scalable Vector Graphics**. Unlike standard images (like JPEGs or PNGs) which are made of pixels, SVGs are built using mathematical formulas and XML code.

Think of it this way: a PNG is like a painting where every dot of color is fixed. An SVG is like a set of instructions: _"Draw a blue circle at these coordinates."_ Because it’s math-based, you can zoom in forever and it will never get blurry or "pixelated."

### Why use SVG?

- **Scalability:** Perfect for logos and icons; they stay crisp on any screen size.
- **Small File Size:** Usually much smaller than high-res bitmaps.
- **Editable:** Since it's just code, you can change colors or shapes using CSS or JavaScript.

---

### Basic Shape Examples

You can embed SVGs directly into HTML. Every SVG starts with an `<svg>` tag defining the "canvas" area.

#### 1. Rectangle (`<rect>`)

To draw a rectangle, you define the width, height, and starting position ($x, y$).

```html
<svg width="200" height="100">
  <rect
    width="150"
    height="80"
    x="10"
    y="10"
    fill="skyblue"
    stroke="navy"
    stroke-width="5"
  />
</svg>
```

- **fill:** The inside color.
- **stroke:** The border color.

#### 2. Circle (`<circle>`)

Circles are defined by their center point ($cx, cy$) and their radius ($r$).

```html
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="coral" />
</svg>
```

#### 3. Line (`<line>`)

A line just needs a starting point ($x1, y1$) and an ending point ($x2, y2$).

```html
<svg width="200" height="100">
  <line x1="0" y1="0" x2="200" y2="100" stroke="black" stroke-width="2" />
</svg>
```

#### 4. Polygon (`<polygon>`)

This is used for shapes with multiple straight sides, like triangles or stars. You simply list the $(x, y)$ coordinates for every corner.

```html
<svg width="120" height="120">
  <polygon
    points="60,20 100,100 20,100"
    fill="lime"
    stroke="green"
    stroke-width="2"
  />
</svg>
```

---

### Comparison of Shapes

| Shape       | Key Attributes         | What they define                                             |
| :---------- | :--------------------- | :----------------------------------------------------------- |
| **Rect**    | `width`, `height`      | Dimensions of the box.                                       |
| **Circle**  | `cx`, `cy`, `r`        | Center position and how big the circle is.                   |
| **Ellipse** | `cx`, `cy`, `rx`, `ry` | Like a circle, but with different horizontal/vertical radii. |
| **Line**    | `x1, y1`, `x2, y2`     | The start and end "anchors."                                 |
| **Polygon** | `points`               | A string of connected $(x, y)$ coordinates.                  |

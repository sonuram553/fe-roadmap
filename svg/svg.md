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

---

### The `viewBox` Attribute

`viewBox` defines the internal coordinate system of an SVG — it decides what part of your drawing is visible and how it maps to the actual rendered size (set by the `width`/`height` on the `<svg>` tag).

```html
<svg viewBox="min-x min-y width height">
```

- **min-x, min-y:** The top-left corner of the visible area (the "camera" position).
- **width, height:** How much of the coordinate space is visible (the "zoom level").

```html
<svg width="200" height="200" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="coral" />
</svg>
```

Here the SVG is rendered at 200×200 pixels on the page, but internally you're drawing on a 100×100 grid. Everything you draw gets scaled up 2x to fit. This is why the circle (radius 40, centered at 50,50) fills most of the box even though its numbers look small.

**Why it matters:**

- **Responsive scaling:** Without `width`/`height` (or with them set to `100%`), the SVG scales to fill its container while `viewBox` keeps the internal proportions and coordinates consistent.
- **Panning/zooming:** Changing `min-x`/`min-y` pans the view; shrinking `width`/`height` (relative to the element's actual size) zooms in, since the same content now covers more rendered pixels.
- **Decoupling drawing units from display size:** You can design at any convenient scale (e.g. a 24x24 icon grid) and let `viewBox` handle scaling it to however large it's displayed.

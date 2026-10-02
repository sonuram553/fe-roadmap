# How Kabir's blur works

The function goes through the photo one pixel at a time. For each pixel, it adds up the colours of every pixel in a small square around it, divides by how many it added, and writes that average into a new image. Here's the code piece by piece.

### The inputs

```js
function blur(pixels, width, height, radius) {
```

- `pixels` is the photo, stored as one flat list with four numbers per pixel (red, green, blue, alpha).
- `width` and `height` give the photo's size in pixels. The function needs them because the flat list doesn't record where one row ends and the next begins.
- `radius` is how far the square reaches from the centre pixel. Radius 1 gives a 3 × 3 square, and radius 4 gives 9 × 9.

### Step 1: an empty image for the result

```js
const out = new Uint8ClampedArray(pixels.length);
```

This creates a new list the same size as the photo, filled with zeros. Blurred values go into `out`, and `pixels` is only ever read. That way every average is worked out from the original colours, not from neighbours that have already been blurred.

### Step 2: visit every pixel

```js
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
```

These loops visit each pixel in turn, row by row from the top-left. `(x, y)` is the pixel being blurred right now, the centre of the square.

### Step 3: start the totals at zero

```js
let r = 0, g = 0, b = 0, n = 0;
```

These are running totals for red, green and blue, plus `n`, a count of how many neighbours were added. They're reset for every pixel, because each pixel gets its own average.

### Step 4: visit every pixel in the square

```js
for (let dy = -radius; dy <= radius; dy++) {
  for (let dx = -radius; dx <= radius; dx++) {
    const px = x + dx, py = y + dy;
```

`dx` and `dy` are offsets from the centre. With radius 1, each runs −1, 0, 1, which covers the 3 × 3 square, centre included. `(px, py)` is the neighbour's actual position in the photo.

### Step 5: skip neighbours outside the photo

```js
if (px < 0 || py < 0 || px >= width || py >= height) continue;
```

Near an edge, part of the square hangs off the photo. For the top-left pixel, `dx = -1` gives `px = -1`, which doesn't exist. `continue` skips that neighbour and moves on to the next one.

### Step 6: find the neighbour and add its colour

```js
const i = (py * width + px) * 4;
r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++;
```

By this point the loops have picked a neighbour at column `px`, row `py`. This step does two jobs: it finds that neighbour's colour in the photo, and it adds the colour to the running totals.

**Finding the neighbour.** The photo isn't stored as a grid. It's one long list, four numbers per pixel, one row after another. Take a tiny grey image, 3 pixels wide and 2 tall:

```
        x=0  x=1  x=2
y=0:    10   20   30
y=1:    40   50   60
```

Its list looks like this:

```
index:   0  1  2  3 |  4  5  6  7 |  8  9 10 11 | 12 13 14 15 | 16 17 18 19 | 20 21 22 23
         R  G  B  A |  R  G  B  A |  R  G  B  A |  R  G  B  A |  R  G  B  A |  R  G  B  A
pixel:   (0,0)      |  (1,0)      |  (2,0)      |  (0,1)      |  (1,1)      |  (2,1)
         └─────────── row 0 ──────────────────┘ └─────────── row 1 ──────────────────┘
```

So to get from a position like `(1, 1)` to a place in the list, the first line works it out in two steps:

1. `py * width + px` counts how many pixels come before this one. Every row above it holds `width` pixels, so you skip `py` whole rows, then move `px` pixels along the current row. For `(1, 1)`, that's `1 * 3 + 1 = 4`: the three pixels of row 0, plus one more in row 1. So `(1, 1)` is pixel number 4.
2. `* 4` turns the pixel number into a list index, because every pixel before it takes up four slots. Pixel 4 starts at index `4 * 4 = 16`.

`i` always lands on the pixel's red value. Green is the next slot, `i + 1`, and blue the one after, `i + 2`. Alpha, at `i + 3`, is left alone.

**Adding it to the totals.** The second line adds the neighbour's red to `r`, its green to `g` and its blue to `b`, and adds 1 to `n`, the count of neighbours so far. The three colours are added separately so that, in step 7, each one can be averaged on its own: a red pixel next to a blue one should blur to purple, not to grey.

This step runs once for every neighbour that survived step 5. Blurring the top-left pixel `(0, 0)` of the tiny image, four neighbours survive, and the totals build up like this (in a grey pixel, red, green and blue are equal, so `r` stands for all three):

```
neighbour (0,0): i = 0,  value 10 → r = 10,  n = 1
neighbour (1,0): i = 4,  value 20 → r = 30,  n = 2
neighbour (0,1): i = 12, value 40 → r = 70,  n = 3
neighbour (1,1): i = 16, value 50 → r = 120, n = 4
```

When the square is finished, `r` is 120 and `n` is 4, ready for step 7 to divide them.

### Step 7: write the average

```js
const o = (y * width + x) * 4;
out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = pixels[o + 3];
```

Once the whole square has been added up, this finds where the *centre* pixel `(x, y)` sits in `out`, using the same index sum as step 6. It stores the three averages there. Alpha (transparency) is copied across unchanged. The division often gives a fraction such as 100 / 3 = 33.33. `Uint8ClampedArray` rounds it to a whole number (33) and keeps every value between 0 and 255.

### Step 8: return the result

```js
return out;
```

After every pixel has been visited, `out` holds the whole blurred photo.

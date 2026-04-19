# Circular Progress Bar with SVG Circle

## How it works

An SVG `<circle>` has two key stroke properties that make this possible:

- **`stroke-dasharray`** — sets the length of dashes in the stroke pattern
- **`stroke-dashoffset`** — shifts the start of the dash pattern along the stroke

By setting `stroke-dasharray` equal to the circle's circumference, the entire stroke becomes one single dash. Then adjusting `stroke-dashoffset` controls how much of that dash is visible — which creates the progress effect.

## The math

```
circumference = 2 × π × radius
```

To show `p%` progress:

```
stroke-dashoffset = circumference × (1 - p / 100)
```

- Offset `0` → full circle (100%)
- Offset = circumference → nothing shown (0%)

## Basic HTML + CSS example

```html
<svg width="120" height="120" viewBox="0 0 120 120">
  <!-- Background track -->
  <circle
    cx="60" cy="60" r="54"
    fill="none"
    stroke="#e6e6e6"
    stroke-width="12"
  />

  <!-- Progress arc -->
  <circle
    cx="60" cy="60" r="54"
    fill="none"
    stroke="#4f46e5"
    stroke-width="12"
    stroke-linecap="round"
    stroke-dasharray="339.29"
    stroke-dashoffset="84.82"
    transform="rotate(-90 60 60)"
  />
</svg>
```

**Breakdown:**
- `r="54"` → circumference = `2 × π × 54 ≈ 339.29`
- `stroke-dashoffset="84.82"` → `339.29 × (1 - 0.75) = 84.82` (75% progress)
- `transform="rotate(-90 60 60)"` → starts the arc at 12 o'clock (top) instead of 3 o'clock (right)

## Animated with CSS

```css
.progress-ring {
  transition: stroke-dashoffset 0.5s ease;
}
```

```html
<circle
  class="progress-ring"
  cx="60" cy="60" r="54"
  fill="none"
  stroke="#4f46e5"
  stroke-width="12"
  stroke-dasharray="339.29"
  stroke-dashoffset="339.29"
/>
```

```js
const circle = document.querySelector('.progress-ring');
const radius = 54;
const circumference = 2 * Math.PI * radius;

function setProgress(percent) {
  const offset = circumference * (1 - percent / 100);
  circle.style.strokeDashoffset = offset;
}

setProgress(75);
```

## React component example

```tsx
type Props = {
  percent: number;   // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
};

export function CircularProgress({
  percent,
  size = 120,
  strokeWidth = 12,
  color = '#4f46e5',
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke="#e6e6e6"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}
```

```tsx
<CircularProgress percent={75} />
```

## Key properties reference

| Property | Purpose |
|---|---|
| `stroke-dasharray` | Set to circumference — makes the whole stroke one dash |
| `stroke-dashoffset` | Controls how much is hidden; drives the progress value |
| `stroke-linecap="round"` | Rounds the ends of the arc |
| `transform="rotate(-90)"` | Rotates start point to 12 o'clock |
| `fill="none"` | Removes the circle's fill so only the stroke shows |

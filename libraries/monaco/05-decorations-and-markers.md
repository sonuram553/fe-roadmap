# Lesson 5 — Decorations and markers

Level: intermediate. Two ways to draw on top of the text without changing it: decorations for anything you like, markers for errors and warnings.

## 1. Chalk marks on the script

Priya's playground runs queries against a real database, and the server sends back hints: this join is slow, this table is huge. She wants to show them *on* the text: a yellow band on the slow line, a dot in the margin, a tooltip on the table name. None of that should change the text itself.

That is what a **decoration** is: a style attached to a range. Think of it as a chalk mark or a highlighter stroke on the script. It is not part of the words, but it is attached to them, and if a line is added above, the mark moves down with its line.

Decorations are styled with your own CSS classes, so Priya adds some styles first:

```css
.slow-line  { background: rgba(255, 200, 0, 0.25); }
.slow-glyph { background: orange; border-radius: 50%; }
.table-name { text-decoration: underline dotted; }
```

Then she attaches them:

```js
const editor = monaco.editor.create(container, { model, glyphMargin: true });

const hints = editor.createDecorationsCollection([
  {
    range: new monaco.Range(3, 1, 3, 1),
    options: {
      isWholeLine: true,
      className: 'slow-line',
      glyphMarginClassName: 'slow-glyph',
      glyphMarginHoverMessage: { value: '**Slow join** — no index on `orders.user_id`' },
    },
  },
  {
    range: new monaco.Range(2, 6, 2, 12),
    options: {
      inlineClassName: 'table-name',
      hoverMessage: { value: 'Table `orders` · 1.2M rows' },
    },
  },
]);
```

The query was:

```
SELECT *
FROM orders
JOIN users ON users.id = orders.user_id
WHERE total > 100;
```

The options that matter most:

- `className` styles the range's *background area*. With `isWholeLine: true` it covers the full width of the line, which is how you get a highlighted band.
- `inlineClassName` styles the *text itself* in the range: colour, underline, font weight.
- `glyphMarginClassName` puts an element in the **glyph margin**, the narrow strip left of the line numbers where VS Code shows breakpoints. The margin is hidden unless the editor has `glyphMargin: true`.
- `hoverMessage` and `glyphMarginHoverMessage` show a tooltip. The `value` is Markdown, so `**bold**` and `` `code` `` work.

There are more, all under `IModelDecorationOptions` in `monaco.d.ts`: `minimap` and `overviewRuler` put a coloured mark in the minimap and scrollbar, and `before`/`after` inject text that is displayed but not part of the model, which is how "ghost" labels like inline type hints are drawn.

## 2. Decorations follow the text

`getRanges()` reports where the decorations are now:

```
[ '[3,1 -> 3,1]', '[2,6 -> 2,12]' ]
```

Priya then inserted a comment line `-- report` at the very top. Both decorations moved down a line on their own:

```
[ '[4,1 -> 4,1]', '[3,6 -> 3,12]' ]
```

So she never has to recompute decoration positions after an edit. The model tracks them.

The interesting case is typing *right at the edge* of a decoration. Should the new text join the highlighted range or not? That is the decoration's **stickiness**. The default is "always grow". An inline decoration covered columns 4–10, and typing `XX` at column 10 stretched it to `[1,4 -> 1,12]`. For a table-name underline that is wrong: typing a space after `orders` should not extend the underline. So she sets:

```js
options: {
  inlineClassName: 'table-name',
  stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
}
```

With that, typing `YY` at the end of a `[1,4 -> 1,12]` decoration left it at `[1,4 -> 1,12]`.

## 3. Replacing and clearing

A decorations collection is a group Priya can manage as a whole. Each time the server sends new hints she calls `set`, which swaps the old decorations for the new ones in one go:

```js
hints.set(newHintsFromServer.map(toDecoration));
hints.clear();              // remove them all
hints.append([oneMore]);    // add without removing
```

Keep one collection per *kind* of decoration (one for server hints, one for search highlights, and so on), so clearing one kind never wipes another. Older code uses `editor.deltaDecorations(oldIds, newDecorations)` and juggles the returned id strings by hand. It still works on the model, but the editor version is marked `@deprecated` in favour of `createDecorationsCollection`.

## 4. Markers: the director's notes

Errors and warnings are special enough to have their own system: **markers**. A marker is a problem report: a range, a message, and a severity. Monaco draws them as the familiar squiggly underlines, shows the message on hover, marks them in the scrollbar, and lets the user jump between them with `F8`. If decorations are chalk marks, markers are the **director's notes** in red pen: "this line doesn't work".

Priya writes a small linter for her team's SQL style rules and reports its findings like this:

```js
monaco.editor.setModelMarkers(model, 'priya-lint', [
  {
    startLineNumber: 1, startColumn: 8, endLineNumber: 1, endColumn: 9,
    message: 'Avoid SELECT * — list the columns you need',
    severity: monaco.MarkerSeverity.Warning,
    code: 'no-star',
  },
  {
    startLineNumber: 4, startColumn: 7, endLineNumber: 4, endColumn: 12,
    message: 'Unknown column "total"',
    severity: monaco.MarkerSeverity.Error,
  },
]);
```

The page then had a yellow squiggle under `*` and a red one under `total`. The DOM classes were `squiggly-warning` and `squiggly-error`. The severity values are plain numbers:

```
{ Hint: 1, Info: 2, Warning: 4, Error: 8 }
```

Note that `setModelMarkers` is on `monaco.editor`, not on an editor instance, and it takes a model. Markers belong to the script, so every editor showing that model shows the same squiggles.

## 5. The owner string

The second argument, `'priya-lint'`, is the **owner**. Each call *replaces all markers from that owner* on that model, and leaves other owners alone. Priya set one marker from `'other-owner'`, then cleared hers with an empty list:

```js
monaco.editor.setModelMarkers(model, 'priya-lint', []);
monaco.editor.getModelMarkers({ resource: model.uri }).map((m) => m.owner + ': ' + m.message);
// [ 'other-owner: from other' ]
```

Only her markers went. This matters because Monaco's own language services also post markers, under owners like `'javascript'` and `'json'` ([lesson 9](09-built-in-language-services.md) §2). Using your own owner name means your linter and theirs never overwrite each other. `getModelMarkers` reads markers back, filtered by `owner`, `resource` (a model URI), or both.

## 6. Markers are a snapshot

Here is a detail that surprises people. Priya set a warning at `1:8`, then inserted two lines at the top of the model. On screen, the squiggle moved down with its text, exactly two lines. But the stored marker didn't:

```
{ squiggleMovedLines: 2, storedMarker: [ '1:8' ] }
```

The squiggle is drawn with a decoration, so it follows the text (§2). The marker record itself is just the data you handed over, and it still says line 1. Markers are a snapshot of "what the linter thought last time it ran". The fix is to re-run the check whenever the text changes, with a short delay so it doesn't run on every keystroke:

```js
let timer;
model.onDidChangeContent(() => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    monaco.editor.setModelMarkers(model, 'priya-lint', lintSql(model.getValue()));
  }, 300);
});
```

That is the whole shape of a custom linter in Monaco: listen, wait, check, replace this owner's markers.

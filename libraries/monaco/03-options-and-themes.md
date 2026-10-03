# Lesson 3 — Options and themes

Level: beginner. How to change what the editor looks like and how it behaves, and the one surprise in how themes work.

## 1. Options at creation time

The second argument to `monaco.editor.create` takes far more than `value` and `language`. These are the ones Priya actually uses in her playground:

```js
const editor = monaco.editor.create(container, {
  model,
  automaticLayout: true,
  fontSize: 14,
  fontFamily: 'JetBrains Mono, monospace',
  minimap: { enabled: false },       // the zoomed-out code map on the right
  lineNumbers: 'on',                 // 'on' | 'off' | 'relative'
  wordWrap: 'on',                    // wrap long lines instead of scrolling sideways
  scrollBeyondLastLine: false,       // don't allow scrolling past the end into empty space
  renderLineHighlight: 'line',       // highlight the line the cursor is on
  placeholder: 'Write a query and press Cmd+Enter',
});
```

The full list is the `IStandaloneEditorConstructionOptions` interface in `node_modules/monaco-editor/monaco.d.ts`. That file is the real documentation. Every option has a comment above it saying what it does and what the default is.

## 2. Changing options later

The page has a font-size slider and a "read only" switch, so options must change after the editor exists. That is what `updateOptions` is for. It takes the same object shape, and only changes the keys you pass:

```js
editor.updateOptions({ fontSize: 18, minimap: { enabled: false }, readOnly: true });
```

To read an option back, use `getOption` with a value from the `EditorOption` enum:

```js
const O = monaco.editor.EditorOption;
editor.getOption(O.fontSize);          // 12 before, 18 after
editor.getOption(O.minimap).enabled;   // false
```

The default font size was `12`. After `updateOptions` it was `18`, and a second editor on the same page still said `12`. Options belong to one stage, not the whole theatre. (Themes, in §3, are the exception.)

With `readOnly: true`, the editor still lets you select, copy and search, but typing does nothing. Priya clicked in and typed `x`. The text stayed `SELECT 1;`, and a small tooltip appeared under the cursor saying **Cannot edit in read-only editor**. The `readOnlyMessage` option replaces that text if she wants something friendlier, like "This query is shared. Duplicate it to edit."

## 3. Themes are global

Monaco ships with three themes: `'vs'` (light), `'vs-dark'`, and `'hc-black'` (high contrast; there is also `'hc-light'`). You can pick one with the `theme` option. Priya put two editors on one page, the first with `theme: 'vs'` and the second with `theme: 'vs-dark'`, and read their background colours:

```
{ box: 'rgb(30, 30, 30)', box2: 'rgb(30, 30, 30)' }
```

Both dark. The first editor's `theme: 'vs'` was ignored. This is the surprise: **there is only one theme for the whole page**. The theatre has one lighting desk. Whichever stage asked for lighting most recently set it for every stage in the building. The same thing happened with `editor.updateOptions({ theme: 'vs' })` on one editor: the other editor turned light too.

Because of that, it is clearer to treat the theme as a page-level setting and set it in one place:

```js
monaco.editor.setTheme('vs-dark');
```

Priya's playground has a light/dark toggle in the header that calls `setTheme`, and none of her editors pass a `theme` option at all.

One more trap: an unknown theme name does not throw. `monaco.editor.setTheme('nope')` silently fell back to the light theme (background `rgb(255, 255, 254)`). If your custom theme "isn't applying", check the name for typos.

## 4. Making your own theme

Priya's company has brand colours, so she defines a theme called `priya-night`:

```js
monaco.editor.defineTheme('priya-night', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
    { token: 'number', foreground: 'f1fa8c' },
    { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#1e1b2e',
    'editor.lineHighlightBackground': '#2a2640',
  },
});
monaco.editor.setTheme('priya-night');
```

A theme has two halves, and they colour different things.

`rules` colour the **text**. Each rule names a token type. A **token** is one piece of the text that the language's tokenizer has labelled: `SELECT` is labelled `keyword`, `100` is labelled `number`, and so on. ([Lesson 7](07-a-custom-language.md) shows how those labels are produced, and how to invent your own.) Colours are hex without the `#`. `fontStyle` can be `'bold'`, `'italic'`, `'underline'`, or several separated by spaces.

`colors` colour the **editor's own interface**: background, current-line highlight, selection, gutter, scrollbars, the suggestion popup. The keys are the same ones VS Code uses for its colour themes, such as `editor.background`, `editor.selectionBackground` and `editorLineNumber.foreground`. Colours here keep their `#`.

`base` says which built-in theme to start from, and `inherit: true` means "keep everything from the base that I didn't override". Without `inherit`, any token you didn't write a rule for falls back to the plain text colour.

After `setTheme('priya-night')`, both editors changed background to `rgb(30, 27, 46)`, which is `#1e1b2e`. Inspecting the word `SELECT` in the page:

```
{ text: 'SELECT', cls: 'mtk12 mtkb', color: 'rgb(255, 121, 198)', weight: '700' }
```

Monaco does not put inline colours on each word. It turns the theme into a small set of CSS classes (`mtk12` is "colour number 12", `mtkb` is bold) and tags every token with them. That is part of why it stays fast with very large files, and also why you should change colours through `defineTheme` rather than by writing CSS that targets those class names, which change from theme to theme.

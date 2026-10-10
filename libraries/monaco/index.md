# Monaco editor lessons

A beginner-to-intermediate course on the `monaco-editor` npm package, written against version 0.57.0 with Vite. Every output quoted in the lessons comes from actually running the code in Chrome.

The lessons follow Priya building a query playground for SQL and a small log-search language, LogQ, and they build on each other, so read them in order.

**Beginner**

1. [Your first Monaco editor](01-first-editor.md): installing, worker setup, container sizing, resizing, disposing
2. [Models, URIs and tabs](02-models-and-tabs.md): the model/editor split, tabs, view state, who cleans up
3. [Options and themes](03-options-and-themes.md): `updateOptions`, read-only, why themes are global, `defineTheme`
4. [Reading and changing text](04-reading-and-editing-text.md): positions, change events, `executeEdits` vs `setValue`, undo stops

**Intermediate**

5. [Decorations and markers](05-decorations-and-markers.md): highlights, glyphs, hover messages, error squiggles
6. [Actions, commands and keyboard shortcuts](06-actions-and-keybindings.md): `addAction`, context keys, the `addCommand` trap
7. [Teaching Monaco a new language](07-a-custom-language.md): Monarch tokenizers, theme rules, language configuration
8. [Autocomplete and hover for your own language](08-completion-and-hover.md): providers, ranges, snippets
9. [Configuring the built-in languages](09-built-in-language-services.md): JS/TS diagnostics, `addExtraLib`, JSON schemas
10. [The diff editor](10-diff-editor.md): comparing two models, reading changes, inline vs side by side
11. [Monaco inside React](11-monaco-in-react.md): StrictMode, the controlled-value trap, a working wrapper
12. [Keeping the bundle small](12-bundle-size.md): real build sizes, lazy loading, picking features and languages

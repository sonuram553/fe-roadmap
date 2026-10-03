# Lesson 4 — Reading and changing text

Level: beginner to intermediate. How to find your way around the text, react to changes, and change it from code without breaking undo.

## 1. Positions and ranges start at 1

Every place in the text is a **position**: a line number and a column. Both start at **1**, not 0. Column 1 is *before* the first character. So in `SELECT name`, column 8 is the gap just before the `n`.

A **range** is a start position and an end position. `new monaco.Range(1, 8, 1, 12)` means "line 1 column 8 up to line 1 column 12". Priya's test model:

```
SELECT name
FROM users
WHERE age > 30;
```

```js
model.getLineCount();                                   // 3
model.getLineContent(2);                                // 'FROM users'
model.getValueInRange(new monaco.Range(1, 8, 1, 12));   // 'name'
model.getFullModelRange().toString();                   // '[1,1 -> 3,16]'
```

The 1-based counting catches everyone coming from JavaScript strings. Asking for line 0 throws:

```
Illegal value for lineNumber
```

Sometimes you need a plain character index into the string instead, for example when an error message from a server says "error at character 12". The model converts both ways:

```js
model.getOffsetAt({ lineNumber: 2, column: 1 });   // 12
model.getPositionAt(12);                           // { lineNumber: 2, column: 1 }
```

Offsets *are* 0-based, like string indexes. `SELECT name` is 11 characters plus one newline, so line 2 starts at offset 12.

One more helper Priya uses a lot. `getWordAtPosition` finds the word under a position, which is how you answer "what did the user click on":

```js
model.getWordAtPosition({ lineNumber: 2, column: 8 });
// { word: 'users', startColumn: 6, endColumn: 11 }
```

## 2. Cursors and selections

Positions and ranges are about the script. The cursor is about the stage, so it lives on the editor:

```js
editor.getPosition();                                       // where the cursor is
editor.setPosition({ lineNumber: 1, column: 1 });
editor.setSelection(new monaco.Selection(1, 1, 1, 7));
model.getValueInRange(editor.getSelection());               // 'SELECT'
editor.revealLineInCenter(40);                              // scroll so line 40 is visible
```

A `Selection` is a range with a direction (which end the cursor is on). Positions outside the text are clamped rather than rejected. On a three-line model, `setPosition({ lineNumber: 99, column: 99 })` put the cursor at `3:6`, the end of the last line.

## 3. Listening for changes

Priya wants an "unsaved" dot on each tab, which means knowing when the text changes. The model fires `onDidChangeContent`, and the editor has a matching `onDidChangeModelContent` that follows whichever model it is showing. Here is the event after replacing `name` with `email`:

```js
model.onDidChangeContent((e) => console.log(e));
```

```
{
  changes: [{ range: '1:8-1:12', text: 'email', rangeLength: 4 }],
  versionId: 2,
  isUndoing: false,
  isFlush: false
}
```

(Ranges are printed short here to keep the output readable.) `changes` says exactly what happened: "the 4 characters at 1:8–1:12 were replaced with `email`". Most of the time you ignore the details and just call `model.getValue()`, but the details matter when you are sending edits to a server or keeping another copy of the text in sync.

`versionId` goes up by one on every change, including undo. `isUndoing` tells you the change came from undo. `isFlush` tells you the whole text was replaced at once, which is what `setValue` does (§4).

Every listener in Monaco returns a **disposable**: an object with a `dispose()` method that removes the listener. Keep it, and call it when you are done, the same way you would call `removeEventListener`:

```js
const sub = editor.onDidChangeModelContent(() => markTabDirty());
// later
sub.dispose();
```

## 4. Changing text: three ways, one of them destructive

**`setValue` replaces everything and wipes undo.** It is the simplest:

```js
model.setValue('SELECT 1;');
```

Afterwards the change event had `isFlush: true`, and pressing undo did nothing. The old text was gone from history. That is right for "load a different file into this model", and wrong for anything the user might want to undo.

**`executeEdits` makes an edit the user can undo.** It is on the editor, and it takes a list of edits, each a range plus replacement text:

```js
editor.executeEdits('priya-toolbar', [
  { range: new monaco.Range(1, 8, 1, 12), text: 'email' },
]);
```

The text became `SELECT email`, and undo brought back `SELECT name`, with `isUndoing: true` on the event. The first argument, `'priya-toolbar'`, is a free-form source label. Monaco doesn't use it, but it helps when debugging. To insert without replacing, use an empty range (start equals end). To delete, use empty `text`.

**`model.pushEditOperations` does the same from the model side**, for code that has a model but no editor:

```js
model.pushEditOperations(
  [],                                                   // selections before the edit
  [{ range: model.getFullModelRange(), text: 'SELECT 2;' }],
  () => null,                                           // selections after the edit
);
```

The text became `SELECT 2;` and undo brought back `SELECT 1;`. This is how you replace *all* the text while keeping undo: a single edit whose range is the full model.

## 5. Undo steps

Priya adds a "comment out" button that makes two edits in a row. Pressing undo once reverted *both*:

```js
editor.executeEdits('a', [{ range: new monaco.Range(1, 10, 1, 10), text: ' -- one' }]);
editor.executeEdits('a', [{ range: new monaco.Range(1, 17, 1, 17), text: ' two' }]);
// undo → 'SELECT 1;'
```

Monaco merges consecutive edits into one undo step until something marks a boundary. That boundary is an **undo stop**. Typing and moving the cursor create them automatically. From code, you add one with `pushUndoStop`:

```js
editor.executeEdits('a', [{ range: new monaco.Range(1, 10, 1, 10), text: ' -- one' }]);
editor.pushUndoStop();
editor.executeEdits('a', [{ range: new monaco.Range(1, 17, 1, 17), text: ' two' }]);
// undo → 'SELECT 1; -- one'
```

Now undo only removed ` two`. The rule of thumb: call `pushUndoStop()` before and after any edit your code makes, so it never merges into whatever the user typed just before or after it. [Lesson 11](11-monaco-in-react.md) §4 shows the bug you get when you forget the "before" one.

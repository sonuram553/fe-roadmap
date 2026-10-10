# Lesson 10 — The diff editor

Level: intermediate. How to show what changed between two versions of a query, the way VS Code does for Git changes.

## 1. Two stages side by side

Queries in Priya's playground can be saved and shared. When someone edits a shared query, they want to see what they changed before overwriting it. That is a **diff**: the old version and the new one, with removed lines in red and added lines in green.

Monaco has a diff editor built in. In theatre terms it is **two stages side by side**, one performing the saved script and one performing the draft, with the differences lit up. Under the hood that is exactly what it is: two ordinary editors plus a component that works out the differences (in a worker) and draws them.

## 2. Creating one

A diff editor shows two models, so Priya creates both:

```js
const original = monaco.editor.createModel(
  'SELECT *\nFROM orders\nWHERE total > 100;',
  'sql',
  monaco.Uri.parse('file:///saved/q.sql'),
);
const modified = monaco.editor.createModel(
  'SELECT id, total\nFROM orders\nWHERE total > 100\nORDER BY total DESC;',
  'sql',
  monaco.Uri.parse('file:///draft/q.sql'),
);

const diff = monaco.editor.createDiffEditor(container, { automaticLayout: true });
diff.setModel({ original, modified });
```

`createDiffEditor` takes a container and options like `create`, but there is no `value` shortcut: you always pass a pair of models with `setModel`. The two models need different URIs, as always ([lesson 2](02-models-and-tabs.md) §2).

The two stages are real editors, and you can reach them:

```js
diff.getOriginalEditor();   // left side, readOnly: true
diff.getModifiedEditor();   // right side, readOnly: false
```

The original side is read-only by default and the modified side is editable, which fits the "review my draft" case: the user can keep fixing the draft while looking at the diff. `originalEditable: true` makes the left side editable too. The page's editor count reflects the two stages: `monaco.editor.getEditors()` returned 2 and `monaco.editor.getDiffEditors()` returned 1.

## 3. Reading the changes

Priya wants a "2 changes" label above the diff. `getLineChanges()` returns the list, but calling it right after `setModel` gave:

```
null
```

Computing a diff happens in a worker, so the answer isn't ready yet. The diff editor fires `onDidUpdateDiff` when it is:

```js
diff.onDidUpdateDiff(() => {
  const changes = diff.getLineChanges();
  label.textContent = `${changes.length} changes`;
});
```

For Priya's two versions, the changes were:

```
{ orig: '1-1', mod: '1-1', chars: 1 }   SELECT *  →  SELECT id, total
{ orig: '3-3', mod: '3-4', chars: 1 }   WHERE ... ;  →  WHERE ... + ORDER BY ...
```

Each change says which lines of the original were replaced by which lines of the modified side, and `charChanges` narrows it down to the exact characters inside those lines, which is how Monaco draws the darker highlight on just `*` versus `id, total`. The event fires again whenever either side is edited. Priya removed the `ORDER BY` line in the modified editor, and after the next update `getLineChanges()` had one entry instead of two.

To move between changes from a toolbar, use `diff.goToDiff('next')` and `diff.goToDiff('previous')`. From the top of the file, the first `next` moved the cursor to line 3, the second change, because line 1 was already inside the first one. The next `next` wrapped round to line 1.

## 4. Side by side or inline

By default the two versions sit side by side. Priya's first screenshot didn't look like that. It showed a single column, with each removed line in red directly above its replacement in green:

```
1  −  SELECT *
   1+ SELECT id, total
2  2  FROM orders
3  −  WHERE total > 100;
   3+ WHERE total > 100
   4+ ORDER BY total DESC;
```

Her test container was 800 pixels wide, and the diff editor switches itself to **inline** view when it is narrower than `renderSideBySideInlineBreakpoint`, which is 900 pixels by default. Two 400-pixel editors side by side would be too cramped to read. The relevant options:

```js
diff.updateOptions({
  renderSideBySide: false,                 // always inline, whatever the width
  useInlineViewWhenSpaceIsLimited: false,  // or: always side by side, even when narrow
  renderSideBySideInlineBreakpoint: 700,   // or: move the switching point
});
```

Priya gives users a toggle that flips `renderSideBySide`, and leaves the automatic switch on for phones and narrow panels.

## 5. Cleaning up

A diff editor is disposed like any editor, and the rule from [lesson 2](02-models-and-tabs.md) §5 applies: models you created are yours. After `diff.dispose()`:

```
{ orig: false, mod: false, models: 2 }
```

Neither model was disposed, and both were still in the model list. That is usually what you want (the draft should survive closing the diff view), but when the diff panel really is done, dispose `original` and `modified` yourself.

# Lesson 6 — Actions, commands and keyboard shortcuts

Level: intermediate. How to add a "Run query" shortcut, put it in the right-click menu and the command palette, and switch it on and off.

## 1. Cues

Every playground needs a Run button, and every developer expects `Cmd+Enter` (or `Ctrl+Enter` on Windows and Linux) to do the same thing. In Monaco, a named thing the user can trigger is an **action**. In the theatre, an action is a **cue**: it has a name in the prompt book, it can be called by a signal (a key), and anyone on the crew can call it by name.

Monaco already has well over a hundred actions built in. Priya's editor listed 129 through `editor.getSupportedActions()`. Two she uses from her own toolbar buttons:

```js
editor.getAction('editor.action.formatDocument').run();   // label: 'Format Document'
editor.getAction('editor.action.commentLine').run();      // label: 'Toggle Line Comment'
```

The easiest way to discover action ids is the command palette: press `F1` in any Monaco editor, and every action is listed by its label.

## 2. Adding your own action

```js
const runAction = editor.addAction({
  id: 'priya.runQuery',
  label: 'Run Query',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
  contextMenuGroupId: 'navigation',
  contextMenuOrder: 1,
  run: (ed, ...args) => {
    runQuery(ed.getValue(), args);
  },
});
```

One call gives Priya three ways in:

**A keyboard shortcut.** A keybinding is a number built by OR-ing modifier flags with a key code. `KeyMod.CtrlCmd` means Cmd on a Mac and Ctrl elsewhere, so one binding works on every platform. Other modifiers are `KeyMod.Shift`, `KeyMod.Alt` and `KeyMod.WinCtrl` (the real Ctrl key, even on a Mac). Pressing `Cmd+Enter` called `run`, with no extra arguments:

```
run: SELECT 1; args=[]
```

**The right-click menu.** `contextMenuGroupId: 'navigation'` puts it in the top group of the context menu, and `contextMenuOrder` sorts it within the group. Right-clicking showed:

```
[ 'Run Query', 'Change All Occurrences', 'Cut', 'Copy', 'Paste', 'Command Palette' ]
```

Leave out `contextMenuGroupId` and the action stays out of the menu.

**The command palette.** Every action is listed there automatically. Typing `Run Q` after `F1` showed `Run Query, Command+Enter`, with the shortcut beside it.

And of course Priya's toolbar button can call it by id. Any arguments she passes arrive after the editor:

```js
editor.getAction('priya.runQuery').run('from-toolbar');
// run: SELECT 1; args=["from-toolbar"]
```

## 3. Your shortcut replaces the built-in one

`Cmd+Enter` was not free. Monaco already binds it to "Insert Line Below". Priya's action took it over while it existed. `addAction` returns a disposable, and after `runAction.dispose()`, pressing `Cmd+Enter` inserted a new line again. The built-in came back.

This is usually what you want, but check before picking a shortcut. `Cmd+F` (Find), `Cmd+D` (Add Selection to Next Find Match), `Cmd+/` (Toggle Line Comment) and `F1` all already do something in Monaco. `Cmd+S` does not: Monaco has no idea what saving means, so without your own action the key goes to the browser, which offers to save the web page. The command palette shows the current binding next to each action, so it is a quick way to see what you are about to cover up.

## 4. Switching an action on and off with context keys

Priya adds a "Save Query" action on `Cmd+S`, but it should only work when there is something to save. Monaco's way of saying "only when" is a **context key**: a named true/false value that lives on the editor, which actions can check before running.

```js
const isDirty = editor.createContextKey('priyaQueryDirty', false);

editor.addAction({
  id: 'priya.save',
  label: 'Save Query',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
  precondition: 'priyaQueryDirty',
  run: () => {
    saveQuery(editor.getValue());
    isDirty.set(false);
  },
});

editor.onDidChangeModelContent(() => isDirty.set(true));
```

`precondition` is an expression over context keys. When it is false, the shortcut does nothing and the action disappears from the command palette. Priya searched the palette for `Save Query` on a fresh editor and got no results; after `isDirty.set(true)` the same search showed `Save Query, Command+S`. Pressing `Cmd+S` behaved the same way: nothing on a fresh editor, and after typing one space the action ran.

Preconditions can combine keys, as in `'priyaQueryDirty && !editorReadonly'`. Monaco maintains many keys of its own, such as `editorReadonly`, `editorHasSelection` and `editorTextFocus`, and you can use them in the same expressions.
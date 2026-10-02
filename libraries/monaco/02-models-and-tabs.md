# Lesson 2 — Models, URIs and tabs

Level: beginner. This is the most important idea in Monaco. Once it clicks, most of the API makes sense.

## 1. The script and the stage

Priya's playground needs tabs: one editor box, and three queries (`users`, `orders`, `report`) that the user clicks between. With only what [lesson 1](01-first-editor.md) covered, she would keep each tab's text in her own variables and swap it in on every click:

```js
const texts = { users: 'SELECT ...', orders: 'SELECT ...', report: 'SELECT ...' };

function openTab(name) {
  texts[current] = editor.getValue();   // save the old tab's text
  editor.setValue(texts[name]);         // load the new one
  current = name;
}
```

It looks fine, but every click quietly throws things away. `setValue` wipes the undo history ([lesson 4](04-reading-and-editing-text.md) §4), so if you edit `users`, look at `orders` and come back, Cmd+Z does nothing. Error squiggles are attached to the text, so they are lost too, unless she saves and re-applies them on every switch. If one tab is SQL and another JSON, she has to change the language by hand each time. And a string sitting in her `texts` object is invisible to Monaco, so TypeScript can never resolve an `import` from one tab into another.

To fix all of that, she would end up writing a small "file" object for each tab, holding its text, language, undo history and errors, and keeping it alive while the tab is hidden. Monaco already has that object built in. It is called a model.

In lesson 1 Priya passed `value: '...'` straight to `monaco.editor.create`, which hid this. Monaco actually splits an editor into two separate objects:

- A **model** holds the text. It also knows the text's language, its undo history, and a name (a URI, see §2). It has no idea whether anyone is looking at it.
- An **editor** is the visible box on the page. It shows one model at a time, and it owns the things that are about *viewing*: the cursor, the selection, the scroll position, which blocks are folded.

In theatre terms, the model is the **script** and the editor is the **stage**. A script exists whether or not it is being performed. A stage performs one script at a time, and between scenes it can put one script down and pick up another. Two stages could even perform the same script at once, and a line changed on one would change on both, because there is only one script.

When you pass `value` to `create`, Monaco quietly writes a script for you. Priya is about to build tabs, so she needs to write her own.

## 2. Creating models and naming them

```js
const usersQuery = monaco.editor.createModel(
  'SELECT * FROM users;',
  'sql',
  monaco.Uri.parse('file:///queries/users.sql'),
);
```

The three arguments are the text, the language id, and a URI. A **URI** is an address in the same shape as a web URL. Here it is just a name. `file:///queries/users.sql` does not have to exist anywhere. Monaco uses it as the model's unique identity, like a file path in a pretend file system.

Printing what Monaco made:

```
{ uri: 'file:///queries/users.sql', lang: 'sql', id: '$model1' }
```

Because the URI is an identity, two models cannot share one. Priya tried:

```
ModelService: Cannot add model because it already exists!
```

That same identity lets her find a model again later without keeping a reference to it. `monaco.editor.getModel(monaco.Uri.parse('file:///queries/users.sql'))` returned the very same object (`lookup: true`). And `monaco.editor.getModels()` lists every model that exists.

The URI also does work for you. If Priya leaves out the language, Monaco guesses it from the file extension:

```js
monaco.editor.createModel('{"a": 1}', undefined, monaco.Uri.parse('file:///config/settings.json'));
// getLanguageId() → 'json'
monaco.editor.createModel('hello', undefined, monaco.Uri.parse('file:///notes/todo.txt'));
// getLanguageId() → 'plaintext'
```

If she leaves out the URI too, Monaco names the model `inmemory://model/N`, counting up. That is fine for a throwaway editor. For anything real, pick URIs that look like file paths. The built-in language services rely on them: TypeScript uses them to resolve imports between models, and JSON uses them to decide which schema applies to which file ([lesson 9](09-built-in-language-services.md) §4).

## 3. Switching models: tabs

Priya's playground has a tab bar. Each tab is one query. She makes one editor, and one model per tab, and swaps the model when a tab is clicked:

```js
const editor = monaco.editor.create(container, { model: usersQuery, automaticLayout: true });

const ordersQuery = monaco.editor.createModel(
  'SELECT id FROM orders\nWHERE total > 100\nORDER BY id;',
  'sql',
  monaco.Uri.parse('file:///queries/orders.sql'),
);

editor.onDidChangeModel((e) => console.log(`${e.oldModelUrl} -> ${e.newModelUrl}`));

editor.setModel(ordersQuery); // user clicked the "orders" tab
```

Note `model:` instead of `value:` in the options. The editor now performs Priya's script instead of writing its own. `onDidChangeModel` fires on every swap:

```
file:///queries/users.sql -> file:///queries/orders.sql
file:///queries/orders.sql -> file:///queries/users.sql
```

Because the undo history lives in the model, it survives tab switches for free. Priya typed ` -- draft` at the end of the orders query, switched to users, switched back, and pressed undo. The text went from `SELECT id FROM orders; -- draft` to `SELECT id FROM orders; --`. Undo still knew what she had typed, even though another script had been on stage in between. (It removed one word rather than the whole comment because Monaco groups typing into undo steps roughly by word.)

## 4. Remembering where the cursor was

The cursor is not part of the script. It belongs to the stage. So switching tabs loses it. Priya put her cursor at column 8 of the users query, switched to orders and back:

```
cursor on users before switching:  1:8
cursor on orders after switching:  1:1
cursor back on users:              1:1
```

The actors' positions on stage were forgotten when the script was put down. To fix that, the editor can write down its **view state** before a swap and restore it afterwards. The view state is a plain object:

```
[ 'cursorState', 'viewState', 'contributionsState' ]
```

`cursorState` holds the cursors and selections, `viewState` the scroll position, and `contributionsState` the extras like folded regions. Priya keeps one per tab:

```js
const viewStates = new Map(); // uri string → view state

function openTab(model) {
  const current = editor.getModel();
  if (current) viewStates.set(current.uri.toString(), editor.saveViewState());

  editor.setModel(model);

  const saved = viewStates.get(model.uri.toString());
  if (saved) editor.restoreViewState(saved);
  editor.focus();
}
```

After `restoreViewState`, the cursor came back to `1:8`. The view state is plain JSON, so she could even keep it in `localStorage` to restore tabs across page reloads.

## 5. Who cleans up which model

[Lesson 1](01-first-editor.md) §6 showed that disposing an editor also disposes the model Monaco made for it. Models you created yourself are different. They are yours. Priya had five models open, disposed the editor, and counted:

```
models before editor.dispose(): 5
models after editor.dispose():  5
users model disposed?           false
```

The scripts outlived the stage, which is what you want: closing the editor panel should not destroy the user's queries. But it means a closed tab must dispose its own model, or it stays in memory forever and keeps its URI taken:

```js
function closeTab(model) {
  viewStates.delete(model.uri.toString());
  model.dispose();
}
```

After `model.dispose()` the count dropped from 5 to 4, and creating a new model with the old URI worked again. A good habit: whoever calls `createModel` is the one who calls `dispose` on it.

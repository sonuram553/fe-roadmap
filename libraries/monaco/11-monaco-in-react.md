# Lesson 11 — Monaco inside React

Level: intermediate. How to wrap Monaco in a React component without duplicate editors, a jumping cursor, or broken undo. Every behaviour below was run in React 19 with `StrictMode` on.

## 1. A building that rebuilds its rooms

React and Monaco think about the page in opposite ways. React owns its DOM: you describe what the page should look like, and React creates, updates and removes elements to match. Monaco is **imperative**: you call `create` on an element and from then on Monaco owns everything inside it, including the text, which changes on every keystroke without React knowing.

So far our stage machinery has been installed in a quiet building. React is a venue that knocks down and rebuilds rooms whenever it likes. The job of the wrapper component is to install the stage when its room is built, remove it cleanly when the room is knocked down, and keep React's idea of "the text" and Monaco's actual text from fighting.

## 2. The naive version, and StrictMode

Priya's first attempt:

```jsx
function NaiveEditor() {
  const boxRef = useRef(null);
  useEffect(() => {
    monaco.editor.create(boxRef.current, { value: 'SELECT 1;', language: 'sql' });
  }, []);
  return <div ref={boxRef} style={{ height: 120 }} />;
}
```

In development, the box contained **two** editors, stacked on top of each other, and the console showed:

```
Element already has context attribute
```

This is React's `StrictMode` doing its job. In development it runs every effect, runs its cleanup, and runs it again, to flush out effects that don't clean up after themselves. This effect has no cleanup, so the second run created a second editor in the same element. Monaco noticed its markings were already on the element and complained, then carried on anyway. Production builds don't double-run effects, so the bug would hide there, but the same thing happens for real whenever the component unmounts and mounts again (say, switching routes), and each time an editor is leaked.

## 3. Create in the effect, dispose in the cleanup

The fix is what [lesson 1](01-first-editor.md) §6 said about disposing, applied to React's lifecycle:

```jsx
useEffect(() => {
  const editor = monaco.editor.create(boxRef.current, { value, language: 'sql' });
  return () => editor.dispose();
}, []);
```

With that cleanup, the StrictMode double-run created an editor, disposed it, and created another, leaving exactly one in the box. Every listener created in the effect (`onDidChangeModelContent` and friends) should be disposed in the same cleanup.

## 4. The controlled-component trap

React developers expect inputs to be **controlled**: the parent holds the value in state, passes it down as a prop, and gets told about changes through `onChange`. Priya wired Monaco up the obvious way:

```jsx
function BadControlledEditor({ value, onChange }) {
  const boxRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = monaco.editor.create(boxRef.current, { value, language: 'sql' });
    editorRef.current = editor;
    const sub = editor.onDidChangeModelContent(() => onChange(editor.getValue()));
    return () => { sub.dispose(); editor.dispose(); };
  }, []);

  // keep the editor in sync with the prop
  useEffect(() => { editorRef.current?.setValue(value); }, [value]);

  return <div ref={boxRef} style={{ height: 120 }} />;
}
```

She put the cursor after `SELECT ` in `SELECT name FROM users;` and typed `id, `. The result:

```
value:  ' ,dSELECT iname FROM users;'
cursor: 1:1
```

Here is the loop. She typed `i`. Monaco inserted it and fired a change. `onChange` updated the parent's state. The new `value` prop came back down, and the sync effect called `setValue` with it. The text was identical, but `setValue` replaces the whole model ([lesson 4](04-reading-and-editing-text.md) §4), which resets the cursor to the start and wipes undo. So `d` went in at column 1, then the next round trip reset the cursor again, and so on. Each keystroke landed at the front.

## 5. A wrapper that works

The fix has two parts: only touch the editor when the prop really differs from what it already shows, and when you do, make an undoable edit instead of calling `setValue`. Here is the component Priya uses in the playground:

```jsx
function QueryEditor({ value, onChange, language = 'sql' }) {
  const boxRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const editor = monaco.editor.create(boxRef.current, { value, language, automaticLayout: true });
    editorRef.current = editor;
    const sub = editor.onDidChangeModelContent(() => onChangeRef.current(editor.getValue()));
    return () => {
      sub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, [language]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.getValue() === value) return;
    const model = editor.getModel();
    editor.pushUndoStop();
    editor.executeEdits('react-prop', [{ range: model.getFullModelRange(), text: value }]);
    editor.pushUndoStop();
  }, [value]);

  return <div ref={boxRef} style={{ height: 120 }} />;
}
```

The same typing test:

```
value:  'SELECT id, name FROM users;'
cursor: 1:12
```

When the user types, the prop that comes back equals the editor's text, so the sync effect returns early and never touches the editor. It only acts when the parent changes the value for its own reasons, like a "load example" button. For that, it replaces the full range with `executeEdits`, which the user can undo.

Priya tested that path too. After typing, the parent set the value to `SELECT * FROM orders;`, and then she pressed undo. Her first version of the component only called `pushUndoStop()` *after* the edit, and undo produced:

```
SELECT id,name FROM users;
```

The space she had typed last was missing. Without an undo stop *before* the edit, Monaco merged the prop change with her last keystroke into one undo step ([lesson 4](04-reading-and-editing-text.md) §5), and undo removed both. With the stop on both sides, undo gave back exactly `SELECT id, name FROM users;`, and because undo is also a content change, `onChange` reported that text to the parent's state too.

`onChangeRef` solves a different problem. The change listener is created once, when the editor is created. If it called the `onChange` prop directly, it would keep calling the function from the *first* render forever, and a parent that passes a new callback later (one that closes over newer state) would be ignored. Reading `onChangeRef.current` at call time always reaches the latest one, without re-creating the editor on every render.

The effect depends on `[language]` so that changing the language rebuilds the editor. An alternative that keeps undo history is to leave the editor alone and call `monaco.editor.setModelLanguage(editor.getModel(), language)` in its own effect.

## 6. Where to register languages and providers

Everything global goes **outside** components: `monaco.languages.register`, tokenizers, language configurations, completion and hover providers, themes, `MonacoEnvironment`. Put them in a module like `monaco-setup.js` that runs once when first imported. [Lesson 8](08-completion-and-hover.md) §7 showed that registering a provider twice doubles every suggestion. A provider registered inside a component's effect would be registered again on every mount, including StrictMode's deliberate second one.

## 7. What about `@monaco-editor/react`?

There is a popular wrapper package, `@monaco-editor/react` (4.7.0 at the time of writing), which gives you an `<Editor>` component that handles most of the above. It is a fine choice, with one thing to know: by default it does **not** use the `monaco-editor` you installed. Its loader fetches Monaco from a CDN, and the default path in `@monaco-editor/loader` 1.7.0 is:

```
https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs
```

That is a different, older version than the one in your `package.json`, downloaded at runtime from a third-party server. To make it use your own bundled copy, the version these lessons are written against, pass it to the loader once at startup:

```js
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

loader.config({ monaco });
```

You still need the worker setup from [lesson 1](01-first-editor.md) §2 in that case. Writing your own small wrapper like `QueryEditor` is also perfectly reasonable, and after this lesson you know every line in it.

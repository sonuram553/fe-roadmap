# Lesson 12 — Keeping the bundle small

Level: intermediate. Monaco is big. This lesson measures how big, then shows the two tools for dealing with it: loading it later, and loading less of it.

## 1. How big is "big"

Everything the theatre owns fits in one very large truck. Priya built the basic setup from [lesson 1](01-first-editor.md) §2 (`import * as monaco from 'monaco-editor'` plus the worker imports) with `vite build`. The first thing Vite said was:

```
(!) Some chunks are larger than 500 kB after minification.
```

The `dist` folder was 14 MB, with 94 files in `assets/`. The biggest ones:

```
file                      bytes       gzipped
index-*.js (editor)     4,026,695   1,010,938
ts.worker-*.js          6,928,898   1,483,201
css.worker-*.js         1,078,488
html.worker-*.js          743,540
json.worker-*.js          433,295
index-*.css               186,019
codicon-*.ttf             153,228   (the icon font)
```

The rest are small files, one per language tokenizer (`sql-*.js`, `python-*.js`, ...), loaded only when a model in that language is opened.

Not all of this reaches every visitor. Workers are fetched only when a model of their language opens, so someone who only writes SQL never downloads the 6.9 MB TypeScript worker. But the main editor chunk, about 1 MB after gzip ([what that means](../../javascript/6.%20networking/compression.md)), loads for everyone who sees an editor. Priya has two separate problems: the playground's home page shouldn't wait for Monaco at all, and the editor chunk itself carries features and languages she doesn't use.

## 2. Load it later

The query list, the sidebar and the login screen don't need Monaco. Only opening a query does. A dynamic `import()` tells the bundler to split Monaco into its own chunks and fetch them only when that line runs:

```js
// src/main.js
document.getElementById('open').addEventListener('click', async () => {
  const { monaco } = await import('./monaco-setup.js');
  monaco.editor.create(document.getElementById('editor'), { value: 'SELECT 1;', language: 'sql' });
});
```

`monaco-setup.js` is the file from [lesson 1](01-first-editor.md) §2, unchanged. It is important that *nothing* else imports `monaco-editor` statically. One stray `import * as monaco from 'monaco-editor'` in a shared file pulls it all back into the first chunk.

Priya built this and loaded the page in a browser, recording every file it fetched. Before clicking the button:

```
index-58T0xnjp.js   1,498 bytes
```

After clicking (sizes are bytes over the wire, compressed):

```
monaco-setup-*.js     322,926
editor.api-*.js       699,835
editor-*.css           14,611
monaco-setup-*.css     14,122
sql-*.js                4,010
```

The first page load went from over a megabyte to 1.5 KB. The cost moved to the moment the user asks for an editor. To hide even that, start the import early, for example when the mouse moves over the "Open" button, or once the page is idle. The import only runs once; later calls reuse the same module.

## 3. Load less: choosing features and languages

`import * as monaco from 'monaco-editor'` brings in every editor feature and every language. Since 0.56, the package has proper entry points for building a smaller editor from parts:

```js
// src/monaco-setup.js (trimmed)
import * as monaco from 'monaco-editor/editor';                      // the core, no features, no languages
import 'monaco-editor/features/find/register';                       // Cmd+F
import 'monaco-editor/features/suggest/register';                    // the suggestion popup
import 'monaco-editor/features/bracketMatching/register';
import 'monaco-editor/languages/definitions/sql/register';           // SQL tokenizer
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

export { monaco };
```

The pieces follow a pattern:

- `monaco-editor/editor` is the core: models, editors, the API, and nothing else.
- `monaco-editor/features/<name>/register` adds one editor feature. The names are the folder names under `node_modules/monaco-editor/esm/vs/features/`: `find`, `suggest`, `hover`, `folding`, `contextmenu`, `comment`, `multicursor`, `format`, `quickCommand` (the `F1` palette), 64 in all. `monaco-editor/features/register.all` adds them all.
- `monaco-editor/languages/definitions/<lang>/register` adds one language's registration and tokenizer. `.../definitions/register.all` adds all of them.
- `monaco-editor/languages/features/<lang>/register` adds a full language service ([lesson 9](09-built-in-language-services.md)) for `typescript`, `json`, `css` or `html`, and that service's worker then needs a branch in `getWorker` again.

Older tutorials import deep paths like `monaco-editor/esm/vs/basic-languages/sql/sql.contribution`. Those files no longer exist; use the entry points above.

Priya built the trimmed version:

```
file                      bytes       gzipped
index-*.js (editor)     2,866,651     723,787
editor.worker-*.js        303,930
index-*.css               105,372
sql-*.js                    8,840
```

The whole `dist` folder went from 14 MB to 3.1 MB, and the main chunk from 1,010,938 to 723,787 bytes gzipped. Notice what did *not* shrink much: the core itself is most of that 2.8 MB. Trimming removes features and languages around the editor, not the editor.

## 4. What a trimmed editor is missing

A trimmed editor is missing exactly what you didn't import, and nothing warns you about it. Priya checked what her trimmed build knew about:

```
languages:          [ 'plaintext', 'sql' ]
monaco.typescript:  undefined
find feature:       present
hover feature:      absent
```

Only SQL and plain text exist, so opening a `.json` model gives no colours. There is no TypeScript service, so `monaco.typescript.javascriptDefaults` would throw. And there is no hover feature, which is easy to miss: the decorations in [lesson 5](05-decorations-and-markers.md) §1 would still draw, but their `hoverMessage` tooltips would never appear, and neither would the hover provider from [lesson 8](08-completion-and-hover.md) §6. Nothing errors. The tooltip just doesn't show up.

So Priya builds her feature list from what the playground actually uses: find, suggest, hover, bracket matching, comment, context menu, the command palette, and her two languages. When something "stops working" after trimming, the first question is which `register` import it needs.

The two techniques stack. Priya's final playground loads a trimmed `monaco-setup.js` through a dynamic `import()`. The home page downloads nothing from Monaco, and the query editor downloads only the features she chose.

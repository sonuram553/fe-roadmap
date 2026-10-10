# Lesson 8 — Autocomplete and hover for your own language

Level: intermediate. How to make Monaco suggest LogQ keywords and field names, expand snippets, and explain a field when you hover over it.

## 1. Providers: the prompter in the wings

In [lesson 7](07-a-custom-language.md) Monaco learned what LogQ *looks like*. Now Priya wants it to help people write it: suggest `where` after `find errors`, list the fields you can filter on, explain what `latency_ms` means.

Monaco doesn't know any of that, and it doesn't try to. Instead it asks. When the user types, Monaco turns to whoever has registered to help with that language and says "the cursor is here, in this text; what could come next?". The helper answers with a list, and Monaco does all the drawing, filtering and inserting.

That helper is a **provider**. In the theatre it is the **prompter**: the person in the wings with the full script who whispers the next line when an actor hesitates. The prompter never walks on stage. They only answer when asked.

There is one `register...Provider` function per kind of help: completion, hover, signature help, go-to-definition, formatting, code actions, and more. All of them work the same way: you pass a language id and an object with a `provide...` method, and you get back a disposable.

## 2. A completion provider

Here is the one Priya wrote for LogQ:

```js
const FIELDS = {
  service: 'Name of the service that wrote the log line, e.g. "checkout".',
  status: 'HTTP status code of the request (number).',
  level: 'Log level: "debug", "info", "warn" or "error".',
  latency_ms: 'Request duration in milliseconds (number).',
};
const KEYWORDS = ['find', 'where', 'and', 'or', 'not', 'since', 'limit', 'sort', 'by', 'asc', 'desc'];

monaco.languages.registerCompletionItemProvider('logq', {
  triggerCharacters: [' '],

  provideCompletionItems(model, position, context) {
    const word = model.getWordUntilPosition(position);
    const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
    const before = model.getValueInRange(
      new monaco.Range(position.lineNumber, 1, position.lineNumber, word.startColumn),
    );
    const K = monaco.languages.CompletionItemKind;

    // Right after where/and/or/not/by, only field names make sense.
    if (/\b(where|and|or|not|by)\s+$/.test(before)) {
      return {
        suggestions: Object.entries(FIELDS).map(([name, doc]) => ({
          label: name, kind: K.Field, insertText: name, documentation: doc, range,
        })),
      };
    }

    return {
      suggestions: KEYWORDS.map((k) => ({ label: k, kind: K.Keyword, insertText: k, range })),
    };
  },
});
```

`provideCompletionItems` gets the model, the cursor position, and a context object, and returns `{ suggestions: [...] }`. It may also return a Promise of that, so fetching suggestions from a server is fine. Each suggestion is a `CompletionItem`. The fields Priya used:

- `label` is what the list shows, and what Monaco matches the typed text against.
- `kind` picks the little icon (keyword, field, function, snippet, and so on).
- `insertText` is what actually goes into the editor. Often the same as the label, but it doesn't have to be.
- `documentation` appears in the details panel beside the list. It can be Markdown.
- `range` is the stretch of existing text the suggestion will *replace*. §4 is all about this one.

Typing `fi` on an empty line opened the list with the keyword `find` (plus the snippet from §5). Then, on the next line, typing `where ` (with the space) showed only fields:

```
[ 'latency_ms, Field', 'level, Field', 'service, Field', 'status, Field' ]
```

The provider looked at the text before the cursor, saw `where `, and answered with fields instead of keywords. Context like this is all a provider really is: plain string checks on the model.

## 3. When Monaco asks, and who filters

Priya logged every call to her provider while typing `where st`:

```
provide called: trigger=0 char=undefined pos=2:2
provide called: trigger=1 char=" " pos=2:7
```

Two calls for eight keystrokes. The first came when she typed `w`. Monaco shows suggestions automatically as soon as you start a word (the `quickSuggestions` option), and reports that as trigger kind `0`, `Invoke`. For `here` it didn't ask again. The second call came after the space, with trigger kind `1`, `TriggerCharacter`, because Priya listed `' '` in `triggerCharacters`. Without that, a space would close the list and nothing would reopen it until she started a new word.

Then she typed `st`, and the list narrowed to `[ 'status, Field' ]`, again without a new call. **Monaco filters, not you.** Your provider returns everything that could fit at this spot. Monaco keeps that list and narrows it with fuzzy matching as the user keeps typing. Pressing Enter inserted it, giving `find errors\nwhere status`.

So don't filter by the typed prefix yourself. Monaco's matching is fuzzy, not "starts with": typing `where lms` narrowed the list to `[ 'latency_ms, Field' ]`, matching the `l`, the `m` and the `s` across the underscore. A provider that only returned names starting with the typed text would have returned nothing for `lms`. If your list really is too big to return in one go (a server with a million table names, say), return `incomplete: true` alongside `suggestions`, and Monaco will ask again as the word grows. Those follow-up calls come with trigger kind `2`, `TriggerForIncompleteCompletions`.

## 4. The range, and a word with a hyphen in it

`range` says which existing text the suggestion replaces. The usual choice is "the word the cursor is in, up to the cursor", which is what `model.getWordUntilPosition(position)` gives. When the user has typed `sta` and picks `status`, the range covers `sta`, so it becomes `status` and not `stastatus`.

In the TypeScript types, `range` is **required** (`range: IRange | CompletionItemRanges`, no `?`). From plain JavaScript you can leave it out and Monaco will guess the word range for you, which is why many examples online skip it. Don't. The guess uses the same word rules as below, and it is exactly where the bug in this section hides.

Priya added a snippet called `find-errors` (next section). She typed `find-e`, saw it in the list, pressed Enter, and got this:

```
find-find errors
where service = "checkout" and status >= 500
since 1h
```

The `find-` she had typed was still there. Asking the model what the "word" was explained it:

```
{ word: 'e', startColumn: 6, endColumn: 7 }
```

A hyphen ends a word under Monaco's default word rules, so the "word" was just `e`, the provider's range covered just `e`, and only `e` got replaced. The list looked right; the insert was wrong.

The fix belongs in the language configuration from [lesson 7](07-a-custom-language.md) §5. Its `wordPattern` field is the regular expression that defines a word for this language, and Priya's names can contain hyphens:

```js
monaco.languages.setLanguageConfiguration('logq', {
  comments: { lineComment: '#' },
  brackets: [['(', ')']],
  wordPattern: /[a-zA-Z_][\w-]*|\d+[smhd]?/g,
  // ...autoClosingPairs and surroundingPairs as in lesson 7
});
```

After that, the word under the cursor was `{ word: 'find-e', startColumn: 1, endColumn: 7 }`, and accepting the snippet replaced all of it. The wider lesson: the completion range, double-click selection and "what word am I on" all come from `wordPattern`, so set it to match your language's real identifiers.

## 5. Snippets with tab stops

A **snippet** is a suggestion that inserts a template with gaps to fill in. Priya's team writes the same "errors for one service" query all day:

```js
{
  label: 'find-errors',
  kind: monaco.languages.CompletionItemKind.Snippet,
  detail: 'Errors for one service',
  insertText: 'find errors\nwhere service = "${1:checkout}" and status >= ${2:500}\nsince ${3:1h}',
  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
  range,
}
```

`${1:checkout}` is a **tab stop** number 1 with default text `checkout`. `insertTextRules: InsertAsSnippet` tells Monaco to read those markers instead of inserting them literally. After accepting it:

```
text:      find errors\nwhere service = "checkout" and status >= 500\nsince 1h
selected:  checkout
```

The cursor was on the first gap with `checkout` selected. Priya typed `payments`, which replaced it, then pressed Tab: `500` was selected. Tab again: `1h`. It is the same snippet syntax VS Code uses, so `$0` marks where the cursor ends up, and `${1|asc,desc|}` offers a choice.

## 6. A hover provider

Hovering over a field name should explain it. A hover provider has the same shape as a completion provider, just a different question: "what should I show for this position?"

```js
monaco.languages.registerHoverProvider('logq', {
  provideHover(model, position) {
    const w = model.getWordAtPosition(position);
    if (!w || !FIELDS[w.word]) return null;
    return {
      range: new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn),
      contents: [{ value: `**${w.word}** · field` }, { value: FIELDS[w.word] }],
    };
  },
});
```

Returning `null` means "nothing to show here". `contents` is a list of Markdown blocks, drawn as separate sections of the tooltip. Hovering over `service` rendered:

```html
<p><strong>service</strong> · field</p>
<p>Name of the service that wrote the log line, e.g. "checkout".</p>
```

`range` tells Monaco which text the hover belongs to, so moving the mouse within `service` keeps the same tooltip open instead of asking again.

## 7. Registering once

Providers are registered **per language, for the whole page**, not per editor. Every LogQ editor on the page uses the same prompter. That has a sharp edge: registering twice doesn't replace the first one, it adds a second prompter. Priya called her registration function twice and typed `fi`:

```
[ 'find, Keyword', 'find, Keyword', 'find-errors, Snippet', 'find-errors, Snippet' ]
```

Every suggestion appeared twice. It is easy to do by accident, for example by registering inside a component that mounts more than once, or during hot module reloading. So register providers once, at module level next to `monaco.languages.register`, and keep the disposables if you ever need to remove them. After disposing both providers, typing `fi` showed no list at all.

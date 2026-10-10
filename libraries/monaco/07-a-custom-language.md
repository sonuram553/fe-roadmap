# Lesson 7 — Teaching Monaco a new language

Level: intermediate. How to add syntax colouring and editing behaviour for a language Monaco has never heard of.

## 1. LogQ

Priya's team searches their logs with a tiny language they made up, called LogQ. A query looks like this:

```
find errors  # checkout only
where service = "checkout" and status >= 500
since 2h
limit 50
```

Monaco knows about 80 languages out of the box, SQL included, but not LogQ. In an editor set to `plaintext`, all of that is one colour, `#` doesn't start a comment, and typing `"` doesn't add the closing quote. Teaching Monaco a language comes in three parts:

1. **Register** the language, so Monaco knows its id and file extensions.
2. Give it a **tokenizer**, which labels each piece of text so the theme can colour it.
3. Give it a **language configuration**, which describes editing behaviour: comment syntax, brackets, auto-closing pairs.

None of this involves understanding what a query *means*. That comes in [lesson 8](08-completion-and-hover.md).

## 2. Registering the language

```js
monaco.languages.register({ id: 'logq', extensions: ['.logq'], aliases: ['LogQ'] });
```

The `id` is what you pass as `language` when creating models and editors. `extensions` makes the URI trick from [lesson 2](02-models-and-tabs.md) §2 work: a model created with the URI `file:///saved/q1.logq` and no language came out as `logq`. `aliases` are human-readable names, used in places like the palette.

## 3. The costume department: a Monarch tokenizer

Syntax colouring is two steps. First a **tokenizer** reads each line and splits it into tokens, giving each one a type name, like `keyword` or `string`. Then the theme ([lesson 3](03-options-and-themes.md) §4) maps type names to colours.

In theatre terms, the tokenizer is the **costume department**: it decides what kind of character each word is and dresses it in the matching costume. The theme then decides what colour each costume is. The two never need to know about each other, which is why every language looks right in every theme.

Monaco's tokenizers are written in a small format called **Monarch**. A Monarch tokenizer is a plain object of regular-expression rules. Here is LogQ's:

```js
monaco.languages.setMonarchTokensProvider('logq', {
  keywords: ['find', 'where', 'and', 'or', 'not', 'since', 'limit', 'sort', 'by', 'asc', 'desc'],

  tokenizer: {
    root: [
      [/#.*$/, 'comment'],
      [/\d+[smhd]\b/, 'number.duration'],
      [/\d+/, 'number'],
      [/[a-z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
      [/"/, 'string', '@string'],
      [/[=!<>]=?/, 'operator'],
      [/[()]/, '@brackets'],
      [/\s+/, 'white'],
    ],

    string: [
      [/[^"\\]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
  },
});
```

How to read it:

- `tokenizer` holds **states**. Monaco starts every line in the `root` state, and at each point in the line it tries the current state's rules **in order**. The first regular expression that matches at that spot wins, and the matched text gets that token type.
- **Order matters.** `\d+[smhd]\b` comes before `\d+`, so `2h` is a duration and not the number `2` followed by an identifier `h`.
- `{ cases: { '@keywords': ..., '@default': ... } }` is how keywords are done. The rule matches any word, then checks whether the word is in the `keywords` array (any array you put at the top level can be named with `@`). Keywords get `keyword`, everything else gets `identifier`.
- A third item in a rule switches state. `[/"/, 'string', '@string']` means "an opening quote is a string token, and from now on use the `string` state". Inside it, `\\.` catches escapes like `\"` so they don't end the string, and `'@pop'` goes back to the previous state at the closing quote. States are how you handle anything with a start and an end: strings, block comments, embedded code.

`monaco.editor.tokenize(text, languageId)` runs a tokenizer without an editor, which is the fastest way to test one. For line 2, with an escaped quote added to exercise the `string` state:

```
where service = "check\"out" and status >= 500
```

```
"where"    keyword.logq
" "        white.logq
"service"  identifier.logq
" "        white.logq
"="        operator.logq
" "        white.logq
"\"check"  string.logq
"\\\""     string.escape.logq
"out\""    string.logq
" "        white.logq
"and"      keyword.logq
" "        white.logq
"status"   identifier.logq
" "        white.logq
">="       operator.logq
" "        white.logq
"500"      number.logq
```

(Each text is printed as a JSON string, which is why the quotes and backslashes are escaped.) Monaco adds the language id to every type, so `keyword` became `keyword.logq`. The other lines came out as expected: `# checkout only` as one `comment.logq` token, `2h` as `number.duration.logq`, `50` as `number.logq`.

## 4. Colouring your own token types

Type names are dotted, and theme rules match by **prefix**. A rule for `number` also colours `number.duration.logq`, and a rule for `number.duration` is more specific, so it wins for durations. That lets Priya invent new types freely: they fall back to a sensible colour from the built-in themes, and she can give them their own colour when she wants to.

```js
monaco.editor.defineTheme('logq-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'number.duration', foreground: 'b5179e', fontStyle: 'italic' },
    { token: 'identifier', foreground: '0f766e' },
  ],
  colors: {},
});
```

In the rendered editor, `find`, `where`, `and`, `since` and `limit` were blue keywords from the base `vs` theme, `service`, `status` and `errors` were teal identifiers, the comment was green, `500` and `50` kept the base theme's number colour, and `2h` was magenta italic. The costume department labelled `2h` a duration, and the theme had a specific colour for that costume.

## 5. Editing behaviour: the language configuration

Colours are only half of feeling at home in a language. The other half is how typing behaves. That comes from a separate call:

```js
monaco.languages.setLanguageConfiguration('logq', {
  comments: { lineComment: '#' },
  brackets: [['(', ')']],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
});
```

- `comments` tells the "Toggle Line Comment" action (`Cmd+/`) what to insert. Priya selected the first two lines and ran it:

  ```
  # find errors  # checkout only
  # where service = "check\"out" and status >= 500
  since 2h
  ```

  Without `comments`, the action does nothing in a custom language.

- `brackets` enables bracket-pair highlighting and matching.
- `autoClosingPairs` adds the closing character as you type the opening one. Priya typed `where service = "` and the model held `where service = ""`, with the cursor between the quotes. `notIn: ['string']` stops it from doubling a quote you type *inside* a string.
- `surroundingPairs` is what happens when you select text and type an opening character. Priya selected `status` and typed `(`. With the configuration, she got `(status)`. In a language registered without one, the same keystroke replaced the selection and left just `(`.

The configuration has one more field that matters a great deal once you add autocomplete: `wordPattern`, the regular expression that decides what counts as a "word". [Lesson 8](08-completion-and-hover.md) §4 shows a bug that comes from the default one.

Monarch has a helpful live playground at https://microsoft.github.io/monaco-editor/monarch.html, where you can edit a tokenizer on the left and see the colours update on the right.

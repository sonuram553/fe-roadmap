# Lesson 9 — Configuring the built-in languages

Level: intermediate. Monaco understands JavaScript, TypeScript, JSON, CSS and HTML deeply. This lesson shows how to tell those services about your app, so they check and complete code the way you need.

## 1. The specialist companies

For most languages, Monaco only has a tokenizer: it can colour them, nothing more. For five languages it has a full **language service**, a real analyser running in a worker ([lesson 1](01-first-editor.md) §2) that knows the language's rules. The TypeScript service is the actual TypeScript compiler (`monaco.typescript.typescriptVersion` is `'5.9.3'` in this release). The JSON, CSS and HTML services are the same ones VS Code uses.

In the theatre, these are **specialist companies** the house has hired: a TypeScript company, a JSON company. They bring their own crew and know their material perfectly. What they don't know is anything about *your* show. That is what their **defaults** objects are for: a place to hand them your house rules.

First, where those objects live, because it moved. Monaco 0.55 moved them out of `monaco.languages`. In 0.57 the old path is gone entirely:

```
typeof monaco.languages.typescript   // 'undefined'
typeof monaco.languages.json         // 'undefined'
```

The new homes are top-level: `monaco.typescript`, `monaco.json`, `monaco.css` and `monaco.html`. If a snippet you found writes `monaco.languages.typescript.javascriptDefaults`, it was written for an older version; drop the `languages.` and it will usually work.

## 2. JavaScript checks less than you expect

Priya's playground has a "transform results" box where people write a few lines of JavaScript to reshape the rows a query returned. She put obviously broken code in it:

```js
let n = 1;
n.push(2);
```

As a `typescript` model, Monaco underlined `push` right away, with the message `Property 'push' does not exist on type 'number'.` As a `javascript` model: nothing. No squiggle, no marker.

The reason is in the defaults. For JavaScript:

```js
monaco.typescript.javascriptDefaults.getDiagnosticsOptions();
// { noSemanticValidation: true, noSyntaxValidation: false, onlyVisible: false }
```

**Syntax** errors (a missing bracket) are reported. **Semantic** errors (using a value wrongly) are switched off for JavaScript. Turning semantic validation on alone still showed nothing, because the TypeScript compiler also needs to be told to type-check JavaScript files, the same `checkJs` flag you might have in a `jsconfig.json`. It takes both:

```js
const js = monaco.typescript.javascriptDefaults;
js.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
js.setCompilerOptions({ ...js.getCompilerOptions(), checkJs: true });
```

The default compiler options were `{ allowNonTsExtensions: true, allowJs: true, target: 99 }` (99 is `ESNext`). The spread matters, because `setCompilerOptions` replaces the whole object rather than merging into it. Calling `setCompilerOptions({ checkJs: true })` on its own left the options as just `{"checkJs":true}`, with the three defaults gone. With both settings on, Priya's transform script:

```js
const total = orders.reduce((s, o) => s + o.amount, 0);
total.toFixed(2);
let n = 1;
n.push(2);
```

reported these markers (severity, line, message):

```
1 1: Parameter 's' implicitly has an 'any' type, but a better type may be inferred from usage.
1 1: Parameter 'o' implicitly has an 'any' type, but a better type may be inferred from usage.
8 1: Cannot find name 'orders'.
8 4: Property 'push' does not exist on type 'number'.
```

These are ordinary markers ([lesson 5](05-decorations-and-markers.md) §4) with the owner `'javascript'`. Severity 1 is a Hint, drawn as faint dots rather than a squiggle; 8 is an Error. And the checker found a real problem Priya hadn't planted: it has no idea what `orders` is.

## 3. Teaching TypeScript about your globals

In the playground, `orders` is a real variable: Priya's page injects the query results before running the transform. The TypeScript service just can't see that. The fix is a **declaration file**, the `.d.ts` kind that describes types without any code, handed to the service with `addExtraLib`:

```js
const lib = monaco.typescript.javascriptDefaults.addExtraLib(
  [
    'interface Order { id: string; amount: number; status: "paid" | "refunded"; }',
    '/** All orders for the current report. */',
    'declare const orders: Order[];',
  ].join('\n'),
  'file:///types/report-globals.d.ts',
);
```

The second argument is a URI to file it under, like a model's. After this, the markers dropped to one:

```
8 4: Property 'push' does not exist on type 'number'.
```

`Cannot find name 'orders'` was gone, and so were both "implicitly any" hints, because TypeScript now knew `orders` was an `Order[]` and could work out the types of `s` and `o`. Autocomplete learned too: typing `orders[0].s` offered `status, Field`. Hover picks up the `/** ... */` comment as documentation. Hovering `orders` showed its type and, below it, `All orders for the current report.`

`addExtraLib` returns a disposable. When the shape of the data changes (a different query, different columns), Priya disposes the old library and adds a new one generated from the result's column list. `getExtraLibs()` lists what is currently loaded, keyed by URI:

```
[ 'file:///types/report-globals.d.ts' ]
```

For TypeScript models use `typescriptDefaults` instead. The two defaults objects are separate. With the library added to `javascriptDefaults` only, a `javascript` model using `orders` was clean, while a `typescript` model with the same line reported `Cannot find name 'orders'.`

## 4. JSON schemas

The playground has a settings panel where power users edit raw JSON. Priya wants it validated, and she wants autocomplete for the allowed values. JSON's house rule is a **JSON Schema**, a standard JSON format that describes what a valid document looks like:

```js
monaco.json.jsonDefaults.setDiagnosticsOptions({
  validate: true,
  schemas: [
    {
      uri: 'https://example.com/playground-settings.schema.json',
      fileMatch: ['file:///config/playground.json'],
      schema: {
        type: 'object',
        properties: {
          theme: { enum: ['light', 'dark'] },
          rowLimit: { type: 'integer', maximum: 1000 },
        },
        required: ['theme'],
        additionalProperties: false,
      },
    },
  ],
});
```

`uri` is the schema's own identifier. It doesn't need to be downloadable when you pass `schema` inline. `fileMatch` is the part that connects a schema to a document, and it matches against **model URIs**. This is one of the places where choosing real-looking URIs in [lesson 2](02-models-and-tabs.md) §2 pays off.

Priya opened this in a model at `file:///config/playground.json`:

```json
{
  "theme": "blue",
  "rowLimit": 5000,
  "colour": true
}
```

and got three warnings from the owner `'json'`:

```
4 2: Value is not accepted. Valid values: "light", "dark".
4 3: Value is above the maximum of 1000.
4 4: Property colour is not allowed.
```

A second model with the same bad `theme` value but the URI `file:///config/other.json` got no markers at all. Its URI didn't match `fileMatch`, so no schema applied. When a schema "isn't working", compare the model's URI with `fileMatch` first.

The schema also drives autocomplete. With the cursor inside the quotes of `"theme": ""`, `Ctrl+Space` offered exactly:

```
[ '"dark", Value', '"light", Value' ]
```

Schema `description` fields show up in hover. Priya gave `rowLimit` the description `Maximum rows returned by one query.`, and hovering the key in the document showed exactly that sentence. A well-described schema turns the settings panel into something close to self-documenting.

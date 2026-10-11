import { monaco } from "./monaco-setup";

const container = document.getElementById("editor");

const usersQuery = monaco.editor.createModel(
  "SELECT id FROM orders\nWHERE total > 100\nORDER BY id;",
  "sql",
  monaco.Uri.parse("file:///queries/users.sql"),
);

// const ordersQuery = monaco.editor.createModel(
//   "SELECT id FROM orders\nWHERE total > 100\nORDER BY id;",
//   "sql",
//   monaco.Uri.parse("file:///queries/orders.sql"),
// );

// const editor = monaco.editor.create(container, {
//   model: usersQuery,
//   automaticLayout: true,
// });

const editor = monaco.editor.create(container, {
  model: usersQuery,
  // glyphMargin: true,
});

const hints = editor.createDecorationsCollection([
  {
    range: new monaco.Range(3, 1, 3, 1),
    options: {
      isWholeLine: true,
      className: "slow-line",
      glyphMarginClassName: "slow-glyph",
      glyphMarginHoverMessage: {
        value: "**Slow join** — no index on `orders.user_id`",
      },
    },
  },
  {
    range: new monaco.Range(2, 6, 2, 12),
    options: {
      inlineClassName: "table-name",
      hoverMessage: { value: "Table `orders` · 1.2M rows" },
    },
  },
]);

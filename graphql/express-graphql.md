### What is express-graphql?
- **Purpose**: An Express middleware that exposes a GraphQL endpoint. It receives HTTP requests, runs your GraphQL schema against them, and returns JSON responses.
- **Typical usage**: One route (e.g., `/graphql`) that supports GET (for queries) and POST (for queries/mutations).

### Core features
- **Schema execution**: Runs operations against a `graphql` schema with optional `rootValue`.
- **Context**: Pass per-request data (auth/user, loaders) via `context`.
- **GraphiQL**: Built-in in-browser IDE when `graphiql: true`.
- **Validation & error shaping**: Custom validation rules and error formatting.
- **Express integration**: Works as a standard Express middleware.

Example (legacy style):
```js
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const schema = buildSchema('type Query { hello: String }');
const rootValue = { hello: () => 'Hello world!' };

const app = express();
app.use('/graphql', graphqlHTTP({
  schema,
  rootValue,
  graphiql: true,       // enable IDE
  // context: { ... },   // per-request data
}));
app.listen(4000);
```

### Current status
- **Deprecated**: `express-graphql@0.12.0` is no longer maintained. The recommended replacement is `graphql-http` for the HTTP transport, and `ruru` for an in-browser IDE.

### Modern alternative
- **Use**: `graphql-http`’s `createHandler` with Express and `ruru` for the IDE.
- **Why**: Maintained, spec-aligned, supports newer GraphQL features and better handling.

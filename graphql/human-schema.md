# GraphQL Schema for Human Query

## Query Schema

```graphql
type Query {
  human(id: ID!): Human
}

type Human {
  id: ID!
  name: String!
  height(unit: LengthUnit = METER): Float!
}

enum LengthUnit {
  METER
  FOOT
}
```

## Schema Explanation

### Query Type

- `human(id: ID!)`: A query that takes a required ID parameter and returns a Human object
- The `!` indicates that the parameter is non-nullable (required)

### Human Type

- `id: ID!`: Unique identifier for the human (non-nullable)
- `name: String!`: The human's name (non-nullable string)
- `height(unit: LengthUnit = METER): Float!`: The human's height with an optional unit parameter

### LengthUnit Enum

- `METER`: Default unit for height measurement
- `FOOT`: Alternative unit for height measurement

## Example Query

```graphql
{
  human(id: "1000") {
    name
    height(unit: FOOT)
  }
}
```

## Example Response

```json
{
  "data": {
    "human": {
      "name": "Luke Skywalker",
      "height": 5.7
    }
  }
}
```

## Implementation Notes

1. **ID Type**: GraphQL's built-in ID type is used for unique identifiers
2. **Default Values**: The height field has a default unit of METER if not specified
3. **Non-nullable Fields**: All fields are marked as non-nullable with `!` to ensure data consistency
4. **Enum Usage**: LengthUnit enum provides type safety for unit selection

## Resolver Implementation (JavaScript)

```javascript
const resolvers = {
  Query: {
    human: (parent, { id }) => {
      // Fetch human data by ID
      return getHumanById(id);
    },
  },
  Human: {
    height: (parent, { unit = "METER" }) => {
      const heightInMeters = parent.heightInMeters;

      if (unit === "FOOT") {
        return heightInMeters * 3.28084; // Convert meters to feet
      }

      return heightInMeters; // Return in meters (default)
    },
  },
};
```

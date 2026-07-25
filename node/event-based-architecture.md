# Event-Based (Event-Driven) Architecture

A design pattern where components communicate by producing and reacting to
**events** — notifications that "something happened" — instead of calling
each other directly.

Instead of Service A directly calling Service B ("do this now"), Service A
just announces "this happened" and doesn't care who's listening. Anyone
interested reacts independently.

## Key pieces

- **Event** — an immutable record of something that happened (e.g.
  `OrderPlaced`, `UserSignedUp`). Usually has a type + payload + timestamp.
- **Producer / Emitter** — creates and publishes the event. Doesn't know or
  care who consumes it.
- **Event Bus / Broker** — the channel events travel through (in-process
  `EventEmitter`, or infra like Kafka, RabbitMQ, AWS SNS/SQS, Redis Pub/Sub).
- **Consumer / Listener / Subscriber** — reacts to the event when it arrives.

## Request-response vs. event-driven

| Request-Response | Event-Driven |
|---|---|
| Caller waits for a direct response | Caller fires and moves on (fire-and-forget) |
| Tight coupling (caller must know callee) | Loose coupling (producer doesn't know consumers) |
| Hard to add new reactions without touching caller | Add new listeners without changing the producer |
| Synchronous by nature | Naturally async |

## Simple in-process example (Node's `EventEmitter`)

"In-process" means the producer, the event bus, and the consumers all run
inside the same running program (same memory space) — as opposed to being
separate services that talk over a network. Emitting an event here is just
a synchronous function call under the hood: no serialization, no network
hop. If the process crashes or restarts, the `EventEmitter` and all its
listeners disappear with it. (Contrast with the distributed version in the
next section, where events cross a network boundary between separate
processes/services.)

```js
const { EventEmitter } = require("events");
const bus = new EventEmitter();

// Producer
function placeOrder(order) {
  saveOrder(order);
  bus.emit("order:placed", order); // just announces the fact
}

// Consumers — added independently, producer doesn't know they exist
bus.on("order:placed", (order) => sendConfirmationEmail(order));
bus.on("order:placed", (order) => updateInventory(order));
bus.on("order:placed", (order) => notifyAnalytics(order));
```

If tomorrow you need to also trigger a loyalty-points update, you add
another `bus.on(...)` — no changes to `placeOrder`.

## At system/microservices scale

Same idea, but the "bus" is external infrastructure (Kafka, RabbitMQ,
SNS/SQS) so events cross network/process boundaries:

```
Order Service --publishes--> [Message Broker] --delivers to--> Email Service
                                              --delivers to--> Inventory Service
                                              --delivers to--> Analytics Service
```

Two common flavors:

- **Pub/Sub** — one event, many subscribers, each independent.
- **Event streaming/log** (Kafka-style) — events are persisted in order,
  consumers can replay history, multiple consumer groups read at their own
  pace.

## Tradeoffs

**Pros**

- Loose coupling — services evolve independently
- Easy to add new consumers without touching the producer
- Scales well, natural fit for async workflows
- Good audit trail (events = history of what happened)

**Cons**

- Harder to trace a request end-to-end (no single call stack) — needs
  correlation IDs/tracing
- Eventual consistency instead of immediate consistency
- Debugging is harder ("who's listening to this event?")
- Risk of duplicate/out-of-order event handling — consumers must be
  idempotent

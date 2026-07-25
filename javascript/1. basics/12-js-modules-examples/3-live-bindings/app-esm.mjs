import { count, increment } from "./counter.mjs";

increment();
console.log("ESM count:", count); // 1 — live binding, reflects the update

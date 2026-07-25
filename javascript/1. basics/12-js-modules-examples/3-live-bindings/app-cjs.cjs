const { count, increment } = require("./counter.cjs");

increment();
console.log("CJS count:", count); // 0 — copied value taken at require time

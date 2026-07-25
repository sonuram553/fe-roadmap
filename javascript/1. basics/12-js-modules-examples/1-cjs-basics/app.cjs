const { add } = require("./math.cjs");

console.log(add(2, 3)); // 5

console.log("__dirname:", __dirname);
console.log("__filename:", __filename);

// require() is a normal function call — legal inside a conditional
if (process.env.RUN_MOCK === "1") {
  // require() caches by resolved absolute file path — this doesn't re-execute
  // math.cjs or create a new exports object, it returns the same cached
  // one from line 1, so mock.add === add.
  const mock = require("./math.cjs");
  console.log("conditional require worked:", mock.add(1, 1));
  console.log("same function reference:", mock.add === add);
}

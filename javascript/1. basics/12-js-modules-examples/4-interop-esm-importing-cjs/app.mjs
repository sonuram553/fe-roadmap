// ESM can import a CJS file — module.exports becomes the default export
import pkg from "./legacy.cjs";

const { add } = pkg;
console.log(add(2, 3)); // 5

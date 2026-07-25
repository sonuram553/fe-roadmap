import { fileURLToPath } from "url";
import path from "path";
import { add } from "./math.mjs";

console.log(add(2, 3)); // 5

// no __dirname/__filename in ESM — derive them from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("__dirname:", __dirname);
console.log("__filename:", __filename);

// import is static — can't be conditional, so use dynamic import() instead
if (process.env.RUN_MOCK === "1") {
  const mock = await import("./math.mjs");
  console.log("dynamic import worked:", mock.add(1, 1));
}

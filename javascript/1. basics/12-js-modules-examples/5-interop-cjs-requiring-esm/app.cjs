// require() is synchronous and can't load an async ESM module directly.
// require("./math.mjs") would throw ERR_REQUIRE_ESM here.
// The workaround is a dynamic import() instead.
(async () => {
  const { add } = await import("./math.mjs");
  console.log(add(2, 3)); // 5
})();

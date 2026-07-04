# The `bin` entry in `package.json`

The `"bin"` field tells npm: "this package provides executable command(s), and
here's which file to run for each."

```json
"bin": {
  "nls": "./index.js"
}
```

This maps the command name `nls` to the script `./index.js`. A few things
make it work:

1. **The shebang line** (`#!/usr/bin/env node` at the top of `index.js`)
   tells the OS to run the file with `node`, so it can be executed directly
   rather than via `node index.js`.
2. **The executable bit** (`chmod +x`) — without it, the OS refuses to run
   the file as a program.
3. **npm creates a symlink** — when you run `npm link` (for local dev) or
   when someone does `npm install -g your-package` / `npx your-package`, npm
   places a symlink named `nls` in a directory that's on your `PATH` (e.g.
   `~/.nvm/versions/node/v22.13.1/bin/nls`), pointing at `index.js`.

That symlink is why typing `nls` in any directory runs the script — the
shell finds `nls` on `PATH`, follows the symlink to `index.js`, and the
shebang hands execution to `node`.

## Object form vs. string form

If a package has just one command matching the package name, `"bin"` can
also be a plain string instead of an object:

```json
"bin": "./index.js"
```

This is equivalent to `{ "<package-name>": "./index.js" }`. Using the
object form (as this project does) lets one package expose multiple named
commands, or a name that differs from the package name — which is why the
command here is `nls` even though the package is named `cli-tool`.

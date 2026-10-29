# Clapping Cat

Celebrate successful builds and program runs in VS Code with a clapping cat.

Based on [Cat Clapping](https://marketplace.visualstudio.com/items?itemName=nicosmartworking.cat-clapping)
0.0.7 by Nicola (MIT). The first commit of this repository is that release, imported as shipped.

## What triggers the cat

A supported build or run command that exits with code 0 in the integrated terminal
(`npm run build`, `cargo build`, `python script.py`, `./program`, ...), a successful
build, test or run task, or a debug session whose debugger reports exit code 0.
The terminal trigger needs VS Code shell integration.

## Settings

`clappingCat.enabledCommands` chooses which commands trigger the cat. The default `["*"]`
keeps the automatic detection. To celebrate only npm and Python commands:

```json
{
  "clappingCat.enabledCommands": ["npm", "python"]
}
```

`python` also matches `py` and `python3`; `npm` also matches `npx`. Use a specific
command such as `myapp.exe`, `executable` for directly launched programs, `tasks` for
tasks whose command cannot be identified, or `debug` for all successful debug sessions.
An empty list disables the celebration.

## Development

There is no build step: VS Code runs `src/` directly. `scripts/node` runs the Node.js
bundled with VS Code (macOS), so no separate Node install is needed.

```sh
scripts/node --test test/*.test.js          # run the tests
scripts/node scripts/package.js    # build dist/clapping-cat-<version>.vsix
code --install-extension dist/clapping-cat-0.1.0.vsix
```

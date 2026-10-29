# Clapping Cat

Celebrate successful builds and program runs in VS Code with a clapping cat.

Based on [Cat Clapping](https://marketplace.visualstudio.com/items?itemName=nicosmartworking.cat-clapping)
0.0.7 by Nicola (MIT). The first commit of this repository is that release, imported as shipped.

## What triggers the cat

A supported build or run command that exits with code 0 in the integrated terminal
(`npm run build`, `cargo build`, `python script.py`, `./program`, ...), a successful
build, test or run task, or a debug session whose debugger reports exit code 0.
The terminal trigger needs VS Code shell integration.

## Where the cat appears

On macOS the cat floats in its own transparent, click-through window above VS Code, so
it stays visible over a big or maximized terminal. Run **Clapping Cat: Show Cat** from the
Command Palette to preview your settings.

| Setting | Default | |
|---|---|---|
| `clappingCat.display` | `floating` | `floating` (macOS) or `editor` (inside the text editor, like the original; other systems always use this) |
| `clappingCat.position` | `bottom-right` | `top-left`, `top-center`, `top-right`, `center`, `bottom-left`, `bottom-center`, `bottom-right` |
| `clappingCat.anchor` | `window` | Position relative to the front VS Code `window` or to its `screen` |
| `clappingCat.offsetX`, `clappingCat.offsetY` | `24` | Pixels from the chosen edges; on a centered axis they shift the cat |
| `clappingCat.size` | `150` | Height of the cat in pixels |
| `clappingCat.layer` | `top` | Stacking order: `top` stays above every window, even full-screen ones; `normal` can be covered by other windows once you click them |

```json
{
  "clappingCat.position": "top-right",
  "clappingCat.anchor": "screen",
  "clappingCat.offsetY": 40,
  "clappingCat.size": 220
}
```

In `editor` mode VS Code limits what an extension can draw: the cat stays inside the
text editor, top and bottom follow the visible lines, and left, center and right are
measured across the width of the code rather than the whole editor.

## Your own image and sound

| Setting | Default | |
|---|---|---|
| `clappingCat.image` | built-in cat | An animated GIF, or a PNG, WebP or JPEG |
| `clappingCat.sound` | built-in clapping | macOS: WAV, MP3, M4A, AIFF. Windows: WAV. Linux: what `paplay`/`aplay` play (WAV) |
| `clappingCat.playSound` | `true` | Turn the sound off |
| `clappingCat.duration` | `7` | Seconds the image stays up; a custom sound plays to its end |

Paths can be absolute, start with `~`, or be relative to the workspace folder, so a team
can keep its own cat in the repository.

```json
{
  "clappingCat.image": "~/Pictures/party-parrot.gif",
  "clappingCat.sound": "/System/Library/Sounds/Glass.aiff",
  "clappingCat.duration": 3
}
```

Images with a transparent background look best floating. Videos are not supported;
convert a short clip to an animated GIF first.

## Choosing what triggers the cat

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

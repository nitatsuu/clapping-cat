# Change Log

## 0.1.0

- Based on [Cat Clapping](https://marketplace.visualstudio.com/items?itemName=nicosmartworking.cat-clapping) 0.0.7 by Nicola.
- Source is plain JavaScript with no build step and no dependencies.
- Settings moved from `catClapping.*` to `clappingCat.*`.
- Package shrank from 57 MB to about 9 MB by dropping media the code never used.
- No more "extension activated" notification at startup.
- On macOS the cat floats in a transparent, click-through window above VS Code, so it is
  visible over a big or maximized terminal (`clappingCat.display`).
- Choose where it appears and how big it is: `clappingCat.position`, `clappingCat.anchor`,
  `clappingCat.offsetX`, `clappingCat.offsetY`, `clappingCat.size`.
- Choose its stacking order with `clappingCat.layer` (`top` or `normal`).
- New command **Clapping Cat: Show Cat** to preview the settings.
- The in-editor cat now honors its size; the image used to render at 576x1024 regardless,
  spilling out of place and sometimes scrolling the editor.
- One cat at a time: successes that finish while the cat is still clapping are ignored.
- The sound plays even when there is no text editor open.

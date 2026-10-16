---
"mesh-avatar": minor
---

Add optional `rigid` rig parts: base-mesh vertices inside a part's outline move and rotate with its anchor, so a held object such as a fan keeps its shape instead of bending with the height-based head and body fades. Rigs without `rigid` render as before, and older runtimes ignore the field.

# HTML Level Review

Create an HTML page that lets the user understand the level and judge its decisions without reading source code. Keep it locally openable with no external dependencies. Use the project's review generator when one exists, and regenerate its output after changing level data or commentary.

Start from the imported editor draft (JSON), the seed and the selected algorithm. The trial report at `output/trials/maze-algorithm-trials.html` compares raw bases. For the final review, render the actual draft geometry, object coordinates, route overlays and design notes together. Regenerate the page after a design change.

## Map and Interaction

- Show the complete actual map by default, with visible floor/wall contrast, start, exit, required triggers, enemies, traps, and devices. Use distinct shapes or short labels as well as color, with a readable Chinese legend. Keep object markers legible when the map is scaled.
- Provide a level selector for batches, fit-to-view and zoom controls, and toggles for routes and annotations. Selecting a device or annotation should explain its role in plain language. Support narrow screens and keyboard-operable controls; allow map scrolling when zoomed rather than clipping content.
- Offer a recommended route and a viable alternative with different line styles. Explain what each costs. Mark observation positions, commitment points, recovery branches, and the order of required actions. Separate pre-trigger closed passages from post-trigger access.
- Treat sound as propagation around actual walls, fences, and pits. Use measured sound fields when showing reach; identify illustrative arrows as schematic. Do not draw a circle and imply it proves hearing through walls.

## Design Reasoning

Beside the map, explain the objective, central player decision, prior knowledge, discovery → commitment → consequence → recovery sequence, and why the important elements are present. State the specific trade-off between the two choices, including sound strength or timing when relevant. Describe the winning simulation and one wrong or costly action. Distinguish verified mechanics from pending human playtesting.

## Keep It Trustworthy

Generate walls, hazards, devices, and coordinates from the current playable data. Route overlays must follow walkable cells and show required trigger order; identify any dynamically changing segment. Link to the Markdown contract for detailed evidence. Check every level in the batch for missing content, stale markers, and invalid route segments, then visually inspect the page in a browser at desktop and narrow widths. The HTML and its source metadata belong in the repository with the level changes.

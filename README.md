# Animal Gacha

Refactored idle RPG demo. The single HTML file was split into modules for clarity.

## Structure

- `index.html` – semantic markup and reusable `<template>` elements.
- `styles/main.css` – all styles.
- `scripts/utils.js` – formatting, math helpers and DOM utilities.
- `scripts/state.js` – game state, constants and persistence.
- `scripts/logic.js` – game mechanics such as combat, loot and progression.
- `scripts/ui.js` – DOM rendering and event handlers.
- `scripts/app.js` – bootstrap and main loop wiring.

Open `index.html` directly in a browser to play. No build step or external dependencies are required.

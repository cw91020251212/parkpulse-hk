# 2026-10-08 — English UI and in-app guide

## Delivered

- Added a compact, persistent `繁 / EN` interface switch below the header.
- The choice is saved in the existing browser preference record, changes the document language and updates the page title.
- Translated product controls, filters, status meanings, map controls and popups, district search, result states, car-park / washroom / fuel / ATM cards, car-park details, navigation actions, source notices and data-limit messages.
- Kept official place names, addresses, original opening-hours strings and raw provider content unchanged to avoid mistranslating official data.
- Added the accessible in-app **使用教學 / How to use** panel: focusable dialog, close control, backdrop close and Escape close.
- Added the repository guide: `docs/how-to-use.md`, with matching Traditional Chinese and English instructions.

## Validation

- Browser test on the GitHub Pages path simulation confirmed that `EN` changes `document.documentElement.lang` to `en`, changes the heading to `Find Parking`, replaces the parking controls with English, saves `language: "en"` in local storage and opens the English guide.
- The guide passed its Escape-close check.
- English Washrooms mode produced the heading `31 Washrooms` and did not leave the Chinese `只看有位` control visible.
- Full existing data, PWA, TypeScript, production-build and whitespace checks passed.

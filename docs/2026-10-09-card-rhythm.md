# 2026-10-09 — Card rhythm and control alignment

A visual review identified inconsistent content-driven heights as the cause of uneven result cards and filter controls. The UI now uses a deliberate fixed rhythm:

- Filter chips and the height selector share a 38px desktop control rail (40px on small phones), common line-height and centred labels.
- Parking cards use five predictable information slots: title/address, availability, one-line facts and update time.
- Public washroom, LCSD venue, fuel and ATM cards use a fixed action rail. Photo/directions controls have equal target height and width.
- Long text is ellipsized in the list and remains available through the existing detail, navigation and photo actions.
- A user-opened live photo is the only case that intentionally expands its own card.

Browser DOM verification on the static GitHub Pages build found the first ten washroom cards all at **148px** with a **76px** action rail; the first ten parking cards were likewise **148px**, with 44px navigation controls centred at the same vertical offset. All filter chips and the height selector measured **38px**.

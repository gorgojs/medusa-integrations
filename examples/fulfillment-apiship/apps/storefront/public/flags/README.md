Vendored from https://github.com/lipis/flag-icons (MIT), tag v7.5.0, flags/4x3.

All 241 country codes seeded in `apps/backend/src/migration-scripts/data/regions/json/`
are vendored. `<CountryFlag>` falls back to the pinned jsDelivr URL for any other code,
so adding a region works without touching this directory — but dropping the matching
`<code>.svg` in here keeps the request same-origin.

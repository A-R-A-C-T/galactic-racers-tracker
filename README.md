# Galactic Racers — Tracker

A personal racing archive for **Star Wars: Galactic Racer**, presented as **The House of Nix · Backer Terminal**. Follow a pilot's progress, compare the grid, review past heats, and watch a wagering feed respond to the results.

The league archive is the core of the project. The exchange adds the atmosphere of a casino-backed racing operation: track-specific odds, moving credit pools, and market chatter drawn from your racing history.

## Try it

Open the [live dashboard](https://a-r-a-c-t.github.io/galactic-racers-tracker/) to explore the recorded heats. Shade is the backed pilot and default selection; choose another pilot or tour to follow their results.

To run your own copy, download or clone this repository and open `index.html` in a browser. No installation, build step, or account is required. You can explore the bundled archive immediately, then import your own results when ready.

## Using the dashboard

### Standings, telemetry, and results

- **Filters:** pilot, tour, planet, track, direction, vehicle, category, and subcategory. The browser remembers your selection. Clear filters with the reset control or **R** when you are outside a text field and no results dialog is open.
- **League standings:** points, starts, wins, average classified finish, and rank movement. Pilot cards show species, portrait, and statistics for the current filters.
- **Telemetry:** finish positions or gaps to the heat's fastest recorded finisher, with optional rival comparisons. Hover standings entries or legend names to highlight their lines; hover rival points to highlight their standings entries, and click to select that pilot. Gauntlet events are excluded from this graph.
- **Results:** one row per heat, with the winner, selected pilot's position, and league change. Sort Heat, Date, Tour / Category, Planet / Track, Winner, or Position. Date defaults to newest first; selecting another sort starts descending. Search narrows the displayed archive without changing league calculations.
- **Heat details:** open a result for the recorded grid, times, outcomes, points, and movement. Hover pilot names for their cards.
- **Track records:** compare the global record with the selected pilot's best and latest results for each configuration. Click a record card to apply its course filters, including laps.

Missing portraits use placeholders until images are added.

### Points and league movement

Normal races award **25, 18, 15, 12, 10, 8, 6, 4, 2, 1** points for P1–P10. P11 and lower earn zero. This follows the Formula 1 Grand Prix points scale as a tracker convention.

**Eliminators** award the same scale to surviving finishers—normally 25, 18, and 15 for the final three. Eliminated pilots and DNFs earn zero.

**Galactic Gauntlet** uses phase progression:

| Outcome | Points |
| --- | ---: |
| Eliminated in phase 1 | 0 |
| Eliminated in phase 2 | 8 |
| Eliminated in phase 3 | 16 |
| Cleared the final phase | 25 |

Points and historical league movements are calculated from the archive, so scoring changes apply retroactively. Ties are resolved by wins, average classified finish, then pilot name. Gauntlet starts and points count toward standings, but do not count toward conventional finish averages, wins, or podiums.

League movement uses standings immediately before and after each heat under the active filters. All tours gives cumulative movement; selecting a tour gives movement within that tour. Heats are processed by date, then heat ID, independently of the table's display sort. Keep same-day IDs sequential. A pilot's first recorded standing shows **Initial ranking**; missing information shows **No telemetry** where movement cannot be established.

Classified eliminations retain their numeric position for finish averages. DNFs do not count toward those averages. DNF rate uses all recorded starts as its denominator; elimination statistics are tracked separately.

### The wagering exchange

The exchange is collapsed by default and remembers its open state across reloads.

Markets are generated from recorded track configurations, including category, direction, subcategory, and laps. New configurations enter the market list when their results enter the archive. Selecting a track pauses automatic market rotation. Each market displays three pilots: the leading candidates, with the selected pilot replacing the third candidate when needed and present in the recorded grid. Gauntlet markets do not quote outright-win odds.

Win estimates combine recorded win history, recent tour form, and exact-course performance, including best, oldest, and latest recorded times. These are lightweight estimates from the available archive, rather than calibrated predictions. Decimal prices include a **105% book**: the sum of implied probabilities is approximately 105%, allowing for displayed rounding.

A decimal price of **3.50** means a winning 100-credit stake returns **350 credits total**, including the stake; the profit is 250 credits. A losing stake returns nothing. The interface does not accept bets or move credits.

Named betting-terminal pools change and rotate every **5–7 seconds** while the exchange is open. The scrolling **Paddock Wire** builds commentary from recent heats and historical context, including eliminations, close finishes, upsets, records, streaks, and league gains or losses. Pilot cards show the same filtered standings as elsewhere in the dashboard.

The market feed is in-world flavor and does not affect championship points. Motion respects reduced-motion preferences, and the exchange provides a pause control.

## Add and manage results

- **Import CSV** replaces the archive in the current browser and saves it locally.
- **Export CSV** exports results matching the main filters. Archive search does not restrict the export.
- Browser imports do not modify repository files or synchronize across devices or visitors.
- **Reset archive** restores the bundled dataset. Export browser-only changes first.
- Keep [data/races.csv](data/races.csv) and [data/races.js](data/races.js) synchronized when publishing. The JavaScript file supplies the default data without requiring a server-side CSV request.

Filters and exchange expansion are stored separately from imported results. Browser storage must be available for persistence.

### CSV reference

One row represents **one pilot's result in one heat**. All rows for that heat share its ID and event details. [data/races.csv](data/races.csv) is the portable ledger.

```csv
race_id,date,tour,category,planet,track,pilot,position,time_ms,vehicle,status,subcategory,laps,phase,direction
GR-001,2026-10-09,Tour 01,Race,Crait,Forgil Canyon,Shade,1,159170,Land speeder,,Circuit,2,,Forward
GR-001,2026-10-09,Tour 01,Race,Crait,Forgil Canyon,Goli & 02-R0,2,160120,,,Circuit,2,,Forward
```

| Column | Meaning |
| --- | --- |
| race_id | Unique heat ID, preferably padded and sequential, such as GR-001. |
| date | Actual logged date in YYYY-MM-DD format. |
| tour | Tour identifier, such as Tour 01. |
| category | Race, Eliminator, or Galactic Gauntlet. |
| planet | Planet name. |
| track | Course name; may be blank until known. |
| pilot | Pilot name, spelled consistently across heats. |
| position | Positive classified position, or DNF for an unclassified non-finish. Gauntlet results use a blank position. |
| time_ms | Recorded finish time in milliseconds; non-finishes may leave it blank. |
| vehicle | Shade's vehicle; blank for other pilots. |
| status | Blank for a normal finish; DNF, ELIMINATED, or CLEARED for a completed Gauntlet. |
| subcategory | Optional Circuit or Point-to-point. |
| laps | Optional positive lap count. Different lap counts form separate configurations. |
| phase | Gauntlet phase, 1–3; blank for other categories. |
| direction | Forward for D1 (Standard), Reverse for D2; blank when unknown. |

Optional columns may be omitted in older files. Imports validate the entire dataset before replacing browser data. Pilot names and numeric positions must be unique within a heat.

Shade's supported vehicles are Land speeder, Speeder bike, Skim speeder, and Podracer. The vehicle filter retains the entire recorded grid from heats where Shade used that vehicle.

#### Outcomes and incomplete records

Use **ELIMINATED** for a classified elimination and keep its known position. Use **DNF** for an incomplete result. Legacy DQ values remain readable: ranked Eliminator DQs become eliminations, while unclassified DQs become DNFs.

Partial heats can be recorded without inventing rivals, winners, or times. Unrecorded rivals do not receive fabricated points. Non-finish times are excluded from timed track records and gap calculations; classified eliminations remain visible in position telemetry.

Timed track records require a known course and direction. Normal Race records also require a known subcategory. Records separate planet, track, category, subcategory, laps, and direction. Older results with unspecified configurations still contribute to applicable standings and results views. Gauntlet records display phase outcomes rather than timed records.

#### Dates

The ledger stores real dates. The interface displays an archive calendar using the Gregorian year minus 2016 and the day of that year. For example, **2026-10-07 → 10 ABY · 280**. This is a display convention, rather than a canonical Earth-to-Star-Wars conversion.

### Optional local logging utility

Install Node.js, create a JSON file, and run:

```sh
node scripts/log-race.cjs path/to/heat.json
```

For example:

```json
{
  "date": "2026-10-09",
  "tour": "Tour 01",
  "category": "Race",
  "planet": "Crait",
  "track": "Forgil Canyon",
  "subcategory": "Circuit",
  "laps": 2,
  "direction": "Forward",
  "vehicle": "Land speeder",
  "results": [
    { "pilot": "Shade", "position": 1, "time_ms": 159170 },
    { "pilot": "Goli & 02-R0", "position": 2, "time_ms": 160120 }
  ]
}
```

The example is a partial grid; include every recorded pilot when available. Result objects may also contain `status` and, for Gauntlet, `phase`.

The utility validates the new heat, assigns the next GR ID, checks for duplicate results, and updates both bundled data files. Without a file argument, it reads `data/pending-race.json`. This local utility is optional and is not required to view the dashboard or import CSVs.

## Running locally and customization

Hosting is optional. Keep the project files together in a folder and open `index.html` directly in your browser; the dashboard, bundled archive, and CSV import/export work locally.

If you want to share it online, publish the repository root on a static host. Include the HTML, CSS, browser JavaScript, `data/races.js`, and `assets` directory. Paths are relative, so hosting under a project subdirectory is supported. There is no backend or build pipeline.

Change colors in the stylesheets, scoring and pilot metadata in `app.js`, market behavior in `exchange.js`, and planet presentation in `planet-display.js`. Contributions and personal forks are welcome.

Portraits live in [assets/pilots](assets/pilots). Pilot portrait and species mappings are maintained in `app.js`; framing and presentation use CSS. Missing portraits have placeholders.

The core dashboard works offline. Google Fonts load when connected, with system-font fallbacks.

## License and game assets

The MIT license covers this project's original code only. Star Wars names, game names, and game imagery—including pilot portraits captured from the game—belong to their respective rights holders and are not covered by this license.

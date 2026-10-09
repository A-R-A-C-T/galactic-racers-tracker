# Galactic Racers — Tracker

Welcome to the Galactic League leaderboards! A homemade HTML dashboard for tracking campaign or multiplayer results in Fuse Games’ **Star Wars: Galactic Racer**. Bring your own CSV and build a racing history across the galaxy.

**Clone it, fork it, change the look, track your own races, and make it yours. Have fun!** The code is available under the [MIT license](LICENSE); keep the copyright and license notice when redistributing it.

## Get started

1. Clone or download this repository.
2. Open `index.html` in a browser. No installation, build step, or account is required.
3. Choose **Import CSV** to load your results. [data/races.csv](data/races.csv) contains recorded races and provides the column format.

The dashboard also works on static hosting such as GitHub Pages or GitLab Pages. Its core functionality works offline; optional Google Fonts load when connected, with system-font fallbacks.

## What it does

- League standings with accumulated points, wins, and average finish.
- Select any racer to inspect their average finish, podium rate, DQ count, and DQ rate.
- Interactive race telemetry with optional rival overlays and finish-position/time-gap views.
- Filters for tour, planet, track, category, subcategory, and Shade’s vehicle.
- One archive row per race; open it for every recorded racer’s position, time, points, and league movement.
- Track records, gold/silver/bronze podium badges, and red DQ badges.
- In-universe date displays, rotating planet artwork, keyboard controls, and reduced-motion support.
- CSV import/export and browser storage to retain imported results between visits.

Shade is the backed pilot by default. This is a manually maintained race tracker: enter results yourself or transcribe screenshots. It does not read game saves or connect to game servers.

## CSV format

One row represents **one racer’s result in one event**. All racers in that event share a race ID and the same event details.

```csv
race_id,date,tour,category,planet,track,pilot,position,time_ms,vehicle
GR-001,2026-10-07,Tour 01,Race,Sentinel One,Caustic Fields,Fola Kanjen,1,147820,
GR-001,2026-10-07,Tour 01,Race,Sentinel One,Caustic Fields,Shade,9,152600,Skim speeder
```

| Column | Meaning |
| --- | --- |
| race_id | Unique event ID. Use padded sequential IDs, such as GR-001. |
| date | Actual date logged, in YYYY-MM-DD format. |
| tour | Tour identifier, for example Tour 01. |
| category | Event category, initially Race or Eliminator. |
| subcategory | Optional course description, such as Point-to-point. Missing columns and blank values are supported. |
| laps | Optional positive lap count for a circuit; shown in race details, with no lap filter. Track records separate different lap counts. |
| planet | Planet name. |
| track | Circuit name; may be blank until known. |
| pilot | Racer name, spelled consistently across events. |
| position | Positive integer, or DQ for a non-finish. |
| time_ms | Total race time in milliseconds; may be blank for DQ. |
| vehicle | Shade’s vehicle; blank for other racers. |
| status | Optional: DNF or ELIMINATED; blank for a timed finish. Legacy DQ is supported. |

Shade’s supported vehicles are Land speeder, Speeder bike, Skim speeder, and Podracer. A vehicle filter retains the full recorded grid from events in which Shade used that vehicle. Pilot names and numeric finishing positions must be unique within a race. Multiple racers may have DQ. Imports validate the complete file before replacing the browser dataset.

### Result outcomes

DNF and ELIMINATED are separate statuses. Both earn zero points and may have blank times. Keep the displayed numeric position where known. Eliminated racers retain classified positions, which count toward average finish; DNFs do not. The DNF total and rate count only explicit DNFs, with all recorded starts as the rate denominator. Legacy DQ data remains readable; ranked Eliminator DQs are interpreted as eliminations, while unclassified DQs remain unspecified non-finishes and are not counted as confirmed DNFs.

A race with only an unranked non-finish can be logged without inventing rival results. Rival points stay unchanged, and subsequent races continue the recorded league. Only the affected event shows incomplete results. Track records and time-gap calculations exclude all non-finish statuses; position telemetry retains classified eliminations.

## Scoring and league movement

The tracker uses the Formula 1 Grand Prix scale: **25, 18, 15, 12, 10, 8, 6, 4, 2, 1** for P1–P10; P11 and lower earn zero. Eliminators use the same position scale for survivors (normally 25, 18 and 15 for the final three), while eliminated pilots and DNFs earn zero. Scores and historical league movements are recalculated from recorded results, so this applies retroactively. This is the tracker’s scoring convention, rather than an assertion about the game’s points system.

Galactic Gauntlet retains separate phase scoring: elimination in phases 1, 2 and 3 earns 0, 8 and 16 points respectively; clearing the final phase earns 25.

Ties use wins, average completed finish, then pilot name. League-change arrows compare standings immediately before and after each race **across all tours**. They use the same active filters as the standings. Selecting a tour shows movement within that tour; All tours shows the cumulative league. Archive text search only hides rows and does not change rankings. Only a pilot’s first recorded standing shows **Initial ranking**; starting a new tour does not reset the league. Events are ordered by logged date, then race ID, so keep same-day IDs sequential.

Track records compare results within the same planet, circuit, category, and subcategory; unidentified circuits are excluded. Time-gap telemetry compares a racer’s time with the fastest recorded finish in that event.

### Dates

The CSV keeps the real logged date. The interface displays a mathematical archive calendar: Gregorian year minus 2016, followed by the day of that year. For example, **2026-10-07 → 10 ABY · 280**. This is a display convention, not a canonical Earth-to-Star-Wars conversion.

## Keeping the data up to date

- **Import CSV** replaces and saves the dataset in the current browser. **Export CSV** backs up all results matching the main filters; archive search does not limit exports.
- Browser imports stay on that device/browser. They do not write to the repository or synchronize with other visitors.
- [data/races.csv](data/races.csv) is the portable ledger. [data/races.js](data/races.js) supplies the default dataset when the page opens. Keep them in sync when publishing updates.
- **Reset archive** reloads the bundled dataset. Export any browser-only changes first.

For an optional local logging workflow, install Node.js and run:

```sh
node scripts/log-race.cjs path/to/race.json
```

The JSON contains date, tour, category, planet, track, vehicle, and a results array. Each result contains pilot, position, and time_ms (optional for DQ). The script appends a validated event, assigns the next GR ID, rejects duplicate results, and updates both published data files. It runs locally and is not needed to view or import CSVs in the dashboard.

## Hosting

Publish the repository root on your preferred static host. All asset paths are relative, including data/races.js, so project-subdirectory hosting is supported. Only the HTML, CSS, browser JavaScript, and data files are needed to serve the tracker.

## Make it yours

Change the colors, add planets, adjust the score in app.js, or adapt the pilot conventions for your own group. Contributions and personal forks are welcome. The MIT license applies to this project’s original code only. Star Wars names, game names, and game imagery—including pilot portraits captured from the game—belong to their respective rights holders and are not covered by this license.

## House of Nix backer terminal

The collapsible wagering exchange remembers its open state. Market prices use recorded win history, recent tour form, and best/oldest/latest times for the exact track configuration, with a 105% book. Markets are generated from the archive; selecting a track locks automatic market rotation. Each market shows three pilots, including the selected pilot when present in the grid.

Named betting-terminal pools rotate every 5–7 seconds. The scrolling Paddock Wire derives its reports and contextual reactions from recent results and historical league changes. Pilot cards inside the exchange use a green theme and the same filtered standings as other cards. These market features are in-world flavor and do not affect championship scoring.

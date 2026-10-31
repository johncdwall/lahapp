# Live Action Hockey (v0 prototype)

Static web app. Runs in the phone browser and installs to the home screen. No build step.

## Put it on your iPhone
1. In this repo on github.com: Add file > Upload files. Drag in everything from the zip (keep the folders: data, scripts, .github). Commit.
2. Settings > Pages > Source: "Deploy from a branch", Branch: main, folder: / (root). Save.
3. After a minute the site is at https://johncdwall.github.io/lahapp/
4. On the iPhone open that address in Safari > Share > Add to Home Screen.

## Real games
- Actions tab > "Fetch games" > Run workflow > enter a date like 2026-10-30 (or game ids). It saves the games into data/games and they show on the home screen.
- If the folder .github did not upload, create .github/workflows/fetch-game.yml on the website and paste the file contents.
- The app also tries the NHL API directly from the browser (Load game id). That may be blocked by the NHL; the Action is the reliable route.

## Assumptions in v0
- Each Player Card uses one random penalty multiplier among those printed above +1x.
- Strength (ST) comes from the situation code at the event time; shootouts are skipped.
- Shared deck for both sides; Rival picks its best option each event.
- Stars bonus needs the landing data (fetched by the Action).

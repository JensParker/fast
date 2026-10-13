# FAST

Tracker for a weekly 36-hour fast. Installable web app for the phone: start,
stop, delete, a log with streaks, and a factual phase-by-phase readout of what
the body is doing. No account, no backend. Optional backup to a Google Sheet.

App: https://jensparker.github.io/fast/

## Use

- **START FAST** when the last meal is finished. The timer runs from the stored
  start time, so the app can be closed.
- **HOLD TO STOP** ends the fast early and logs it as incomplete.
- **HOLD TO DELETE** removes a running fast or a log entry for good.
- At 36:00:00 the fast finishes by itself and is logged as complete.
- Streak = consecutive calendar weeks (Mon-Sun) with a completed fast.

## Install on Android

Open the app URL in Chrome, then menu > **Add to Home screen** > **Install**.

## Google Sheet backup (one time, about 5 minutes)

1. Create a new Google Sheet, e.g. "FAST log".
2. Extensions > Apps Script. Replace the editor content with
   `apps-script/Code.gs` and save.
3. Select `setup` in the function dropdown and Run. Approve the permissions.
4. Deploy > New deployment > type **Web app**. Execute as: **Me**.
   Who has access: **Anyone**. Deploy.
5. Select `showSetupLink` and Run. Open the Execution log, copy the link and
   open it once in Chrome on the phone (mail it to yourself). The app connects,
   uploads what is on the phone and restores what is in the Sheet.

New phone: install the app and open the same setup link (run `showSetupLink`
again to get it). The key is stored in the script's Script Properties.

## Files

- `index.html`, `style.css`, `app.js` - the app
- `core.js` - timer, streak and merge logic (shared with the tests)
- `content.js` - phases, facts, orders, sources
- `sw.js`, `manifest.webmanifest`, `icons/` - offline and install
- `apps-script/Code.gs` - Sheet backup endpoint
- `tests/test-core.js` - `node tests/test-core.js`, ends with ALL PASS
- `tests/preview.html`, `tools/serve.js` - local preview: `node tools/serve.js`,
  then `http://127.0.0.1:8136/tests/preview.html?s=running&h=18.7`
- `tools/make-icons.js` - regenerates the icons

## Updating

Change files, bump `CACHE` in `sw.js`, commit and push to `main`. The phone
picks the update up the second time the app is opened.

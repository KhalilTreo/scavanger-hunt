# Keyhole(Title TBD) — online riddle game

A static-site starter for a Cipher online riddle: each level is a page,
and the answer to one level is the address of the next.

## Build

    node build.js        # writes the playable site to dist/

Run `node build.js` in the command line. The build prints a level map (file → URL → answer) for you. Nothing in `dist/` contains answers.

## Adding a level

Create `src/levels/05-whatever.html` (filename order = level order):

    <!--
    title: My Level
    answer: main answer | alternate answer
    -->
        <p>Puzzle content goes here.</p>

The first comment is stripped at build time. Any *other* comments stay in the page,
which is how "view the source" puzzles work (see level 2).

## How answers work

- Answers are lowercased with spaces and punctuation stripped, so `Veni, Vidi, Vici!` = `venividivici`.
- With `hashUrls: true`, each level lives at `l/<sha256(salt + answer)>.html`, so players
  can't guess URLs. Set `hashUrls: false` for the classic style where the URL *is* the answer
  (`l/open.html`) and players can type answers into the address bar.
- **Change `salt` in `riddle.config.json` before launch**, then don't change it again
  (it changes every URL).

## Testing and hosting

Hashing in the browser needs `https://` or `localhost`, so test with a local server:

    npx serve dist        # or: python3 -m http.server -d dist

Any static host works (GitHub Pages, Netlify, Cloudflare Pages). Point the host's 404
page at `404.html`.

## Files

    build.js              build script
    riddle.config.json    title, salt, URL mode
    src/template.html     wrapper used for every level
    src/levels/*.html     the levels
    src/win.html          final page
    src/index.html        landing page (Begin / Continue)
    src/game.js           answer form → next URL
    src/assets            images and audio
    src/style.css

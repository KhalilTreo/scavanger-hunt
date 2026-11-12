// Background music toggle, shown in the top-left of every page.
// Put your track at src/assets/audio/music.mp3, or change MUSIC below.
//
// How it behaves:
//  - Music starts OFF. The player's choice is remembered across pages.
//  - Every link loads a new page, which stops the audio, so we save the
//    playback position and resume from it on the next page.
//  - Browsers block sound until the player interacts with a page. If the
//    music can't start on load, it starts on the first click or key press.

(function () {
  const MUSIC = 'assets/audio/music.mp3'; // relative to the site root
  const VOLUME = 0.5;                     // 0 = silent, 1 = full

  const ON_KEY = 'riddle-audio';
  const TIME_KEY = 'riddle-audio-time';

  // Level pages are one folder down (l/), so they need "../" in front of paths
  const root = document.body.dataset.level ? '../' : '';

  // localStorage can throw (private mode etc.), so wrap it
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  const audio = new Audio();
  audio.loop = true;
  audio.volume = VOLUME;
  audio.preload = 'none'; // don't download the track unless music is on

  // Resume where the previous page left off, once the file's length is known
  audio.addEventListener('loadedmetadata', () => {
    const t = parseFloat(store.get(TIME_KEY));
    if (t > 0 && t < audio.duration) audio.currentTime = t;
  }, { once: true });

  // Save the position about once a second, and when leaving the page
  let lastSave = 0;
  audio.addEventListener('timeupdate', () => {
    if (Date.now() - lastSave > 1000) {
      lastSave = Date.now();
      store.set(TIME_KEY, audio.currentTime);
    }
  });
  window.addEventListener('pagehide', () => {
    if (!audio.paused) store.set(TIME_KEY, audio.currentTime);
  });

  audio.addEventListener('error', () => {
    console.warn(`Music file not found: ${root + MUSIC}`);
    btn.title = 'Music file not found';
  });

  // --- the button -------------------------------------------------------------
  const SPEAKER = '<path d="M11 5 6 9H3v6h3l5 4z"/>';
  const icon = (extra) =>
    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SPEAKER}${extra}</svg>`;
  const ICON_ON = icon('<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>');
  const ICON_OFF = icon('<path d="m16 9 5 6"/><path d="m21 9-5 6"/>');

  const btn = document.createElement('button');
  btn.id = 'audio-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Music');

  let on = store.get(ON_KEY) === 'on';

  function render() {
    btn.innerHTML = on ? ICON_ON : ICON_OFF;
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Music on' : 'Music off';
  }

  function start() {
    if (!audio.src) audio.src = root + MUSIC; // load the file on first use
    return audio.play();
  }

  btn.addEventListener('click', () => {
    on = !on;
    store.set(ON_KEY, on ? 'on' : 'off');
    render();
    if (on) start().catch(() => {});
    else audio.pause();
  });

  render();
  const header = document.querySelector('header');
  if (header) header.prepend(btn);
  else document.body.prepend(btn);

  // If music was on, try to continue. If the browser blocks it,
  // start on the first click or key press instead.
  if (on) {
    start().catch(() => {
      const kick = (e) => {
        if (e.target.closest && e.target.closest('#audio-toggle')) return; // the button handles itself
        if (on && audio.paused) start().catch(() => {});
      };
      document.addEventListener('pointerdown', kick, { once: true });
      document.addEventListener('keydown', kick, { once: true });
    });
  }
})();

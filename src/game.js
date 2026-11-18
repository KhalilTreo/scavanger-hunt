// Answer checking. Turns an answer into the next level's URL.
// slug() must match slug() in build.js exactly.
//
// Two ways to answer, and a level can use either or both:
//   1. The answer box (added to every level unless its header says "form: off")
//   2. Clickable answers: any element with data-answer="..." works like typing
//      that answer. Optional data-wrong="..." is the message shown if it's wrong.
//        <button class="hotspot" data-answer="kestrel" data-wrong="Not this one.">
//
// Wrong answers open a pop-up instead of leaving the page.

// Messages for wrong typed answers; one is picked at random each time.
const WRONG_MESSAGES = [
  'That answer doesn\'t compute.',
  'Signal lost. Try again.',
  'Coordinates rejected.',
  'Nothing out there by that name.',
];

(function () {
  const body = document.body;
  const salt = body.dataset.salt || '';
  const hashed = body.dataset.hash === '1';
  const form = document.getElementById('answer-form');

  const normalize = (a) => a.toLowerCase().replace(/[^a-z0-9]/g, '');

  async function slug(answer) {
    const norm = normalize(answer);
    if (!hashed) return norm;
    // crypto.subtle needs https:// or http://localhost
    const bytes = new TextEncoder().encode(salt + norm);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  // --- the pop-up -------------------------------------------------------------
  // Built once, the first time it's needed. Uses the browser's <dialog> element,
  // which handles Esc-to-close and keeping keyboard focus inside it.
  let dialog;
  function popup(title, message) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'popup';
      dialog.innerHTML = `
        <p class="popup-title"></p>
        <p class="popup-msg"></p>
        <form method="dialog"><button class="popup-btn">Try again</button></form>`;
      body.appendChild(dialog);
      // Clicking the dimmed area outside the box also closes it
      dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
      // When it closes, put the cursor back in the answer box, ready to retype
      dialog.addEventListener('close', () => {
        if (form) { form.answer.focus(); form.answer.select(); }
      });
    }
    dialog.querySelector('.popup-title').textContent = title;
    dialog.querySelector('.popup-msg').textContent = message;
    dialog.showModal();
    dialog.querySelector('.popup-btn').focus();
  }

  const wrong = (message) =>
    popup('Access denied', message || WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)]);

  // --- checking ---------------------------------------------------------------
  // Goes to the answer's page if it exists. Otherwise returns:
  //   'wrong'   - no page for that answer
  //   'offline' - couldn't check (no connection, or the site was opened as a file)
  async function tryAnswer(answer) {
    const url = (await slug(answer)) + '.html';
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (!res.ok) return 'wrong';
    } catch (_) {
      console.warn('Answer check failed. If you opened this page as a file, run it through a local server instead (npx serve dist).');
      return 'offline';
    }
    try { localStorage.setItem('riddle-last', location.pathname.replace(/[^/]*$/, url)); } catch (_) {}
    location.href = url;
    return 'ok';
  }

  async function submit(answer, wrongMessage) {
    const result = await tryAnswer(answer);
    if (result === 'wrong') wrong(wrongMessage);
    if (result === 'offline') popup('No signal', 'Couldn\'t check that answer. Check your connection and try again.');
  }

  // 1. The answer box
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const answer = form.answer.value;
      if (!normalize(answer)) return form.answer.focus(); // empty box: do nothing
      submit(answer);
    });
  }

  // 2. Clickable answers
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-answer]');
    if (!el) return;
    e.preventDefault();
    submit(el.dataset.answer, el.dataset.wrong);
  });

  // Remember the furthest page reached so the home page can offer "Continue"
  try {
    if (body.dataset.level) localStorage.setItem('riddle-last', location.pathname);
  } catch (_) {}
})();

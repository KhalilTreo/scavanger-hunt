// Answer checking. Turns an answer into the next level's URL.
// slug() must match slug() in build.js exactly.
//
// Two ways to answer, and a level can use either or both:
//   1. The answer box (added to every level unless its header says "form: off")
//   2. Clickable answers: any element with data-answer="..." works like typing
//      that answer. Optional data-wrong="..." is the message shown if it's wrong.
//        <button class="hotspot" data-answer="kestrel" data-wrong="Not this one.">
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

  // Shows a message under the level. Levels without an answer box
  // get a message line created for them the first time it's needed.
  function say(msg) {
    let feedback = document.getElementById('feedback');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.id = 'feedback';
      feedback.setAttribute('role', 'status');
      (document.querySelector('main') || body).appendChild(feedback);
    }
    feedback.textContent = msg;
  }

  // Goes to the answer's page if it exists. Returns false if it doesn't.
  async function tryAnswer(answer) {
    const url = (await slug(answer)) + '.html';

    // Check the page exists before leaving, so a wrong answer shows a
    // message instead of a 404. Falls back to navigating if fetch fails.
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (!res.ok) return false;
    } catch (_) { /* opened from disk etc. — just go */ }

    try { localStorage.setItem('riddle-last', location.pathname.replace(/[^/]*$/, url)); } catch (_) {}
    location.href = url;
    return true;
  }

  // 1. The answer box
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const answer = form.answer.value;
      if (!normalize(answer)) return say('Type something first.');
      if (!(await tryAnswer(answer))) {
        form.answer.select();
        say('Not quite.');
      }
    });
  }

  // 2. Clickable answers
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-answer]');
    if (!el) return;
    e.preventDefault();
    if (!(await tryAnswer(el.dataset.answer))) say(el.dataset.wrong || 'Not quite.');
  });

  // Remember the furthest page reached so the home page can offer "Continue"
  try {
    if (body.dataset.level) localStorage.setItem('riddle-last', location.pathname);
  } catch (_) {}
})();

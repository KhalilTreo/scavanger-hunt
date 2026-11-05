// Answer checking. Turns the typed answer into the next level's URL.
// Must match slug() in build.js exactly.
(function () {
  const body = document.body;
  const salt = body.dataset.salt || '';
  const hashed = body.dataset.hash === '1';
  const form = document.getElementById('answer-form');
  const feedback = document.getElementById('feedback');

  const normalize = (a) => a.toLowerCase().replace(/[^a-z0-9]/g, '');

  async function slug(answer) {
    const norm = normalize(answer);
    if (!hashed) return norm;
    // crypto.subtle needs https:// or http://localhost
    const bytes = new TextEncoder().encode(salt + norm);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  function say(msg) {
    if (feedback) feedback.textContent = msg;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const answer = form.answer.value;
      if (!normalize(answer)) return say('Type something first.');
      const url = (await slug(answer)) + '.html';

      // Check the page exists before leaving, so a wrong answer shows a
      // message instead of a 404. Falls back to navigating if fetch fails.
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (!res.ok) {
          form.answer.select();
          return say('Not quite.');
        }
      } catch (_) { /* opened from disk etc. — just go */ }

      try { localStorage.setItem('riddle-last', location.pathname.replace(/[^/]*$/, url)); } catch (_) {}
      location.href = url;
    });
  }

  // Remember the furthest page reached so the home page can offer "Continue"
  try {
    if (body.dataset.level) localStorage.setItem('riddle-last', location.pathname);
  } catch (_) {}
})();

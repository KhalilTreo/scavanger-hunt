// Space suits players can pick on the start page.
// Loaded on the start page AND every level page.
//
// To add a suit: put its image in src/assets/suits/ and add an entry here.
// `image` is relative to the site root (the folder index.html is in).

const SUITS = [
  { id: 'pathfinder', name: 'Pathfinder', blurb: 'Standard issue. Never lets you down.', image: 'assets/suits/pathfinder.png' },
  { id: 'nebula',     name: 'Nebula',     blurb: 'Tuned for deep-field scans.',          image: 'assets/suits/nebula.png' },
  { id: 'ember',      name: 'Ember',      blurb: 'Heat-shielded for close passes.',      image: 'assets/suits/ember.png' },
  { id: 'abyss',      name: 'Abyss',      blurb: 'Built for the dark between stars.',    image: 'assets/suits/abyss.png' },
];

const SUIT_KEY = 'riddle-suit';

// Level pages live one folder down (in l/), so their image paths need "../" in front.
// Level pages have data-level on <body>; the start page doesn't.
function siteRoot() {
  return document.body && document.body.dataset.level ? '../' : '';
}

// Returns the saved suit, or null if none has been picked.
// localStorage can throw (private mode, blocked storage), hence try/catch.
function getSuit() {
  try {
    const id = localStorage.getItem(SUIT_KEY);
    return SUITS.find((s) => s.id === id) || null;
  } catch (_) {
    return null;
  }
}

function saveSuit(id) {
  try { localStorage.setItem(SUIT_KEY, id); } catch (_) {}
}

// Returns an <img> tag for a suit.
function suitImg(s) {
  return `<img src="${siteRoot()}${s.image}" alt="" draggable="false">`;
}

// On level pages: show the chosen suit in the header badge.
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('suit-badge');
  const suit = getSuit();
  if (badge && suit) {
    badge.innerHTML = suitImg(suit);
    badge.title = suit.name;
  }
});

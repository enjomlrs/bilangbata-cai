/* ══════════════════════════════════════════════════════════════════
   BilangBata – game.js
   Toddler counting game logic  (Vanilla JS, no frameworks)
   ──────────────────────────────────────────────────────────────────
   HOW TO CUSTOMISE:
     1. Edit ASSET_PATHS to point to your local image files.
     2. Edit MODULES to change each module's name, number range, background and props.
     3. Edit the slot arrays (MANGO_SLOTS, ICE_CREAM_SLOTS, BUKO_SLOTS) to control
        where items appear on each vendor.
     4. Edit SICK_DURATION to change how long the sick state lasts (ms).
     5. Module 1 uses a tree overlay (transparent PNG) with mango slots in %.
        Modules 2 & 3 have the vendor built into the background image;
        items are placed directly on the game screen at fixed % positions.
     6. Edit TEACHER_PIN to change the passcode of the Teacher Dashboard.
     7. Student names and results are saved in this browser's localStorage
        (see STUDENT DATA below; the dashboard itself lives in dashboard.js).
══════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   EDITABLE CONSTANTS
────────────────────────────────────────── */

/* Mango hanging spots: centre point (x%, y%) measured on assets/mango_tree.png.
   Every spot lies inside the leafy canopy (never on empty sky or trunk gaps). */
const MANGO_SLOTS = [
  { x: 22, y: 22 }, { x: 42, y: 12 }, { x: 62, y: 18 }, { x: 78, y: 32 },
  { x: 15, y: 45 }, { x: 36, y: 36 }, { x: 60, y: 42 }, { x: 85, y: 52 },
  { x: 28, y: 56 }, { x: 70, y: 54 },
];

/* Ice cream spots on the sorbetes cart (% of the background image).
   Aligned strictly over the flat right-hand stainless-steel counter (x: 44%–62%),
   safely clear of the open silver lid on the left. */
const ICE_CREAM_SLOTS = [
  /* Row 1 – upper tier on the counter */
  { x: 44, y: 57 }, { x: 48.5, y: 57 }, { x: 53, y: 57 }, { x: 57.5, y: 57 }, { x: 62, y: 57 },
  /* Row 2 – lower tier on the counter */
  { x: 44, y: 63 }, { x: 48.5, y: 63 }, { x: 53, y: 63 }, { x: 57.5, y: 63 }, { x: 62, y: 63 },
];

/* Buko spots in the woven rattan bilao basket (% of the background image).
   Organic, brick-staggered 15-buko pyramid mound (4-5-6) nestled inside the bilao. */
const BUKO_SLOTS = [
  /* Row 1 – top peak of the mound (4 bukos) */
  { x: 42.5, y: 54.2 }, { x: 47.5, y: 53.8 }, { x: 52.5, y: 53.8 }, { x: 57.5, y: 54.2 },
  /* Row 2 – staggered middle layer (5 bukos) */
  { x: 40.0, y: 57.8 }, { x: 45.0, y: 57.4 }, { x: 50.0, y: 57.4 }, { x: 55.0, y: 57.4 }, { x: 60.0, y: 57.8 },
  /* Row 3 – front layer nestled against the bilao rim (6 bukos) */
  { x: 38.0, y: 61.2 }, { x: 42.8, y: 61.6 }, { x: 47.6, y: 61.8 }, { x: 52.4, y: 61.8 }, { x: 57.2, y: 61.6 }, { x: 62.0, y: 61.2 },
];

/* Subtle per-slot stem tilts (deg) and depth row index (1=top/back .. 3=front) */
const BUKO_TILTS = [-8, -3, 4, 9, -10, -4, 2, -5, 8, -11, -5, 3, -3, 6, 11];

/* Each module has its own setting (background), number range, props,
   vendor image, draggable item, and item slots.
   vendorOverlay = true  → items are children of #tree-wrapper (Module 1, mango tree)
   vendorOverlay = false → vendor is in the bg, items placed on #screen-game (Modules 2 & 3)
   distractors   = which non-edible items appear (tire / rock / wood).
   house         = whether the Bahay Kubo is shown in the background. */
const MODULES = [
  {
    name: 'Palayan', min: 1, max: 5,
    bg: 'assets/bg_province.jpg', house: true,
    distractors: [],
    intro: 'Count the mangoes in the countryside!',
    vendorOverlay: true,
    vendor: 'assets/mango_tree.png',
    item: 'assets/mango.png',
    itemType: 'mango',
    itemLabel: 'mangoes',
    itemEmoji: '🥭',
    slots: MANGO_SLOTS,
  },
  {
    name: 'Luneta Park', min: 6, max: 10,
    bg: 'assets/bg_luneta.jpg', house: false,
    distractors: [],
    intro: 'Grab some sorbetes for Bantay!',
    vendorOverlay: false,
    item: 'assets/ice_cream.jpg',
    itemType: 'food',
    itemLabel: 'ice creams',
    itemEmoji: '🍦',
    slots: ICE_CREAM_SLOTS,
  },
  {
    name: 'Boracay', min: 1, max: 10,
    bg: 'assets/bg_boracay.jpg', house: false,
    distractors: ['tire', 'rock', 'wood'],
    intro: 'Watch out for beach items! Only feed Bantay bukos!',
    vendorOverlay: false,
    item: 'assets/buko.jpg',
    itemType: 'food',
    itemLabel: 'bukos',
    itemEmoji: '🥥',
    slots: BUKO_SLOTS,
  },
];

const SICK_DURATION = 2000; // ms to show sick/vomit state after wrong drop

const ITEM_WIDTH_PCT  = 8.5;        // must match .mango-on-tree width in style.css
const MANGO_ASPECT    = 702 / 644;  // mango.png width / height
const TREE_ASPECT     = 826 / 1029; // mango_tree.png width / height

/* ──────────────────────────────────────────
   ASSET PATHS  ← SWAP THESE FOR YOUR FILES
   All paths are relative to index.html
────────────────────────────────────────── */
const ASSET_PATHS = {
  // Landing page scene backgrounds
  landing_luneta_bg  : 'assets/bg_luneta_novendor.jpg',
  landing_boracay_bg : 'assets/bg_boracay_novendor.jpg',

  // Dog states — swapped automatically by the game engine
  dog_thin     : 'assets/puppy_sad.jpg',       // 0 items fed
  dog_medium   : 'assets/puppy_mid.jpg',        // 1–49 % of target
  dog_happy    : 'assets/puppy_happy 1.jpg',    // 50–99 % of target
  dog_muscular : 'assets/puppy_muscular.jpg',   // 100 % of target (fully fed)
  dog_fat      : 'assets/puppy_fat.jpg',        // fed MORE than target
  dog_sick     : 'assets/puppy_sick.jpg',       // wrong item dropped
};

/* Optional custom .mp3 recordings (leave '' to use built-in SoundFX chimes) */
const VOICE_FILES = {
  bgm  : '', // e.g. 'assets/sounds/bg_music.mp3'
  yip  : '', // e.g. 'assets/sounds/bantay_yip.mp3'
  count: '', // e.g. 'assets/sounds/count_pop.mp3'
  pop  : '',
  oops : '',
  win  : '',
};

/* ──────────────────────────────────────────
   TEACHER SETTINGS
────────────────────────────────────────── */
const TEACHER_PIN = '1234'; // passcode for the Teacher Dashboard (⚙️ button)

/* localStorage keys – student data stays on THIS device / browser */
const STORE_RECORDS = 'bilangbata.records.v1'; // every round played
const STORE_ROSTER  = 'bilangbata.roster.v1';  // every student name entered
const STORE_MODULE  = 'bilangbata.module';     // module the teacher last selected

/* ──────────────────────────────────────────
   DOM REFERENCES
────────────────────────────────────────── */
const fedTray        = document.getElementById('fed-tray');
const fedList        = document.getElementById('fed-list');
const imgGameBg      = document.getElementById('img-game-bg');
const imgHouse       = document.getElementById('img-bahay-kubo');
const moduleLabel    = document.getElementById('module-label');
const moduleBanner   = document.getElementById('module-banner');
const bannerTitle    = document.getElementById('module-banner-title');
const bannerSub      = document.getElementById('module-banner-sub');
const feedbackToast  = document.getElementById('feedback-toast');
const btnDone        = document.getElementById('btn-done');
const fedHint        = document.getElementById('fed-hint');
const winTitle       = document.getElementById('win-title');
const winText        = document.getElementById('win-text');
const screenLanding      = document.getElementById('screen-landing');
const landingVendorsWave = document.getElementById('landing-vendors-wave');
const landingPuppyWrap   = document.getElementById('landing-puppy-wrapper');
const imgLandingPuppy    = document.getElementById('img-landing-puppy');
const imgLandingLuneta     = document.getElementById('img-landing-luneta');
const imgLandingBoracaySky = document.getElementById('img-landing-boracay-sky');
const imgLandingBoracay    = document.getElementById('img-landing-boracay');
const screenGame         = document.getElementById('screen-game');
const btnPlay       = document.getElementById('btn-play');
const btnPlayAgain  = document.getElementById('btn-play-again');
const btnMusic      = document.getElementById('btn-music');
const imgBantay     = document.getElementById('img-bantay');
const bantayWrapper = document.getElementById('bantay-wrapper');
const bubbleTarget  = document.getElementById('bubble-target');
const bubbleCount   = document.getElementById('bubble-count');
const bubbleText    = document.getElementById('bubble-text');
const speechBubble  = document.getElementById('speech-bubble');
const btnSpeak      = document.getElementById('btn-speak');
const scoreEmoji    = document.getElementById('score-emoji');
const scoreDisplay  = document.getElementById('score-display');
const treeWrapper    = document.getElementById('tree-wrapper');
const imgVendor      = document.getElementById('img-mango-tree');
const lunetaDecor    = document.getElementById('luneta-decor');
const sorbetesRack   = document.getElementById('sorbetes-rack');
const rackLegL       = document.getElementById('rack-leg-l');
const rackLegR       = document.getElementById('rack-leg-r');
const rackTopBar     = document.getElementById('rack-top-bar');
const rackTopTrim    = document.getElementById('rack-top-trim');
const rackBotBar     = document.getElementById('rack-bot-bar');
const rackBotTrim    = document.getElementById('rack-bot-trim');
const rackSlotsGroup = document.getElementById('rack-slots');
const bukoBasketBack = document.getElementById('buko-basket-back');
const bukoBasketFront= document.getElementById('buko-basket-front');
const dragGhost      = document.getElementById('drag-ghost');
const winOverlay    = document.getElementById('win-overlay');
const wrongFlash      = document.getElementById('wrong-flash');
const overfedOverlay  = document.getElementById('overfed-overlay');
const overfedCount    = document.getElementById('overfed-count');
const overfedTarget   = document.getElementById('overfed-target');
const btnOverfedRetry = document.getElementById('btn-overfed-retry');
const screenName      = document.getElementById('screen-name');
const nameForm        = document.getElementById('name-form');
const nameInput       = document.getElementById('name-input');
const nameError       = document.getElementById('name-error');
const nameModule      = document.getElementById('name-module');
const nameChipsWrap   = document.getElementById('name-chips-wrap');
const nameChips       = document.getElementById('name-chips');
const studentChip     = document.getElementById('student-chip');
const studentChipName = document.getElementById('student-chip-name');
const btnNextStudent  = document.getElementById('btn-next-student');
const btnNameHome     = document.getElementById('btn-name-home');

/* ──────────────────────────────────────────
   GAME STATE
────────────────────────────────────────── */
let moduleIndex    = 0;     // always start on Module 1 (Palayan) on every fresh page load
let targetCount    = 0;     // randomly chosen target for the round
let currentCount   = 0;     // items successfully fed to Bantay
let fedSlots       = [];    // slot index of every item Bantay has eaten (in order)
let isSick        = false; // true while vomit animation is playing
let gameComplete  = false; // true once the win condition is met
let musicOn       = true;
let currentStudent = '';    // name typed on the "What's your name?" screen
let currentAttempt = null;  // the round being recorded for the Teacher Dashboard

/* ──────────────────────────────────────────
   DRAG STATE  (custom pointer-event drag)
────────────────────────────────────────── */
let activeDrag  = null; // element currently being dragged
let dragOffsetX = 0;    // horizontal offset: pointer → element centre
let dragOffsetY = 0;    // vertical offset:   pointer → element centre
let dragLiftY   = 0;    // vertical touch lift (-38px so finger doesn't hide item)

/* ══════════════════════════════════════════
   SCREEN TRANSITION
══════════════════════════════════════════ */
// Landing → Bantay asks the student's name → Game
btnPlay.addEventListener('click', () => {
  screenLanding.classList.add('hidden');
  openNameScreen();
});

// Apply landing asset paths cleanly from ASSET_PATHS without breaking fallback state
function applyLandingSceneImage(imgEl, targetSrc, fallbackSrc) {
  if (!imgEl || imgEl.dataset.fb === '1') return;
  if (imgEl.getAttribute('src') === fallbackSrc && imgEl.complete && imgEl.naturalWidth > 0) return;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.dataset.fb = '1';
    imgEl.src = fallbackSrc;
  };
  if (imgEl.getAttribute('src') !== targetSrc) {
    imgEl.src = targetSrc;
  } else if (imgEl.complete && imgEl.naturalWidth === 0) {
    imgEl.onerror();
  }
}
applyLandingSceneImage(imgLandingLuneta, ASSET_PATHS.landing_luneta_bg, 'assets/bg_luneta.jpg');
applyLandingSceneImage(imgLandingBoracaySky, ASSET_PATHS.landing_boracay_bg, 'assets/bg_boracay.jpg');
applyLandingSceneImage(imgLandingBoracay, ASSET_PATHS.landing_boracay_bg, 'assets/bg_boracay.jpg');
if (imgLandingPuppy) imgLandingPuppy.src = ASSET_PATHS.dog_happy;

// Tapping Happy Bantay or the waving vendors gives a happy bounce & puppy yip
function bindLandingGreet(wrap, animTargets) {
  if (!wrap) return;
  const fire = () => {
    SoundFX.unlock();
    animTargets.forEach(el => el && triggerAnim(el, 'happy'));
    SoundFX.playPuppyYip();
  };
  wrap.addEventListener('click', fire);
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fire();
    }
  });
}
bindLandingGreet(landingPuppyWrap, [imgLandingPuppy]);
bindLandingGreet(landingVendorsWave, Array.from(document.querySelectorAll('#landing-vendors-wave .vendor-svg')));

// Replay the same module with a new random number (same student)
btnPlayAgain.addEventListener('click', () => {
  winOverlay.classList.remove('show');
  removeConfetti();
  initGame();
});

// Same module, next student in line → Bantay asks for the new name
btnNextStudent.addEventListener('click', () => {
  winOverlay.classList.remove('show');
  removeConfetti();
  openNameScreen();
});

// Tap the name tag (top-left) to switch to another student mid-round
studentChip.addEventListener('click', (e) => {
  e.stopPropagation();
  winOverlay.classList.remove('show');
  removeConfetti();
  openNameScreen();
});

/* ══════════════════════════════════════════
   STUDENT NAME SCREEN  (Bantay asks "What's your name?")
══════════════════════════════════════════ */
function openNameScreen() {
  screenGame.classList.add('hidden');
  screenName.classList.remove('hidden');
  nameModule.textContent = `Today's stage: ${moduleTitle(MODULES[moduleIndex])}`;
  nameInput.value = '';
  nameError.textContent = '';
  renderNameChips();
  setTimeout(() => nameInput.focus(), 350);
}

if (btnNameHome) {
  btnNameHome.addEventListener('click', () => {
    nameInput.value = '';
    nameError.textContent = '';
    nameInput.blur();
    screenName.classList.add('hidden');
    screenGame.classList.add('hidden');
    screenLanding.classList.remove('hidden');
  });
}

/** Buttons for students who already typed their name before */
function renderNameChips() {
  const names = roster.map(s => s.name).sort((a, b) => a.localeCompare(b));
  nameChipsWrap.hidden = names.length === 0;
  nameChips.innerHTML = '';
  names.forEach(n => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'name-chip';
    b.textContent = n;
    b.addEventListener('click', () => startAsStudent(n));
    nameChips.appendChild(b);
  });
}

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = cleanName(nameInput.value);
  if (!name) {
    nameError.textContent = 'Please type your name first! 😊';
    nameInput.focus();
    return;
  }
  startAsStudent(name);
});

function startAsStudent(name) {
  currentStudent = registerStudent(name);
  studentChipName.textContent = currentStudent;
  screenName.classList.add('hidden');
  screenGame.classList.remove('hidden');
  initGame();
}

/* ══════════════════════════════════════════
   STUDENT DATA  (saved in localStorage, shown in dashboard.js)
   One "attempt" = one round: a new random number, until the student
   gets it right or leaves the round (new student / other module).
══════════════════════════════════════════ */
let records = loadJSON(STORE_RECORDS, []);
let roster  = loadJSON(STORE_ROSTER,  []);

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch (err) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (err) { console.warn('BilangBata: could not save data', err); }
}

function loadModuleIndex() {
  try { localStorage.removeItem(STORE_MODULE); } catch (_) {}
  return 0;
}

function saveModuleIndex() {
  // Intentionally not persisted: every fresh page load starts on Module 1 (Palayan).
}

try { localStorage.removeItem(STORE_MODULE); } catch (_) {}

function cleanName(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

/** Add a student to the roster (matching is not case-sensitive).
    Returns the spelling that was saved first, so "juan" and "Juan" are one student. */
function registerStudent(name) {
  const found = roster.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (found) return found.name;
  roster.push({ name, added: Date.now() });
  saveJSON(STORE_ROSTER, roster);
  return name;
}

/** Called by initGame: prepare a fresh round (saved on the first action) */
function startAttempt() {
  const mod = MODULES[moduleIndex];
  currentAttempt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    student: currentStudent || 'Guest',
    module: moduleIndex,
    moduleName: mod.name,
    target: targetCount,
    start: Date.now(),
    last: Date.now(),
    end: null,
    completed: false,
    checks: [],    // the count given each time "Done Feeding" was pressed
    takeBacks: 0,  // items taken back from Bantay
    overfed: 0,    // times the student fed MORE than asked
    nonFood: [],   // non-food items dropped on Bantay (tire / rock / wood)
  };
}

/** Update the current round and save it. A round is only stored once the
    student actually does something, so empty rounds don't clutter the data. */
function trackAttempt(update) {
  if (!currentAttempt) return;
  if (!records.includes(currentAttempt)) records.push(currentAttempt);
  update(currentAttempt);
  currentAttempt.last = Date.now();
  saveJSON(STORE_RECORDS, records);
}

/** "Done Feeding" pressed: remember the answer given */
function recordCheck() {
  trackAttempt(a => {
    a.checks.push(currentCount);
    if (currentCount === targetCount) {
      a.completed = true;
      a.end = Date.now();
    }
  });
}

/* ══════════════════════════════════════════
   GAME INITIALISATION
══════════════════════════════════════════ */
function initGame() {
  const mod = MODULES[moduleIndex];

  gameComplete   = false;
  isSick         = false;
  currentCount   = 0;
  fedSlots       = [];
  btnDone.disabled = false;
  hideToast();

  // Pick a random target inside THIS module's range
  targetCount = Math.floor(Math.random() * (mod.max - mod.min + 1)) + mod.min;

  // Teacher Dashboard: remember the module and start recording this round
  saveModuleIndex();
  startAttempt();

  applyModule(mod);
  updateBubble();
  renderFedTray();
  // Ensure initial thin weight-progression scaling is applied cleanly
  updateDogState();
  spawnItems();
  SoundFX.playPuppyYip();
}

/* ══════════════════════════════════════════
   KID-FRIENDLY WEB AUDIO SOUND EFFECTS
   Zero-dependency AudioContext chimes & playful puppy sounds.
   Respects musicOn and supports optional VOICE_FILES overrides.
══════════════════════════════════════════ */
const SoundFX = (() => {
  let ctx = null;
  let bgmTimer   = null;
  let bgmAudio   = null;
  let bgmPlaying = false;
  let bgmStep    = 0;

  const PENTATONIC = [
    523.25, 587.33, 659.25, 783.99, 880.00,
    1046.50, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00,
  ];

  // 16-beat (4-bar) nursery-style C Major loop at ~112 BPM
  const BGM_BEAT_MS = Math.round(60000 / 112);
  const BGM_MELODY  = [
    523.25, 659.25, 783.99, 880.00, // C5, E5, G5, A5
    783.99, 659.25, 587.33, 659.25, // G5, E5, D5, E5
    783.99, 659.25, 587.33, 523.25, // G5, E5, D5, C5
    587.33, 659.25, 783.99, 523.25, // D5, E5, G5, C5
  ];
  // Root-fifth bass notes aligned to C3, G3, F3, G3 across 4 bars (even beats)
  const BGM_BASS = {
    0 : 130.81, // C3
    2 : 196.00, // G3
    4 : 196.00, // G3
    6 : 293.66, // D4
    8 : 174.61, // F3
    10: 261.63, // C4
    12: 196.00, // G3
    14: 293.66, // D4
  };

  function getContext() {
    if (!musicOn) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (_) {
      return null;
    }
  }

  function isDashboardOpen() {
    const dash = document.getElementById('dashboard');
    return !!(dash && !dash.hidden);
  }

  function unlock() {
    if (isDashboardOpen() || !getContext()) return;
    if (musicOn && !document.hidden) startBgm();
  }

  function playBgmStep() {
    if (!musicOn || !bgmPlaying || document.hidden) return;
    const step = bgmStep % BGM_MELODY.length;
    const melFreq = BGM_MELODY[step];
    playTone(melFreq, 0, 0.28, 'sine', 0.045);
    playTone(melFreq * 2, 0, 0.14, 'triangle', 0.012);

    const bassFreq = BGM_BASS[step];
    if (bassFreq) {
      playTone(bassFreq, 0, 0.42, 'sine', 0.035);
    }
    bgmStep = (step + 1) % BGM_MELODY.length;
  }

  function startBgm() {
    if (!musicOn || document.hidden || bgmPlaying || isDashboardOpen()) return;

    if (VOICE_FILES.bgm) {
      bgmPlaying = true;
      try {
        if (!bgmAudio || bgmAudio.getAttribute('src') !== VOICE_FILES.bgm) {
          if (bgmAudio) bgmAudio.pause();
          bgmAudio = new Audio(VOICE_FILES.bgm);
          bgmAudio.loop = true;
          bgmAudio.volume = 0.35;
        }
        bgmAudio.play().catch(() => {});
      } catch (_) {}
      return;
    }

    if (!getContext()) return;
    bgmPlaying = true;
    playBgmStep();
    bgmTimer = setInterval(playBgmStep, BGM_BEAT_MS);
  }

  function stopBgm() {
    bgmPlaying = false;
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    if (bgmAudio) {
      try { bgmAudio.pause(); } catch (_) {}
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopBgm();
    } else if (musicOn && (ctx || VOICE_FILES.bgm)) {
      startBgm();
    }
  });

  function playCustom(key) {
    const src = VOICE_FILES[key];
    if (!src || !musicOn) return false;
    try {
      const a = new Audio(src);
      a.volume = 0.85;
      a.play().catch(() => {});
      return true;
    } catch (_) {
      return false;
    }
  }

  function playTone(freq, startOffset, duration, type = 'sine', peakGain = 0.18, endFreq = null) {
    const ac = getContext();
    if (!ac) return;
    try {
      const now  = ac.currentTime + startOffset;
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq != null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (_) {}
  }

  /** Bright marimba note ascending a major pentatonic scale as items are fed */
  function playCountNote(count) {
    if (playCustom('count') || !musicOn) return;
    const idx  = Math.max(0, (count - 1) % PENTATONIC.length);
    const freq = PENTATONIC[idx];
    playTone(freq, 0, 0.28, 'sine', 0.22);
    playTone(freq * 2, 0, 0.14, 'triangle', 0.06);
  }

  /** Cute two-tone rising puppy yip */
  function playPuppyYip() {
    if (playCustom('yip') || !musicOn) return;
    playTone(430, 0,    0.09, 'triangle', 0.16, 700);
    playTone(500, 0.13, 0.11, 'triangle', 0.18, 820);
  }

  /** Soft downward bubble pop when returning an item from #fed-tray */
  function playPop() {
    if (playCustom('pop') || !musicOn) return;
    playTone(560, 0, 0.10, 'sine', 0.16, 230);
  }

  /** Playful descending slide/boing for wrong drops or overfeeding */
  function playOops() {
    if (playCustom('oops') || !musicOn) return;
    playTone(360, 0,    0.16, 'triangle', 0.18, 210);
    playTone(240, 0.14, 0.22, 'sine',     0.18, 130);
  }

  /** Bright 4-note celebratory chime (C5 - E5 - G5 - C6) */
  function playWinFanfare() {
    if (playCustom('win') || !musicOn) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      const dur = i === notes.length - 1 ? 0.45 : 0.20;
      playTone(f, i * 0.11, dur, 'sine', 0.20);
      playTone(f * 2, i * 0.11, dur * 0.6, 'triangle', 0.05);
    });
  }

  return { unlock, startBgm, stopBgm, playCountNote, playPuppyYip, playPop, playOops, playWinFanfare };
})();

// Unlock Web Audio on the student's first tap or click
window.addEventListener('pointerdown', SoundFX.unlock, { passive: true });
window.addEventListener('keydown', SoundFX.unlock, { passive: true });

speechBubble.addEventListener('click', () => {
  SoundFX.playPuppyYip();
});

btnSpeak.addEventListener('click', (e) => {
  e.stopPropagation();
  SoundFX.playPuppyYip();
});

/* ══════════════════════════════════════════
   MODULES  (setting changes per module)
══════════════════════════════════════════ */
function moduleTitle(mod) {
  return `Module ${MODULES.indexOf(mod) + 1}: ${mod.name} (${mod.min}\u2013${mod.max})`;
}

/** Return singular item name when count === 1, otherwise the plural label */
function formatItemLabel(count, pluralLabel) {
  if (count !== 1) return pluralLabel;
  if (pluralLabel === 'mangoes')    return 'mango';
  if (pluralLabel === 'ice creams') return 'ice cream';
  if (pluralLabel === 'bukos')      return 'buko';
  return pluralLabel.replace(/s$/, '');
}

/** Swap the background, house, vendor, containers, and props, and announce the module */
function applyModule(mod) {
  moduleLabel.textContent = moduleTitle(mod);

  setBackground(mod.bg);
  imgHouse.classList.toggle('module-hidden', !mod.house);

  // Show mango tree overlay only for modules that use vendorOverlay
  treeWrapper.classList.toggle('module-hidden', !mod.vendorOverlay);
  if (mod.vendorOverlay && mod.vendor) {
    imgVendor.src = mod.vendor;
  }

  // Grounded item containers & Module 2 foreground plaza decor
  const isSorbetes = !mod.vendorOverlay && mod.slots === ICE_CREAM_SLOTS;
  const isBuko     = !mod.vendorOverlay && mod.slots === BUKO_SLOTS;
  lunetaDecor.classList.toggle('module-hidden', MODULES.indexOf(mod) !== 1);
  sorbetesRack.classList.toggle('module-hidden', !isSorbetes);
  bukoBasketBack.classList.toggle('module-hidden', !isBuko);
  bukoBasketFront.classList.toggle('module-hidden', !isBuko);

  document.querySelectorAll('.non-edible').forEach(el => {
    el.classList.toggle('module-hidden', !mod.distractors.includes(el.dataset.name));
  });

  // Tag #screen-game with the current module so CSS can adapt portrait framing
  screenGame.dataset.module = String(MODULES.indexOf(mod));

  // Update the speech bubble text for this module's item
  bubbleText.innerHTML = `Can you feed me <strong id="bubble-target">${targetCount}</strong> ${formatItemLabel(targetCount, mod.itemLabel)}?`;

  showBanner(`Module ${MODULES.indexOf(mod) + 1}: ${mod.name}`, mod.intro);
  requestAnimationFrame(layoutScreenItems);
}

/** Crossfade to a new background image */
function setBackground(src) {
  if (imgGameBg.getAttribute('src') === src) {
    requestAnimationFrame(layoutScreenItems);
    return;
  }
  imgGameBg.classList.add('fading');
  setTimeout(() => {
    imgGameBg.onload = () => {
      imgGameBg.classList.remove('fading');
      layoutScreenItems();
    };
    imgGameBg.src = src;
  }, 350);
}

let bannerTimer = null;
function showBanner(title, sub) {
  bannerTitle.textContent = title;
  bannerSub.textContent   = sub;
  moduleBanner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => moduleBanner.classList.remove('show'), 2400);
}

/* ─── Feedback toast ─── */
let toastTimer = null;
function showToast(msg, tooMany) {
  feedbackToast.textContent = msg;
  feedbackToast.classList.toggle('too-many', !!tooMany);
  feedbackToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 3000);
}
function hideToast() {
  feedbackToast.classList.remove('show');
}

/* ══════════════════════════════════════════
   DONE FEEDING  (student checks their answer)
══════════════════════════════════════════ */
btnDone.addEventListener('click', () => {
  if (gameComplete || isSick) return;
  const mod = MODULES[moduleIndex];
  recordCheck();

  if (currentCount === targetCount) {
    triggerWin();
  } else if (currentCount < targetCount) {
    showToast(`Bantay is still hungry! Feed him some more ${mod.itemLabel}. ${mod.itemEmoji}`);
    triggerAnim(imgBantay, 'shake');
    SoundFX.playPuppyYip();
  } else {
    // Overfed: show a full-screen feedback overlay with the fat dog
    triggerOverfed();
  }
});

/* ══════════════════════════════════════════
   OVERFED FEEDBACK  (shown when Done is pressed with too many items)
══════════════════════════════════════════ */
function triggerOverfed() {
  overfedCount.textContent  = currentCount;
  overfedTarget.textContent = targetCount;
  setDogImage(ASSET_PATHS.dog_fat, 'fat');
  triggerAnim(imgBantay, 'wobble');
  overfedOverlay.classList.add('show');
  SoundFX.playOops();
}

btnOverfedRetry.addEventListener('click', () => {
  overfedOverlay.classList.remove('show');
  // Dog stays fat until they take items back
});

/* ──────────────────────────────────────────
   SPEECH BUBBLE & SCORE BADGE
────────────────────────────────────────── */
function updateBubble() {
  const mod = MODULES[moduleIndex];
  // Re-set the inner HTML so the bubble-target strong gets recreated
  bubbleText.innerHTML = `Can you feed me <strong id="bubble-target">${targetCount}</strong> ${formatItemLabel(targetCount, mod.itemLabel)}?`;
  bubbleCount.textContent  = `${currentCount} / ${targetCount}`;
  scoreEmoji.textContent   = mod.itemEmoji;
  scoreDisplay.textContent = `${currentCount} / ${targetCount}`;
}

/* ──────────────────────────────────────────
   DOG STATE MACHINE
   Progress thresholds (fraction of target):
     0 %        → thin     (sad, just started)
     1–49 %     → medium   (getting started)
     50–99 %    → happy    (halfway there!)
     100 %      → muscular (perfectly fed – right amount!)
     > 100 %    → fat      (overfed!)
     wrong drop → sick     (2 s), then revert
────────────────────────────────────────── */
function updateDogState() {
  if (isSick) return; // Don't interrupt sick animation

  if (currentCount > targetCount) {
    setDogImage(ASSET_PATHS.dog_fat, 'fat');
    return;
  }

  const ratio = targetCount > 0 ? currentCount / targetCount : 0;

  if (ratio === 0) {
    setDogImage(ASSET_PATHS.dog_thin, 'thin');
  } else if (ratio < 0.50) {
    setDogImage(ASSET_PATHS.dog_medium, 'medium');
  } else if (ratio < 1) {
    setDogImage(ASSET_PATHS.dog_happy, 'happy');
  } else {
    // ratio === 1 — exactly the right amount
    setDogImage(ASSET_PATHS.dog_muscular, 'muscular');
  }
}

/** Swap the dog's image src and update data-state for CSS weight progression scaling */
function setDogImage(src, state) {
  imgBantay.src = src;
  if (state) imgBantay.dataset.state = state;
}

/* ══════════════════════════════════════════
   SPAWN ITEMS ON THE VENDOR / SCREEN
   Module 1 (vendorOverlay = true):
     Items are children of #tree-wrapper positioned as % of the tree.
   Modules 2 & 3 (vendorOverlay = false):
     Vendor is part of the background image.
     Items are placed directly on #screen-game at screen % positions.
══════════════════════════════════════════ */
/** Play a pop-in entrance animation with an optional stagger delay */
function triggerPopIn(el, delayMs = 0) {
  el.classList.remove('pop-in');
  void el.offsetWidth;
  el.style.setProperty('--pop-delay', `${delayMs}ms`);
  el.classList.add('pop-in');

  if (el.dataset.popBound !== '1') {
    el.dataset.popBound = '1';
    el.addEventListener('animationend', (e) => {
      if (e.animationName !== 'mangoPop') return;
      el.classList.remove('pop-in');
      el.style.removeProperty('--pop-delay');
    });
  }
}

function spawnItems() {
  // Remove any existing items from BOTH possible parents
  treeWrapper.querySelectorAll('.mango-on-tree').forEach(el => el.remove());
  screenGame.querySelectorAll('.screen-item').forEach(el => el.remove());

  const mod    = MODULES[moduleIndex];
  const isBuko = mod.slots === BUKO_SLOTS;
  mod.slots.forEach((_, i) => placeItem(i, isBuko, isBuko ? i * 30 : 0));

  if (isBuko) {
    screenGame.querySelectorAll('.non-edible:not(.module-hidden)').forEach((el, idx) => {
      triggerPopIn(el, idx * 45);
    });
  }

  layoutScreenItems();
}

/** Position .screen-item elements relative to the rendered background image
    so they stay locked to the cart / stall counter on every screen size. */
function layoutScreenItems() {
  const mod = MODULES[moduleIndex];
  if (!mod || mod.vendorOverlay) return;

  const items = screenGame.querySelectorAll('.screen-item');
  if (!items.length) return;

  const cw = screenGame.clientWidth;
  const ch = screenGame.clientHeight;
  if (!cw || !ch) return;

  const natW = imgGameBg.naturalWidth  || 1376;
  const natH = imgGameBg.naturalHeight || 768;

  // Match the CSS layout of #img-game-bg:
  // On portrait screens, Modules 2 & 3 leave a bottom ground gap (19%)
  // with height 66% (top 15%) so the cart/stall clears Bantay's bubble.
  const isPortrait = cw < ch;
  const boxW = cw;
  const boxH = isPortrait ? ch * 0.66 : ch;
  const boxTop = isPortrait ? ch * 0.15 : 0;

  const scale = Math.max(boxW / natW, boxH / natH);
  const drawW = natW * scale;
  const drawH = natH * scale;
  const offsetX = (boxW - drawW) / 2;
  const offsetY = boxTop + (boxH - drawH); // object-position: center bottom

  // Scale item size proportionally with the rendered background (no portrait spreadFactor)
  const isBuko = mod.slots === BUKO_SLOTS;
  const itemPx = isBuko
    ? (isPortrait
        ? Math.max(48, Math.min(66, Math.round(drawW * 0.056)))
        : Math.max(46, Math.min(82, Math.round(drawW * 0.060))))
    : (isPortrait
        ? Math.max(40, Math.min(54, Math.round(drawW * 0.044)))
        : Math.max(36, Math.min(64, Math.round(drawW * 0.046))));

  // Compute screen pixel coords for every slot directly on the background image
  const coords = mod.slots.map(slot => ({
    x: offsetX + (slot.x / 100) * drawW,
    y: offsetY + (slot.y / 100) * drawH,
  }));

  items.forEach(item => {
    const idx = Number(item.dataset.slot);
    const pt  = coords[idx];
    if (!pt) return;
    item.style.left  = `${pt.x}px`;
    item.style.top   = `${pt.y}px`;
    item.style.width = `${itemPx}px`;
  });

  layoutContainers(mod, coords, itemPx, offsetX, offsetY, drawW, drawH);
}

/** Position & size the Module 2 sorbetes cone rack and Module 3 buko bilao
    basket directly on top of the cart / counter using exact image metrics. */
function layoutContainers(mod, coords, itemPx, offsetX, offsetY, drawW, drawH) {
  if (!coords.length) return;
  const ys = coords.map(c => c.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  if (mod.slots === ICE_CREAM_SLOTS) {
    // ─── Module 2: Compact 2-tier apa cone holder stand (strictly x: 42%–64%) ───
    const rackL = offsetX + 0.42 * drawW;
    const rackW = Math.round(0.22 * drawW);
    const rackT = minY + itemPx * 0.04;
    const rackH = Math.round((maxY - minY) + itemPx * 0.44);

    sorbetesRack.style.left   = `${rackL}px`;
    sorbetesRack.style.top    = `${rackT}px`;
    sorbetesRack.style.width  = `${rackW}px`;
    sorbetesRack.style.height = `${rackH}px`;
    sorbetesRack.setAttribute('viewBox', `0 0 ${rackW} ${rackH}`);

    const shelfH = Math.max(10, Math.round(itemPx * 0.30));
    const yRow1  = Math.round((minY - rackT) + itemPx * 0.16);
    const yRow2  = Math.round((maxY - rackT) + itemPx * 0.16);

    rackLegL.setAttribute('x', 8);
    rackLegL.setAttribute('y', yRow1 + 4);
    rackLegL.setAttribute('width', 8);
    rackLegL.setAttribute('height', Math.max(14, (yRow2 - yRow1) + shelfH - 2));

    rackLegR.setAttribute('x', Math.max(16, rackW - 16));
    rackLegR.setAttribute('y', yRow1 + 4);
    rackLegR.setAttribute('width', 8);
    rackLegR.setAttribute('height', Math.max(14, (yRow2 - yRow1) + shelfH - 2));

    rackTopBar.setAttribute('x', 4);
    rackTopBar.setAttribute('y', yRow1);
    rackTopBar.setAttribute('width', Math.max(20, rackW - 8));
    rackTopBar.setAttribute('height', shelfH);

    rackTopTrim.setAttribute('x', 4);
    rackTopTrim.setAttribute('y', yRow1 + shelfH - 5);
    rackTopTrim.setAttribute('width', Math.max(20, rackW - 8));
    rackTopTrim.setAttribute('height', 6);

    rackBotBar.setAttribute('x', 1);
    rackBotBar.setAttribute('y', yRow2);
    rackBotBar.setAttribute('width', Math.max(24, rackW - 2));
    rackBotBar.setAttribute('height', shelfH + 2);

    rackBotTrim.setAttribute('x', 1);
    rackBotTrim.setAttribute('y', yRow2 + shelfH - 4);
    rackBotTrim.setAttribute('width', Math.max(24, rackW - 2));
    rackBotTrim.setAttribute('height', 6);

    const holeRx = Math.max(7, Math.round(itemPx * 0.21));
    const holeRy = Math.max(3, Math.round(itemPx * 0.08));
    rackSlotsGroup.innerHTML = coords.map(pt => {
      const cx = Math.round(pt.x - rackL);
      const cy = Math.round((pt.y - rackT) + itemPx * 0.24);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${holeRx}" ry="${holeRy}" fill="#3b1d07" stroke="#2b1a10" stroke-width="2" />`;
    }).join('');
  } else if (mod.slots === BUKO_SLOTS) {
    // ─── Module 3: Shallow woven rattan bilao basket (x: 33.5%–66.5%, centered on 50%) ───
    const backL = offsetX + 0.335 * drawW;
    const backW = 0.33 * drawW;
    const backT = offsetY + 0.542 * drawH;
    const backH = 0.128 * drawH;

    bukoBasketBack.style.left   = `${backL}px`;
    bukoBasketBack.style.top    = `${backT}px`;
    bukoBasketBack.style.width  = `${backW}px`;
    bukoBasketBack.style.height = `${backH}px`;

    const frontT = offsetY + 0.620 * drawH;
    const frontH = 0.050 * drawH;

    bukoBasketFront.style.left   = `${backL}px`;
    bukoBasketFront.style.top    = `${frontT}px`;
    bukoBasketFront.style.width  = `${backW}px`;
    bukoBasketFront.style.height = `${frontH}px`;
  }
}

window.addEventListener('resize', layoutScreenItems);
imgGameBg.addEventListener('load', layoutScreenItems);

/** Create the draggable item for slot `i` */
function placeItem(i, animate, popDelay = 0) {
  const mod  = MODULES[moduleIndex];
  const slot = mod.slots[i];

  if (mod.vendorOverlay) {
    // ─── Module 1: Place item on the tree wrapper (existing mango-on-tree logic) ───
    const wPct = ITEM_WIDTH_PCT;
    const hPct = (ITEM_WIDTH_PCT / MANGO_ASPECT) * TREE_ASPECT;

    const item = document.createElement('img');
    item.id           = `item-${i}`;
    item.className    = 'mango-on-tree' + (animate ? ' pop-in' : '');
    item.src          = mod.item;
    item.alt          = `A ${mod.itemLabel.replace(/s$/, '')}`;
    item.draggable    = false;
    item.dataset.type = 'food';
    item.dataset.slot = i;
    item.style.left   = `${slot.x - wPct / 2}%`;
    item.style.top    = `${slot.y - hPct / 2}%`;

    attachDragListeners(item);
    treeWrapper.appendChild(item);
    if (animate) item.addEventListener('animationend', () => item.classList.remove('pop-in'), { once: true });

  } else {
    // ─── Modules 2 & 3: Place item directly on the game screen ───
    const isBuko      = mod.slots === BUKO_SLOTS;
    const item        = document.createElement('img');
    item.id           = `item-${i}`;
    item.className    = 'screen-item' + (isBuko ? ' buko-item' : '');
    item.src          = mod.item;
    item.alt          = `A ${mod.itemLabel.replace(/s$/, '')}`;
    item.draggable    = false;
    item.dataset.type = 'food';
    item.dataset.slot = i;
    item.style.left   = `${slot.x}%`;
    item.style.top    = `${slot.y}%`;

    if (isBuko) {
      const bukoRow = i < 4 ? 1 : (i < 9 ? 2 : 3);
      item.dataset.bukoRow = String(bukoRow);
      item.style.zIndex    = String(18 + bukoRow); // 19, 20, 21 between basket-back (18) & basket-front (22)
      item.style.rotate    = `${BUKO_TILTS[i] ?? 0}deg`;
    }

    attachDragListeners(item);
    screenGame.appendChild(item);
    if (animate) triggerPopIn(item, popDelay);
  }
}

/* ══════════════════════════════════════════
   FED TRAY (under Bantay)
   Shows a mini item for every item Bantay ate.
   Tapping one takes it back and re-places it.
══════════════════════════════════════════ */
function renderFedTray() {
  const mod = MODULES[moduleIndex];
  fedList.innerHTML = '';
  fedTray.classList.toggle('has-items', fedSlots.length > 0);
  fedTray.classList.toggle('locked', gameComplete);

  const overfed = currentCount > targetCount;
  fedTray.classList.toggle('overfed', overfed && !gameComplete);
  fedHint.textContent = overfed
    ? `Too many! Tap the red ones to take them back`
    : `Tap to take one back`;

  fedSlots.forEach((slotIndex, n) => {
    const icon = document.createElement('img');
    icon.className = 'fed-mango' + (n >= targetCount ? ' excess' : '');
    icon.src       = mod.item;
    icon.alt       = `Tap to take this back`;
    icon.title     = 'Take it back';
    icon.draggable = false;
    icon.addEventListener('click', () => takeItemBack(n));
    fedList.appendChild(icon);
  });
}

function takeItemBack(n) {
  if (gameComplete || isSick) return;
  const slotIndex = fedSlots.splice(n, 1)[0];
  if (slotIndex === undefined) return;

  currentCount--;
  trackAttempt(a => { a.takeBacks++; });
  SoundFX.playPop();
  placeItem(slotIndex, true);
  if (MODULES[moduleIndex].slots === BUKO_SLOTS) layoutScreenItems();
  updateBubble();
  renderFedTray();
  updateDogState();
  if (currentCount <= targetCount) hideToast();
}

/* ══════════════════════════════════════════
   CUSTOM DRAG & DROP
   Uses Pointer Events — works on mouse
   (desktop) AND touch (tablet / mobile).
══════════════════════════════════════════ */

/** Attach pointerdown to an element to make it draggable */
function attachDragListeners(el) {
  el.addEventListener('pointerdown', onPointerDown);
}

// Attach to static non-edible elements on page load
document.querySelectorAll('.non-edible').forEach(el => attachDragListeners(el));

/* ─── Pointer Down – begin drag ─── */
function onPointerDown(e) {
  if (gameComplete || isSick) return;
  e.preventDefault();
  e.stopPropagation();

  activeDrag = e.currentTarget;
  dragLiftY  = e.pointerType === 'touch' ? -38 : 0;

  // Calculate offset so the ghost is centred on the pointer
  const rect  = activeDrag.getBoundingClientRect();
  dragOffsetX = rect.width  / 2;
  dragOffsetY = rect.height / 2;

  // Show & position the ghost image
  dragGhost.src           = activeDrag.src;
  dragGhost.style.width   = rect.width + 'px';
  dragGhost.style.height  = 'auto';
  dragGhost.style.display = 'block';
  positionGhost(e.clientX, e.clientY);

  activeDrag.classList.add('dragging');

  window.addEventListener('pointermove',   onPointerMove, { passive: false });
  window.addEventListener('pointerup',     onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

/* ─── Pointer Move – update ghost & highlight Bantay ─── */
function onPointerMove(e) {
  if (!activeDrag) return;
  e.preventDefault();
  const lift = e.pointerType ? (e.pointerType === 'touch' ? -38 : 0) : dragLiftY;
  dragLiftY = lift;
  positionGhost(e.clientX, e.clientY);

  // Highlight Bantay when the pointer (plus finger lift) is over the drop zone
  const dropRect = bantayWrapper.getBoundingClientRect();
  if (isOver(e.clientX, e.clientY + lift, dropRect, 20)) {
    bantayWrapper.classList.add('drop-hover');
  } else {
    bantayWrapper.classList.remove('drop-hover');
  }
}

/* ─── Pointer Up – resolve drop ─── */
function onPointerUp(e) {
  if (!activeDrag) return;

  window.removeEventListener('pointermove',   onPointerMove);
  window.removeEventListener('pointerup',     onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);

  bantayWrapper.classList.remove('drop-hover');
  dragGhost.style.display = 'none';
  activeDrag.classList.remove('dragging');

  // Check if released over Bantay (using touch finger lift & forgiving 20px pad)
  const lift = e.pointerType ? (e.pointerType === 'touch' ? -38 : 0) : dragLiftY;
  const dropRect = bantayWrapper.getBoundingClientRect();
  if (isOver(e.clientX, e.clientY + lift, dropRect, 20)) {
    handleDrop(activeDrag);
  }
  // If not over Bantay, the element simply stays in its original position

  dragLiftY  = 0;
  activeDrag = null;
}

/** Move the ghost image to (x, y) centred, lifted above finger on touch */
function positionGhost(x, y) {
  dragGhost.style.left = (x - dragOffsetX) + 'px';
  dragGhost.style.top  = (y + dragLiftY - dragOffsetY) + 'px';
}

/** Returns true if point (x, y) is within DOMRect (expanded by pad px) */
function isOver(x, y, rect, pad = 0) {
  return (
    x >= rect.left   - pad &&
    x <= rect.right  + pad &&
    y >= rect.top    - pad &&
    y <= rect.bottom + pad
  );
}

/* ══════════════════════════════════════════
   DROP RESOLUTION
══════════════════════════════════════════ */
function handleDrop(el) {
  if (el.dataset.type === 'food') {
    handleFoodDrop(el);
  } else {
    handleWrongDrop(el);
  }
}

/* ─── Correct drop: Food item ─── */
function handleFoodDrop(el) {
  if (gameComplete) return;
  const mod = MODULES[moduleIndex];

  currentCount++;
  fedSlots.push(Number(el.dataset.slot));
  trackAttempt(a => { if (currentCount === targetCount + 1) a.overfed++; });
  updateBubble();
  renderFedTray();

  // Remove the consumed item
  el.remove();

  // Happy bounce animation
  triggerAnim(imgBantay, 'happy');

  // Advance the dog's body state
  updateDogState();

  // Play rising pentatonic marimba/xylophone counting chime
  SoundFX.playCountNote(currentCount);

  // Overfeed – tell the student they can take extras back
  if (currentCount > targetCount) {
    setTimeout(() => triggerAnim(imgBantay, 'wobble'), 300);
    showToast(`Too many! Tap one under Bantay to take it back.`, true);
  }
}

/* ─── Wrong drop: Non-edible ─── */
function handleWrongDrop(el) {
  if (isSick) return; // Ignore extra drops while already sick
  isSick = true;
  trackAttempt(a => { a.nonFood.push(el.dataset.name || 'item'); });

  // Switch to sick/vomit image & shake
  setDogImage(ASSET_PATHS.dog_sick, 'sick');
  triggerAnim(imgBantay, 'shake');
  SoundFX.playOops();

  // Red screen flash
  wrongFlash.classList.add('visible');
  setTimeout(() => wrongFlash.classList.remove('visible'), 300);

  // Briefly highlight the wrong item with a red glow
  el.style.filter = 'drop-shadow(0 0 14px rgba(255, 0, 0, 0.9))';
  setTimeout(() => { el.style.filter = ''; }, 600);

  // Revert to the correct dog state after SICK_DURATION ms
  setTimeout(() => {
    isSick = false;
    updateDogState();
  }, SICK_DURATION);
}

/* ─── CSS animation helper ─── */
function triggerAnim(el, cls) {
  // Remove all animation classes, force reflow, then re-add
  el.classList.remove('happy', 'shake', 'wobble');
  void el.getBoundingClientRect(); // triggers browser reflow on both HTML & SVG elements
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

/* ══════════════════════════════════════════
   WIN STATE
══════════════════════════════════════════ */
function triggerWin() {
  // Only a correct count wins
  if (currentCount !== targetCount || gameComplete) return;
  gameComplete = true;
  btnDone.disabled = true;
  hideToast();
  fedTray.classList.add('locked');
  setDogImage(ASSET_PATHS.dog_happy, 'happy');

  // Win copy personalised for the current student
  const last = moduleIndex === MODULES.length - 1;
  winTitle.textContent = last ? '🏆 You finished every module! 🌟'
                              : '🎉 Yay! Great Job! 🎉';
  const who = currentStudent ? `, ${currentStudent}` : '';
  winText.textContent  = last ? `Great job${who}! Bantay is the happiest dog! 🐶❤️`
                              : `Great job${who}! Bantay is so happy and full! 🐶❤️`;

  winOverlay.classList.add('show');
  spawnConfetti();
  SoundFX.playWinFanfare();
}

/* ──────────────────────────────────────────
   CONFETTI BURST
────────────────────────────────────────── */
const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#6a4c93', '#1982c4', '#8ac926', '#ff924c'];

function spawnConfetti() {
  for (let i = 0; i < 90; i++) {
    setTimeout(() => {
      const p              = document.createElement('div');
      p.className          = 'confetti-piece';
      p.style.left         = Math.random() * 100 + 'vw';
      p.style.background   = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      p.style.width        = (Math.random() * 10 + 6) + 'px';
      p.style.height       = (Math.random() * 16 + 8) + 'px';
      p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      p.style.animationDuration = (Math.random() * 2 + 2) + 's';
      p.style.animationDelay   = (Math.random() * 0.4)    + 's';
      screenGame.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }, i * 25);
  }
}

function removeConfetti() {
  document.querySelectorAll('.confetti-piece').forEach(el => el.remove());
}

/* ══════════════════════════════════════════
   TOOLBAR BUTTONS
══════════════════════════════════════════ */
btnMusic.addEventListener('click', () => {
  musicOn = !musicOn;
  btnMusic.textContent = musicOn ? '🎵' : '🔇';
  btnMusic.title       = musicOn ? 'Mute Sound' : 'Unmute Sound';
  if (musicOn) {
    SoundFX.unlock();
    SoundFX.startBgm();
    SoundFX.playPuppyYip();
  } else {
    SoundFX.stopBgm();
  }
});

// ⚙️ opens the Teacher Dashboard (PIN protected, see dashboard.js)
document.getElementById('btn-settings').addEventListener('click', () => {
  openTeacherAccess();
});

/* ─── Prevent browser's native drag ghost ─── */
document.addEventListener('dragstart', e => e.preventDefault());

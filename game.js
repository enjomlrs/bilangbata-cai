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

/* Ice cream spots on the sorbetes cart (% of the SCREEN).
   Positioned in neat rows on the cart surface in the Luneta Park background.
   The cart is centered in the bg image. Items line up on the counter. */
const ICE_CREAM_SLOTS = [
  /* Row 1 – on the cart surface */
  { x: 38, y: 58 }, { x: 43, y: 58 }, { x: 48, y: 58 }, { x: 53, y: 58 }, { x: 58, y: 58 },
  /* Row 2 – just below */
  { x: 40, y: 64 }, { x: 45, y: 64 }, { x: 50, y: 64 }, { x: 55, y: 64 }, { x: 60, y: 64 },
];

/* Buko spots on the buko stall counter (% of the SCREEN).
   Positioned in neat rows on the counter surface in the Boracay background.
   The stall is centered. 15 slots to allow overfeeding (target max is 10). */
const BUKO_SLOTS = [
  /* Row 1 – on the counter top */
  { x: 37, y: 54 }, { x: 43, y: 54 }, { x: 49, y: 54 }, { x: 55, y: 54 }, { x: 61, y: 54 },
  /* Row 2 */
  { x: 39, y: 60 }, { x: 45, y: 60 }, { x: 51, y: 60 }, { x: 57, y: 60 }, { x: 63, y: 60 },
  /* Row 3 */
  { x: 37, y: 66 }, { x: 43, y: 66 }, { x: 49, y: 66 }, { x: 55, y: 66 }, { x: 61, y: 66 },
];

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
    intro: 'Grab some buko! The final challenge by the beach!',
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
  // Dog states — swapped automatically by the game engine
  dog_thin     : 'assets/puppy_sad.jpg',       // 0 items fed
  dog_medium   : 'assets/puppy_mid.jpg',        // 1–49 % of target
  dog_happy    : 'assets/puppy_happy 1.jpg',    // 50–99 % of target
  dog_muscular : 'assets/puppy_muscular.jpg',   // 100 % of target (fully fed)
  dog_fat      : 'assets/puppy_fat.jpg',        // fed MORE than target
  dog_sick     : 'assets/puppy_sick.jpg',       // wrong item dropped
};

/* ──────────────────────────────────────────
   DOM REFERENCES
────────────────────────────────────────── */
const fedTray        = document.getElementById('fed-tray');
const fedList        = document.getElementById('fed-list');
const imgGameBg      = document.getElementById('img-game-bg');
const imgHouse       = document.getElementById('img-bahay-kubo');
const btnModule      = document.getElementById('btn-module');
const moduleLabel    = document.getElementById('module-label');
const moduleMenu     = document.getElementById('module-menu');
const moduleBanner   = document.getElementById('module-banner');
const bannerTitle    = document.getElementById('module-banner-title');
const bannerSub      = document.getElementById('module-banner-sub');
const feedbackToast  = document.getElementById('feedback-toast');
const btnDone        = document.getElementById('btn-done');
const btnNextModule  = document.getElementById('btn-next-module');
const fedHint        = document.getElementById('fed-hint');
const winTitle       = document.getElementById('win-title');
const winText        = document.getElementById('win-text');
const screenLanding = document.getElementById('screen-landing');
const screenGame    = document.getElementById('screen-game');
const btnPlay       = document.getElementById('btn-play');
const btnPlayAgain  = document.getElementById('btn-play-again');
const btnMusic      = document.getElementById('btn-music');
const imgBantay     = document.getElementById('img-bantay');
const bantayWrapper = document.getElementById('bantay-wrapper');
const bubbleTarget  = document.getElementById('bubble-target');
const bubbleCount   = document.getElementById('bubble-count');
const bubbleText    = document.getElementById('bubble-text');
const scoreDisplay  = document.getElementById('score-display');
const treeWrapper   = document.getElementById('tree-wrapper');
const imgVendor     = document.getElementById('img-mango-tree');
const dragGhost     = document.getElementById('drag-ghost');
const winOverlay    = document.getElementById('win-overlay');
const wrongFlash    = document.getElementById('wrong-flash');

/* ──────────────────────────────────────────
   GAME STATE
────────────────────────────────────────── */
let moduleIndex    = 0;     // which module is being played (index into MODULES)
let targetCount    = 0;     // randomly chosen target for the round
let currentCount   = 0;     // items successfully fed to Bantay
let fedSlots       = [];    // slot index of every item Bantay has eaten (in order)
let isSick        = false; // true while vomit animation is playing
let gameComplete  = false; // true once the win condition is met
let musicOn       = true;

/* ──────────────────────────────────────────
   DRAG STATE  (custom pointer-event drag)
────────────────────────────────────────── */
let activeDrag  = null; // element currently being dragged
let dragOffsetX = 0;    // horizontal offset: pointer → element centre
let dragOffsetY = 0;    // vertical offset:   pointer → element centre

/* ══════════════════════════════════════════
   SCREEN TRANSITION
══════════════════════════════════════════ */
btnPlay.addEventListener('click', () => {
  screenLanding.classList.add('hidden');
  screenGame.classList.remove('hidden');
  moduleIndex = 0;
  initGame();
});

// Replay the same module with a new random number
btnPlayAgain.addEventListener('click', () => {
  winOverlay.classList.remove('show');
  removeConfetti();
  initGame();
});

// Go on to the next module (its own setting + number range)
btnNextModule.addEventListener('click', () => {
  winOverlay.classList.remove('show');
  removeConfetti();
  if (moduleIndex < MODULES.length - 1) moduleIndex++;
  initGame();
});

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

  applyModule(mod);
  updateBubble();
  renderFedTray();
  setDogImage(ASSET_PATHS.dog_thin); // always start thin (hungry)
  spawnItems();
}

/* ══════════════════════════════════════════
   MODULES  (setting changes per module)
══════════════════════════════════════════ */
function moduleTitle(mod) {
  return `Module ${MODULES.indexOf(mod) + 1}: ${mod.name} (${mod.min}\u2013${mod.max})`;
}

/** Swap the background, house, vendor, and props, and announce the module */
function applyModule(mod) {
  moduleLabel.textContent = moduleTitle(mod);

  setBackground(mod.bg);
  imgHouse.classList.toggle('module-hidden', !mod.house);

  // Show mango tree overlay only for modules that use vendorOverlay
  treeWrapper.classList.toggle('module-hidden', !mod.vendorOverlay);
  if (mod.vendorOverlay && mod.vendor) {
    imgVendor.src = mod.vendor;
  }

  document.querySelectorAll('.non-edible').forEach(el => {
    el.classList.toggle('module-hidden', !mod.distractors.includes(el.dataset.name));
  });

  // Update the speech bubble text for this module's item
  bubbleText.innerHTML = `Can you feed me <strong id="bubble-target">${targetCount}</strong> ${mod.itemLabel}?`;

  buildModuleMenu();
  showBanner(`Module ${MODULES.indexOf(mod) + 1}: ${mod.name}`, mod.intro);
}

/** Crossfade to a new background image */
function setBackground(src) {
  if (imgGameBg.getAttribute('src') === src) return;
  imgGameBg.classList.add('fading');
  setTimeout(() => {
    imgGameBg.onload = () => imgGameBg.classList.remove('fading');
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

/* ─── Module picker dropdown ─── */
function buildModuleMenu() {
  moduleMenu.innerHTML = '';
  MODULES.forEach((mod, i) => {
    const li  = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = i === moduleIndex ? 'current' : '';
    btn.innerHTML = `Module ${i + 1}: ${mod.name}<small>Count ${mod.min}\u2013${mod.max} ${mod.itemLabel}</small>`;
    btn.addEventListener('click', () => {
      closeModuleMenu();
      winOverlay.classList.remove('show');
      removeConfetti();
      moduleIndex = i;
      initGame();
    });
    li.appendChild(btn);
    moduleMenu.appendChild(li);
  });
}

function closeModuleMenu() {
  moduleMenu.hidden = true;
  btnModule.setAttribute('aria-expanded', 'false');
}

btnModule.addEventListener('click', (e) => {
  e.stopPropagation();
  moduleMenu.hidden = !moduleMenu.hidden;
  btnModule.setAttribute('aria-expanded', String(!moduleMenu.hidden));
});
document.addEventListener('click', closeModuleMenu);

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

  if (currentCount === targetCount) {
    triggerWin();
  } else if (currentCount < targetCount) {
    showToast(`Bantay is still hungry! Feed him some more ${mod.itemLabel}. ${mod.itemEmoji}`);
    triggerAnim(imgBantay, 'shake');
  } else {
    showToast(`Too many ${mod.itemLabel}! Tap one under Bantay to take it back.`, true);
    triggerAnim(imgBantay, 'wobble');
  }
});

/* ──────────────────────────────────────────
   SPEECH BUBBLE & SCORE BADGE
────────────────────────────────────────── */
function updateBubble() {
  const mod = MODULES[moduleIndex];
  // Re-set the inner HTML so the bubble-target strong gets recreated
  bubbleText.innerHTML = `Can you feed me <strong id="bubble-target">${targetCount}</strong> ${mod.itemLabel}?`;
  bubbleCount.textContent  = `${currentCount} / ${targetCount}`;
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
    setDogImage(ASSET_PATHS.dog_fat);
    return;
  }

  const ratio = targetCount > 0 ? currentCount / targetCount : 0;

  if (ratio === 0) {
    setDogImage(ASSET_PATHS.dog_thin);
  } else if (ratio < 0.50) {
    setDogImage(ASSET_PATHS.dog_medium);
  } else if (ratio < 1) {
    setDogImage(ASSET_PATHS.dog_happy);
  } else {
    // ratio === 1 — exactly the right amount
    setDogImage(ASSET_PATHS.dog_muscular);
  }
}

/** Swap the dog's image src */
function setDogImage(src) {
  imgBantay.src = src;
}

/* ══════════════════════════════════════════
   SPAWN ITEMS ON THE VENDOR / SCREEN
   Module 1 (vendorOverlay = true):
     Items are children of #tree-wrapper positioned as % of the tree.
   Modules 2 & 3 (vendorOverlay = false):
     Vendor is part of the background image.
     Items are placed directly on #screen-game at screen % positions.
══════════════════════════════════════════ */
function spawnItems() {
  // Remove any existing items from BOTH possible parents
  treeWrapper.querySelectorAll('.mango-on-tree').forEach(el => el.remove());
  screenGame.querySelectorAll('.screen-item').forEach(el => el.remove());

  const mod = MODULES[moduleIndex];
  mod.slots.forEach((_, i) => placeItem(i, false));
}

/** Create the draggable item for slot `i` */
function placeItem(i, animate) {
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
    const item = document.createElement('img');
    item.id           = `item-${i}`;
    item.className    = 'screen-item' + (animate ? ' pop-in' : '');
    item.src          = mod.item;
    item.alt          = `A ${mod.itemLabel.replace(/s$/, '')}`;
    item.draggable    = false;
    item.dataset.type = 'food';
    item.dataset.slot = i;
    item.style.left   = `${slot.x}%`;
    item.style.top    = `${slot.y}%`;

    attachDragListeners(item);
    screenGame.appendChild(item);
    if (animate) item.addEventListener('animationend', () => item.classList.remove('pop-in'), { once: true });
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
  placeItem(slotIndex, true);
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
  positionGhost(e.clientX, e.clientY);

  // Highlight Bantay when the pointer is over him
  const bantayRect = imgBantay.getBoundingClientRect();
  if (isOver(e.clientX, e.clientY, bantayRect)) {
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

  // Check if released over Bantay
  const bantayRect = imgBantay.getBoundingClientRect();
  if (isOver(e.clientX, e.clientY, bantayRect)) {
    handleDrop(activeDrag);
  }
  // If not over Bantay, the element simply stays in its original position

  activeDrag = null;
}

/** Move the ghost image to (x, y) centred */
function positionGhost(x, y) {
  dragGhost.style.left = (x - dragOffsetX) + 'px';
  dragGhost.style.top  = (y - dragOffsetY) + 'px';
}

/** Returns true if point (x, y) is within DOMRect */
function isOver(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
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
  updateBubble();
  renderFedTray();

  // Remove the consumed item
  el.remove();

  // Happy bounce animation
  triggerAnim(imgBantay, 'happy');

  // Advance the dog's body state
  updateDogState();

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

  // Switch to sick/vomit image & shake
  setDogImage(ASSET_PATHS.dog_sick);
  triggerAnim(imgBantay, 'shake');

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
  void el.offsetWidth; // triggers browser reflow so animation restarts
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
  setDogImage(ASSET_PATHS.dog_happy);

  // Next Module is offered until the last module is finished
  const last = moduleIndex === MODULES.length - 1;
  btnNextModule.style.display = last ? 'none' : '';
  winTitle.textContent = last ? '🏆 You finished every module! 🌟'
                              : '🎉 Yay! Great Job! 🎉';
  winText.textContent  = last ? 'Bantay is the happiest dog! 🐶❤️'
                              : `Bantay is so happy and full! Ready for ${MODULES[moduleIndex + 1].name}?`;

  winOverlay.classList.add('show');
  spawnConfetti();
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
  btnMusic.title       = musicOn ? 'Mute Music' : 'Play Music';

  /*
    AUDIO HOOK – add background music control here.
    Example:
      const bgAudio = document.getElementById('bg-audio');
      if (musicOn) { bgAudio.play(); } else { bgAudio.pause(); }
  */
});

document.getElementById('btn-settings').addEventListener('click', () => {
  // Placeholder — wire up your own settings modal here
  alert('Settings coming soon! 🐾');
});

/* ─── Prevent browser's native drag ghost ─── */
document.addEventListener('dragstart', e => e.preventDefault());

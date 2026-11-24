/* ══════════════════════════════════════════════════════════════════
   BilangBata – dashboard.js
   Teacher Dashboard: PIN gate, class progress per module,
   per-student results, round history and CSV export.
   Reads the data saved by game.js (records / roster / moduleIndex).
   Change the PIN with TEACHER_PIN in game.js.
══════════════════════════════════════════════════════════════════ */

const pinOverlay       = document.getElementById('pin-overlay');
const pinForm          = document.getElementById('pin-form');
const pinInput         = document.getElementById('pin-input');
const pinError         = document.getElementById('pin-error');
const dashboard        = document.getElementById('dashboard');
const dashPeriod       = document.getElementById('dash-period');
const dashModuleSelect = document.getElementById('dash-module-select');
const dashSummary      = document.getElementById('dash-summary');
const dashProgress     = document.getElementById('dash-progress');
const dashProgressNote = document.getElementById('dash-progress-note');
const dashStudents     = document.getElementById('dash-students');
const dashDetail       = document.getElementById('dash-detail');
const dashDetailTitle  = document.getElementById('dash-detail-title');
const dashAttempts     = document.getElementById('dash-attempts');

let dashSelected = null; // student whose rounds are shown in the detail panel

/* ══════════════════════════════════════════
   OPEN / CLOSE  (strict PIN required every time)
══════════════════════════════════════════ */
function openTeacherAccess() {
  pinInput.value = '';
  pinError.textContent = '';
  pinOverlay.hidden = false;
  setTimeout(() => pinInput.focus(), 50);
}

pinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (pinInput.value === TEACHER_PIN) {
    pinInput.value = '';
    pinError.textContent = '';
    pinOverlay.hidden = true;
    openDashboard();
  } else {
    pinError.textContent = 'Wrong PIN. Please try again.';
    pinInput.value = '';
    pinInput.focus();
  }
});

document.getElementById('btn-pin-cancel').addEventListener('click', () => {
  pinInput.value = '';
  pinError.textContent = '';
  pinOverlay.hidden = true;
});

function populateModuleSelect() {
  if (!dashModuleSelect) return;
  dashModuleSelect.innerHTML = MODULES.map((m, i) =>
    `<option value="${i}">${esc(moduleTitle(m))}</option>`
  ).join('');
  dashModuleSelect.value = String(moduleIndex);
}

function openDashboard() {
  if (typeof SoundFX !== 'undefined' && SoundFX.stopBgm) SoundFX.stopBgm();
  dashSelected = null;
  populateModuleSelect();
  renderDashboard();
  dashboard.hidden = false;
}

function closeDashboard() {
  pinInput.value = '';
  pinError.textContent = '';
  dashboard.hidden = true;
  if (typeof SoundFX !== 'undefined' && SoundFX.startBgm && typeof musicOn !== 'undefined' && musicOn) {
    SoundFX.startBgm();
  }
}

if (dashModuleSelect) {
  dashModuleSelect.addEventListener('change', () => {
    const next = Number(dashModuleSelect.value);
    if (!Number.isInteger(next) || next < 0 || next >= MODULES.length) return;
    moduleIndex = next;
    saveModuleIndex();
    closeDashboard();
    winOverlay.classList.remove('show');
    overfedOverlay.classList.remove('show');
    removeConfetti();
    if (!screenGame.classList.contains('hidden')) {
      initGame();
    } else if (!screenName.classList.contains('hidden')) {
      nameModule.textContent = `Today's stage: ${moduleTitle(MODULES[moduleIndex])}`;
    }
  });
}

document.getElementById('btn-teacher-landing').addEventListener('click', openTeacherAccess);
const btnTeacherName = document.getElementById('btn-teacher-name');
if (btnTeacherName) btnTeacherName.addEventListener('click', openTeacherAccess);
const btnWinTeacher = document.getElementById('btn-win-teacher');
if (btnWinTeacher) btnWinTeacher.addEventListener('click', openTeacherAccess);
document.getElementById('btn-dash-close').addEventListener('click', closeDashboard);
dashPeriod.addEventListener('change', renderDashboard);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!pinOverlay.hidden) {
    pinInput.value = '';
    pinError.textContent = '';
    pinOverlay.hidden = true;
  } else if (!dashboard.hidden) {
    closeDashboard();
  }
});

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function esc(value) {
  return String(value).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Rounds inside the selected period (Today / Last 7 days / All time) */
function roundsInPeriod() {
  let from = 0;
  if (dashPeriod.value === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    from = d.getTime();
  } else if (dashPeriod.value === '7') {
    from = Date.now() - 7 * 24 * 60 * 60 * 1000;
  }
  return records.filter(r => r.start >= from);
}

/** Every student: names typed on the name screen + names found in the rounds */
function allStudentNames() {
  const names = new Map();
  roster.forEach(s => names.set(s.name.toLowerCase(), s.name));
  records.forEach(r => {
    if (!names.has(r.student.toLowerCase())) names.set(r.student.toLowerCase(), r.student);
  });
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

const isFirstTry = r => r.completed && r.checks.length === 1;
const seconds    = r => Math.max(0, Math.round(((r.end || r.last) - r.start) / 1000));
const tooFew     = r => r.checks.filter(c => c < r.target).length;
const tooMany    = r => r.checks.filter(c => c > r.target).length;
const percent    = (n, d) => (d ? Math.round((n / d) * 100) : null);

function fmtTime(sec) {
  if (sec == null || isNaN(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Totals for a list of rounds */
function statsFor(list) {
  const answered = list.filter(r => r.checks.length > 0);
  const finished = list.filter(r => r.completed);
  const firstTry = list.filter(isFirstTry).length;
  const times    = finished.map(seconds);
  return {
    rounds:      list.length,
    finished:    finished.length,
    answered:    answered.length,
    firstTry,
    accuracy:    percent(firstTry, answered.length),
    avgTime:     times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    tooFew:      list.reduce((n, r) => n + tooFew(r), 0),
    tooMany:     list.reduce((n, r) => n + tooMany(r), 0),
    nonFood:     list.reduce((n, r) => n + r.nonFood.length, 0),
    modulesDone: [...new Set(finished.map(r => r.module))].sort(),
    last:        list.length ? Math.max(...list.map(r => r.last)) : null,
  };
}

/** Quick label so the teacher can spot who needs help */
function statusOf(s) {
  if (s.nonFood >= 3 || (s.answered >= 2 && s.accuracy < 50)) return { cls: 'help',  label: '⚠ Needs help' };
  if (!s.answered)                                            return { cls: 'new',   label: '— Not enough data' };
  if (s.accuracy >= 80 && s.nonFood === 0)                    return { cls: 'great', label: '⭐ Excellent' };
  return { cls: 'ok', label: '👍 On track' };
}

/* ══════════════════════════════════════════
   RENDERING
══════════════════════════════════════════ */
function renderDashboard() {
  const list = roundsInPeriod();
  if (dashSelected && !allStudentNames().includes(dashSelected)) dashSelected = null;
  renderSummary(list);
  renderProgress(list);
  renderStudents(list);
  renderDetail(list);
}

/* ─── Summary cards ─── */
function renderSummary(list) {
  const s = statsFor(list);
  const cards = [
    ['👧', 'Students played',     new Set(list.map(r => r.student)).size],
    ['🎮', 'Rounds played',       s.rounds],
    ['✅', 'Rounds finished',     s.finished],
    ['🎯', 'First-try accuracy',  s.accuracy == null ? '—' : `${s.accuracy}%`],
    ['⏱️', 'Avg. time to finish', fmtTime(s.avgTime)],
    ['🪨', 'Non-food fed',        s.nonFood],
  ];
  dashSummary.innerHTML = cards.map(([icon, label, value]) => `
    <div class="dash-card">
      <span class="dash-card-icon">${icon}</span>
      <span class="dash-card-value">${esc(value)}</span>
      <span class="dash-card-label">${label}</span>
    </div>`).join('');
}

/* ─── Class progress: every student × every module ─── */
function progressCell(rounds) {
  if (!rounds.length) return '<span class="cell none" title="Not played">—</span>';
  const done = rounds.filter(r => r.completed);
  const tally = `${done.length}/${rounds.length}`;
  if (!done.length)            return `<span class="cell trying" title="Played, not finished yet">🔄 ${tally}</span>`;
  if (done.some(isFirstTry))   return `<span class="cell star" title="Finished on the first try">⭐ ${tally}</span>`;
  return `<span class="cell done" title="Finished">✅ ${tally}</span>`;
}

function renderProgress(list) {
  const names = allStudentNames();
  const cur   = i => (i === moduleIndex ? 'current' : '');

  const head = `<thead><tr><th>Student</th>${MODULES.map((m, i) => `
    <th class="${cur(i)}">M${i + 1}: ${esc(m.name)}<small>Count ${m.min}–${m.max}${i === moduleIndex ? ' · current' : ''}</small></th>`).join('')}
  </tr></thead>`;

  const rows = names.map(n => {
    const mine = list.filter(r => r.student === n);
    return `<tr data-name="${esc(n)}" class="${n === dashSelected ? 'selected' : ''}">
      <td class="name">${esc(n)}</td>
      ${MODULES.map((_, i) => `<td class="${cur(i)}">${progressCell(mine.filter(r => r.module === i))}</td>`).join('')}
    </tr>`;
  }).join('');

  dashProgress.innerHTML = head + `<tbody>${rows ||
    `<tr><td colspan="${MODULES.length + 1}" class="empty">No students yet. Students appear here after they type their name.</td></tr>`}</tbody>`;

  // Who has finished the module the class is on right now?
  const finished = names.filter(n => list.some(r => r.student === n && r.module === moduleIndex && r.completed));
  const left     = names.filter(n => !finished.includes(n));
  const period   = dashPeriod.options[dashPeriod.selectedIndex].text;

  let note = `Current stage: <b>${esc(moduleTitle(MODULES[moduleIndex]))}</b> — ` +
             `<b>${finished.length} of ${names.length}</b> students finished (${esc(period.toLowerCase())}).`;
  if (names.length && !left.length) {
    note += ' 🎉 Everyone is done! Use the <b>Active Module</b> selector above to move the class on.';
  } else if (left.length) {
    note += ` Still to finish: ${left.map(esc).join(', ')}.`;
  }
  dashProgressNote.innerHTML = note;
}

/* ─── Student performance table ─── */
function renderStudents(list) {
  const names = [...new Set(list.map(r => r.student))].sort((a, b) => a.localeCompare(b));

  const head = `<thead><tr>
    <th>Student</th><th>Rounds</th><th>Finished</th><th>First-try accuracy</th><th>Avg. time</th>
    <th>Too few</th><th>Too many</th><th>Non-food</th><th>Modules finished</th><th>Status</th>
  </tr></thead>`;

  const rows = names.map(n => {
    const s  = statsFor(list.filter(r => r.student === n));
    const st = statusOf(s);
    const acc = s.accuracy == null ? '—'
      : `<span class="acc"><span class="acc-bar"><i style="width:${s.accuracy}%"></i></span>${s.accuracy}%</span>`;
    const fewCell  = s.tooFew  > 0 ? `<span class="ans low">${s.tooFew}</span>`   : '0';
    const manyCell = s.tooMany > 0 ? `<span class="ans high">${s.tooMany}</span>` : '0';
    const mods = s.modulesDone.length ? s.modulesDone.map(i => `M${i + 1}`).join(', ') : '—';
    return `<tr data-name="${esc(n)}" class="${n === dashSelected ? 'selected' : ''}">
      <td class="name">${esc(n)}</td>
      <td>${s.rounds}</td>
      <td>${s.finished}</td>
      <td>${acc}</td>
      <td>${fmtTime(s.avgTime)}</td>
      <td>${fewCell}</td>
      <td>${manyCell}</td>
      <td>${s.nonFood}</td>
      <td>${mods}</td>
      <td><span class="status ${st.cls}">${st.label}</span></td>
    </tr>`;
  }).join('');

  dashStudents.innerHTML = head + `<tbody>${rows ||
    '<tr><td colspan="10" class="empty">No rounds played in this period yet.</td></tr>'}</tbody>`;
}

/* ─── One student's round history ─── */
function renderDetail(list) {
  if (!dashSelected) {
    dashDetail.hidden = true;
    return;
  }
  dashDetail.hidden = false;
  dashDetailTitle.textContent = `📋 ${dashSelected} – rounds`;

  const rounds = list.filter(r => r.student === dashSelected).sort((a, b) => b.start - a.start);

  const head = `<thead><tr>
    <th>Date &amp; time</th><th>Module</th><th>Asked for</th><th>Answers given</th>
    <th>Take-backs</th><th>Non-food</th><th>Time</th><th>Result</th>
  </tr></thead>`;

  const rows = rounds.map(r => {
    const answers = r.checks.length
      ? r.checks.map(c => `<span class="ans ${c === r.target ? 'ok' : c < r.target ? 'low' : 'high'}">${c}</span>`).join(' → ')
      : '—';
    const result = isFirstTry(r) ? '<span class="res great">⭐ First try</span>'
                 : r.completed   ? `<span class="res done">✅ After ${r.checks.length} tries</span>`
                 :                 '<span class="res open">⏳ Not finished</span>';
    const nonFood = r.nonFood.length ? `${r.nonFood.length} (${r.nonFood.map(esc).join(', ')})` : '0';
    return `<tr>
      <td>${fmtDate(r.start)}</td>
      <td>M${r.module + 1}: ${esc(r.moduleName)}</td>
      <td>${r.target}</td>
      <td>${answers}</td>
      <td>${r.takeBacks}</td>
      <td>${nonFood}</td>
      <td>${fmtTime(seconds(r))}</td>
      <td>${result}</td>
    </tr>`;
  }).join('');

  dashAttempts.innerHTML = head + `<tbody>${rows ||
    '<tr><td colspan="8" class="empty">No rounds in this period.</td></tr>'}</tbody>`;
}

/* ─── Tap a student (either table) to open their rounds ─── */
function selectStudentRow(e) {
  const tr = e.target.closest('tr[data-name]');
  if (!tr) return;
  dashSelected = tr.dataset.name;
  renderDashboard();
  dashDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
dashProgress.addEventListener('click', selectStudentRow);
dashStudents.addEventListener('click', selectStudentRow);

document.getElementById('btn-detail-close').addEventListener('click', () => {
  dashSelected = null;
  renderDashboard();
  if (typeof renderNameChips === 'function' && !screenName.classList.contains('hidden')) renderNameChips();
});

document.getElementById('btn-delete-student').addEventListener('click', () => {
  if (!dashSelected) return;
  if (!confirm(`Delete ${dashSelected} and all of their results?\n\nThis cannot be undone.`)) return;
  records = records.filter(r => r.student !== dashSelected);
  roster  = roster.filter(s => s.name !== dashSelected);
  saveJSON(STORE_RECORDS, records);
  saveJSON(STORE_ROSTER, roster);
  dashSelected = null;
  renderDashboard();
  if (typeof renderNameChips === 'function' && !screenName.classList.contains('hidden')) renderNameChips();
});

/* ══════════════════════════════════════════
   EXPORT & CLEAR
══════════════════════════════════════════ */
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;              // stop spreadsheets running formulas
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

document.getElementById('btn-export').addEventListener('click', () => {
  const list = roundsInPeriod().slice().sort((a, b) => a.start - b.start);
  if (!list.length) {
    alert('No rounds to export for this period.');
    return;
  }

  const header = [
    'Student', 'Date', 'Start Time', 'Module', 'Setting', 'Asked For', 'Answers Given',
    'Done Presses', 'First Try', 'Finished', 'Too Few', 'Too Many', 'Take-backs',
    'Overfed', 'Non-food Items', 'Seconds',
  ];
  const rows = list.map(r => {
    const d = new Date(r.start);
    return [
      r.student, d.toLocaleDateString('en-CA'), d.toLocaleTimeString('en-PH'),
      r.module + 1, r.moduleName, r.target, r.checks.join(' > '),
      r.checks.length, isFirstTry(r) ? 'Yes' : 'No', r.completed ? 'Yes' : 'No',
      tooFew(r), tooMany(r), r.takeBacks, r.overfed, r.nonFood.join(' / '), seconds(r),
    ];
  });

  const csv  = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href     = URL.createObjectURL(blob);
  link.download = `BilangBata_${dashPeriod.value}_${new Date().toLocaleDateString('en-CA')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (!confirm('Delete ALL student names and results saved on this device?\n\nTip: press "Export CSV" first to keep a copy.')) return;
  records = [];
  roster  = [];
  saveJSON(STORE_RECORDS, records);
  saveJSON(STORE_ROSTER, roster);
  dashSelected = null;
  renderDashboard();
  if (typeof renderNameChips === 'function' && !screenName.classList.contains('hidden')) renderNameChips();
});

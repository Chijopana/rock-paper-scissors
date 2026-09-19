/* =====================================================================
   PIEDRA · PAPEL · TIJERAS
   Juego en JavaScript sin dependencias de build.

   Secciones: constantes → estado → DOM → utilidades → audio → tema
              → bot → ronda → estadísticas → historial → reglas
              → modos → temporizador → diálogos → persistencia → online
   ===================================================================== */
'use strict';

/* ============ CONSTANTES ============ */

const MOVES = {
  rock:     { label: 'Piedra',  glyph: '🪨', hand: '✊' },
  paper:    { label: 'Papel',   glyph: '📄', hand: '✋' },
  scissors: { label: 'Tijeras', glyph: '✂️', hand: '✌️' },
  lizard:   { label: 'Lagarto', glyph: '🦎', hand: '🤏' },
  spock:    { label: 'Spock',   glyph: '🖖', hand: '🖖' }
};

/* Cada jugada declara a quién gana y con qué verbo.
   Verbos por pareja: "Piedra aplasta Lagarto", no "Piedra rompe Lagarto". */
const BEATS = {
  rock:     { scissors: 'rompe',   lizard: 'aplasta' },
  paper:    { rock: 'cubre',       spock: 'refuta' },
  scissors: { paper: 'corta',      lizard: 'decapita' },
  lizard:   { spock: 'envenena',   paper: 'devora' },
  spock:    { scissors: 'aplasta', rock: 'vaporiza' }
};

const MOVE_SETS = {
  classic: ['rock', 'paper', 'scissors'],
  bigBang: ['rock', 'paper', 'scissors', 'lizard', 'spock']
};

const DIFFICULTY_HINTS = {
  easy:   'Fácil: el bot se deja ganar a propósito en 3 de cada 10 rondas.',
  normal: 'Normal: el bot juega totalmente al azar.',
  hard:   'Difícil: el bot aprende tus patrones y trata de anticiparse.'
};

const STORAGE = {
  stats: 'rps:stats',
  prefs: 'rps:prefs',
  theme: 'rps:theme',
  legacyStats: 'rps-stats',
  legacyTheme: 'rps-theme'
};

const HISTORY_LIMIT = 12;
const SHOOT_MS = 620;
const ONLINE_COUNTDOWN_SECONDS = 3;
const ONLINE_CHOICE_TIMEOUT_MS = 15000;
const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const CONFETTI_URL = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ============ ESTADO ============ */

const state = {
  mode: 'classic',          // classic | firstTo | timed | online
  difficulty: 'normal',     // easy | normal | hard
  bigBang: false,
  target: 5,                // rondas para ganar en "primero a N"
  duration: 30,             // segundos en contrarreloj
  sound: true,

  playerScore: 0,
  opponentScore: 0,
  roundLocked: false,       // hay una animación de ronda en curso
  matchOver: false,

  timeLeft: 0,
  timerId: null,
  timerPaused: false,
  shootTimer: null
};

const stats = {
  games: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  streak: 0,
  bestStreak: 0,
  history: []
};

/* Memoria del bot difícil: solo en RAM, no se persiste. */
const botMemory = {
  moves: [],
  frequency: Object.create(null),
  transitions: Object.create(null)
};

const net = {
  peer: null,
  conn: null,
  roomId: '',
  isHost: false,
  connected: false,
  phase: 'idle',            // idle | countdown | choose
  roundId: 0,
  localChoice: null,
  remoteChoice: null,
  countdownTimer: null,
  choiceTimer: null,
  countdownLeft: ONLINE_COUNTDOWN_SECONDS,
  joinRequested: false,
  joinRoomId: ''
};

/* ============ DOM ============ */

const $ = (id) => document.getElementById(id);

const el = {
  // cabecera
  soundToggle: $('sound-toggle'),
  themeToggle: $('theme-toggle'),
  resetBtn: $('reset-btn'),

  // marcador y arena
  playerName: $('player-name'),
  opponentName: $('opponent-name'),
  playerScore: $('player-score'),
  opponentScore: $('opponent-score'),
  targetTrack: $('target-track'),
  playerPips: $('player-pips'),
  opponentPips: $('opponent-pips'),
  targetLabel: $('target-label'),
  arena: $('arena'),
  arenaFlash: $('arena-flash'),
  playerHand: $('player-hand'),
  opponentHand: $('opponent-hand'),
  playerMove: $('player-move'),
  opponentMove: $('opponent-move'),
  timer: $('timer-text'),

  // jugadas y resultado
  choices: $('choices'),
  resultSection: $('result-section'),
  resultText: $('result-text'),
  streakText: $('streak-text'),

  // controles
  modeChips: $('mode-chips'),
  difficultyGroup: $('difficulty-group'),
  difficultyChips: $('difficulty-chips'),
  difficultyHint: $('difficulty-hint'),
  targetGroup: $('target-group'),
  targetChips: $('target-chips'),
  durationGroup: $('duration-group'),
  durationChips: $('duration-chips'),
  bigBangToggle: $('bigbang-toggle'),

  // online
  onlinePanel: $('online-panel'),
  onlineStatus: $('online-status'),
  roomLink: $('room-link'),
  copyRoomLink: $('copy-room-link'),
  createRoomBtn: $('create-room-btn'),
  leaveRoomBtn: $('leave-room-btn'),

  // estadísticas
  totalGames: $('total-games'),
  wins: $('wins'),
  losses: $('losses'),
  ties: $('ties'),
  winRate: $('win-rate'),
  streak: $('streak'),
  bestStreak: $('best-streak'),
  winrateBar: $('winrate-bar'),
  segWin: $('seg-win'),
  segTie: $('seg-tie'),
  segLose: $('seg-lose'),

  // historial y reglas
  historyList: $('history-list'),
  historyCount: $('history-count'),
  rulesContent: $('rules-content'),

  // diálogos
  overlay: $('overlay'),
  overlayEmoji: $('overlay-emoji'),
  overlayMessage: $('overlay-message'),
  overlaySub: $('overlay-sub'),
  overlayPlayerLabel: $('overlay-player-label'),
  overlayOpponentLabel: $('overlay-opponent-label'),
  finalHumanScore: $('final-human-score'),
  finalComputerScore: $('final-computer-score'),
  playAgain: $('play-again'),
  overlayClose: $('overlay-close'),

  confirmDialog: $('confirm-dialog'),
  confirmAccept: $('confirm-accept'),
  confirmCancel: $('confirm-cancel'),

  toasts: $('toasts')
};

/* ============ UTILIDADES ============ */

const activeMoves = () => (state.bigBang ? MOVE_SETS.bigBang : MOVE_SETS.classic);

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

const isOnline = () => state.mode === 'online';

function beats(a, b) {
  return Boolean(BEATS[a] && BEATS[a][b]);
}

function judge(player, opponent) {
  if (player === opponent) return 'tie';
  return beats(player, opponent) ? 'win' : 'lose';
}

const scriptCache = new Map();

function loadScript(src) {
  if (scriptCache.has(src)) return scriptCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(tag);
  });

  scriptCache.set(src, promise);
  return promise;
}

function toast(message, tone = 'neutral', duration = 2800) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.dataset.tone = tone;
  node.textContent = message;
  el.toasts.appendChild(node);

  setTimeout(() => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 260);
  }, duration);
}

/* ============ AUDIO ============ */
/* Un único AudioContext compartido. Crear uno por ronda (como hacía la
   versión anterior) agota el límite del navegador y el sonido deja de
   oírse a las pocas jugadas. */

let audioCtx = null;

function getAudioContext() {
  if (!state.sound) return null;

  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      audioCtx = new Ctx();
    } catch (error) {
      return null;
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function tone(frequency, duration, { type = 'sine', delay = 0, gain = 0.16 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(envelope);
  envelope.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

const sfx = {
  click: () => tone(520, 0.05, { type: 'square', gain: 0.05 }),
  win:   () => { tone(660, 0.12); tone(880, 0.18, { delay: 0.1 }); },
  lose:  () => { tone(320, 0.16, { type: 'triangle' }); tone(210, 0.24, { type: 'triangle', delay: 0.12 }); },
  tie:   () => tone(440, 0.1, { type: 'triangle', gain: 0.1 }),
  match: () => { tone(523, 0.12); tone(659, 0.12, { delay: 0.11 }); tone(784, 0.26, { delay: 0.22 }); }
};

function toggleSound() {
  state.sound = !state.sound;
  el.soundToggle.setAttribute('aria-pressed', String(state.sound));
  el.soundToggle.querySelector('.icon-btn-glyph').textContent = state.sound ? '🔊' : '🔇';
  el.soundToggle.title = state.sound ? 'Silenciar sonido (M)' : 'Activar sonido (M)';
  savePrefs();

  if (state.sound) sfx.click();
  toast(state.sound ? 'Sonido activado' : 'Sonido silenciado');
}

/* ============ TEMA ============ */
/* El tema ya se aplicó con el script inline del <head> para evitar el
   parpadeo; aquí solo se sincroniza el icono y se gestiona el cambio. */

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function syncThemeIcon() {
  el.themeToggle.querySelector('.icon-btn-glyph').textContent = currentTheme() === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  syncThemeIcon();

  try {
    localStorage.setItem(STORAGE.theme, next);
  } catch (error) {
    /* modo privado: el tema no persiste, pero el juego sigue funcionando */
  }
}

/* ============ BOT ============ */

function rememberPlayerMove(move) {
  const previous = botMemory.moves[botMemory.moves.length - 1];

  botMemory.frequency[move] = (botMemory.frequency[move] || 0) + 1;

  if (previous) {
    if (!botMemory.transitions[previous]) botMemory.transitions[previous] = Object.create(null);
    botMemory.transitions[previous][move] = (botMemory.transitions[previous][move] || 0) + 1;
  }

  botMemory.moves.push(move);
  if (botMemory.moves.length > 60) botMemory.moves.shift();
}

function mostLikely(counts, pool) {
  let best = null;
  let bestCount = 0;

  pool.forEach((move) => {
    const count = counts[move] || 0;
    if (count > bestCount) {
      best = move;
      bestCount = count;
    }
  });

  return best;
}

/* Cadena de Markov de orden 1 sobre las jugadas del rival, con la
   frecuencia global como respaldo. */
function predictPlayerMove(pool) {
  const last = botMemory.moves[botMemory.moves.length - 1];

  if (last && botMemory.transitions[last]) {
    const predicted = mostLikely(botMemory.transitions[last], pool);
    if (predicted) return predicted;
  }

  return mostLikely(botMemory.frequency, pool);
}

/* Contra un rival impredecible ninguna estrategia mejora el 1/3: por eso
   "fácil" se deja ganar mirando la jugada actual (ventaja para quien juega)
   y "difícil" solo usa el historial, nunca la jugada en curso. */
function getBotChoice(playerMove) {
  const pool = activeMoves();

  // Difícil: se anticipa a tus patrones, con ruido para no ser imbatible.
  if (state.difficulty === 'hard' && botMemory.moves.length >= 3 && Math.random() > 0.2) {
    const predicted = predictPlayerMove(pool);
    const counters = pool.filter((move) => beats(move, predicted));
    if (counters.length) return randomOf(counters);
  }

  // Fácil: un 30 % de las rondas elige a propósito una jugada perdedora.
  if (state.difficulty === 'easy' && playerMove && Math.random() < 0.3) {
    const losers = pool.filter((move) => beats(playerMove, move));
    if (losers.length) return randomOf(losers);
  }

  return randomOf(pool);
}

/* ============ BOTONES DE JUGADA ============ */

function renderChoiceButtons() {
  el.choices.innerHTML = '';

  activeMoves().forEach((move, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-btn';
    button.dataset.choice = move;
    button.setAttribute('aria-label', `${MOVES[move].label} (tecla ${index + 1})`);

    button.innerHTML =
      `<span class="choice-key" aria-hidden="true">${index + 1}</span>` +
      `<span class="choice-glyph" aria-hidden="true">${MOVES[move].glyph}</span>` +
      `<span class="choice-name">${MOVES[move].label}</span>`;

    button.addEventListener('click', () => handleChoice(move));
    el.choices.appendChild(button);
  });

  updateChoiceButtonsState();
}

function updateChoiceButtonsState() {
  const disabled = isOnline()
    ? !(net.connected && net.phase === 'choose' && !net.localChoice)
    : state.roundLocked || state.matchOver;

  el.choices.querySelectorAll('.choice-btn').forEach((button) => {
    button.disabled = disabled;
  });
}

function markSelected(move) {
  el.choices.querySelectorAll('.choice-btn').forEach((button) => {
    button.classList.toggle('selected', button.dataset.choice === move);
  });
}

function clearSelection() {
  el.choices.querySelectorAll('.choice-btn').forEach((button) => {
    button.classList.remove('selected');
  });
}

/* ============ RONDA ============ */

function handleChoice(move) {
  if (isOnline()) {
    submitOnlineChoice(move);
    return;
  }

  playRound(move);
}

function shootDuration() {
  // En contrarreloj la animación robaría segundos de juego.
  if (prefersReducedMotion.matches || state.mode === 'timed') return 0;
  return SHOOT_MS;
}

function revealHands(playerMove, opponentMove) {
  el.arena.dataset.state = 'reveal';
  el.playerHand.textContent = playerMove ? MOVES[playerMove].hand : '✊';
  el.opponentHand.textContent = opponentMove ? MOVES[opponentMove].hand : '✊';
  el.playerMove.textContent = playerMove ? MOVES[playerMove].label : 'Sin elegir';
  el.opponentMove.textContent = opponentMove ? MOVES[opponentMove].label : 'Sin elegir';
}

function runShoot(playerMove, opponentMove, done) {
  const duration = shootDuration();

  if (!duration) {
    revealHands(playerMove, opponentMove);
    done();
    return;
  }

  el.arena.dataset.state = 'shooting';
  el.arena.removeAttribute('data-outcome');
  el.arenaFlash.textContent = '¡YA!';
  el.playerHand.textContent = '✊';
  el.opponentHand.textContent = '✊';
  el.playerMove.textContent = '…';
  el.opponentMove.textContent = '…';

  clearTimeout(state.shootTimer);
  state.shootTimer = setTimeout(() => {
    revealHands(playerMove, opponentMove);
    done();
  }, duration);
}

function playRound(playerMove) {
  if (state.roundLocked || state.matchOver) return;
  if (state.mode === 'timed' && state.timeLeft <= 0) return;

  // El bot decide antes de que tu jugada entre en la memoria de patrones.
  const opponentMove = getBotChoice(playerMove);
  rememberPlayerMove(playerMove);

  state.roundLocked = true;
  markSelected(playerMove);
  updateChoiceButtonsState();
  sfx.click();

  runShoot(playerMove, opponentMove, () => {
    state.roundLocked = false;
    resolveRound(playerMove, opponentMove, judge(playerMove, opponentMove));
    updateChoiceButtonsState();
  });
}

function resultSentence(playerMove, opponentMove, result) {
  if (!playerMove && !opponentMove) return 'Nadie eligió a tiempo.';

  if (result === 'tie') {
    return `🤝 Empate: ambos elegisteis ${MOVES[playerMove].label}.`;
  }

  if (result === 'win') {
    return `✅ ¡Ganaste! ${MOVES[playerMove].label} ${BEATS[playerMove][opponentMove]} ${MOVES[opponentMove].label}.`;
  }

  return `❌ ¡Perdiste! ${MOVES[opponentMove].label} ${BEATS[opponentMove][playerMove]} ${MOVES[playerMove].label}.`;
}

function resolveRound(playerMove, opponentMove, result, customMessage = '') {
  el.arena.dataset.outcome = result;
  el.resultSection.dataset.result = result;
  el.resultText.textContent = customMessage || resultSentence(playerMove, opponentMove, result);

  applyScore(result);
  recordStats(result);
  addHistoryEntry(playerMove, opponentMove, result);
  renderStats();
  renderHistory();
  renderStreak();
  saveStats();

  if (result === 'win') sfx.win();
  else if (result === 'lose') sfx.lose();
  else sfx.tie();

  checkMatchEnd();
}

function applyScore(result) {
  if (result === 'win') {
    state.playerScore += 1;
    bumpScore(el.playerScore);
  } else if (result === 'lose') {
    state.opponentScore += 1;
    bumpScore(el.opponentScore);
  }

  renderScore();
}

function bumpScore(node) {
  node.classList.remove('bump');
  void node.offsetWidth; // fuerza el reinicio de la animación
  node.classList.add('bump');
}

function renderScore() {
  el.playerScore.textContent = state.playerScore;
  el.opponentScore.textContent = state.opponentScore;
  el.opponentName.textContent = isOnline() ? 'Rival' : 'Bot';
  el.overlayOpponentLabel.textContent = isOnline() ? 'Rival' : 'Bot';
  renderTargetTrack();
}

function renderPips(container, filled, total) {
  container.innerHTML = '';
  for (let i = 0; i < total; i += 1) {
    const pip = document.createElement('i');
    if (i < filled) pip.className = 'on';
    container.appendChild(pip);
  }
}

function renderTargetTrack() {
  if (state.mode !== 'firstTo') {
    el.targetTrack.hidden = true;
    return;
  }

  el.targetTrack.hidden = false;
  el.targetLabel.textContent = `Primero a ${state.target}`;
  renderPips(el.playerPips, state.playerScore, state.target);
  renderPips(el.opponentPips, state.opponentScore, state.target);
}

function resetArena() {
  clearTimeout(state.shootTimer);
  state.shootTimer = null;
  el.arena.dataset.state = 'idle';
  el.arena.removeAttribute('data-outcome');
  el.arenaFlash.textContent = 'VS';
  el.playerHand.textContent = '✊';
  el.opponentHand.textContent = '✊';
  el.playerMove.textContent = 'Tu jugada';
  el.opponentMove.textContent = 'Su jugada';
  el.resultSection.dataset.result = 'none';
  clearSelection();
}

function resetMatch(message = '¡Haz tu movimiento!') {
  state.playerScore = 0;
  state.opponentScore = 0;
  state.roundLocked = false;
  state.matchOver = false;
  resetArena();
  el.resultText.textContent = message;
  el.streakText.hidden = true;
  renderScore();
  updateChoiceButtonsState();
}

/* ============ ESTADÍSTICAS ============ */

function recordStats(result) {
  stats.games += 1;

  if (result === 'win') {
    stats.wins += 1;
    stats.streak += 1;
    if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
  } else if (result === 'lose') {
    stats.losses += 1;
    stats.streak = 0;
  } else {
    stats.ties += 1;
  }
}

function renderStats() {
  const { games, wins, losses, ties, streak, bestStreak } = stats;
  const rate = games === 0 ? 0 : Math.round((wins / games) * 100);

  el.totalGames.textContent = games;
  el.wins.textContent = wins;
  el.losses.textContent = losses;
  el.ties.textContent = ties;
  el.winRate.textContent = `${rate}%`;
  el.streak.textContent = streak;
  el.bestStreak.textContent = bestStreak;

  const pct = (value) => (games === 0 ? 0 : (value / games) * 100);
  el.segWin.style.width = `${pct(wins)}%`;
  el.segTie.style.width = `${pct(ties)}%`;
  el.segLose.style.width = `${pct(losses)}%`;

  el.winrateBar.setAttribute(
    'aria-label',
    games === 0
      ? 'Sin partidas todavía'
      : `${wins} ganadas, ${ties} empates y ${losses} perdidas de ${games} rondas`
  );
}

function renderStreak() {
  if (stats.streak >= 2) {
    el.streakText.hidden = false;
    el.streakText.textContent =
      stats.streak === stats.bestStreak && stats.streak > 2
        ? `🏆 ¡Nuevo récord! ${stats.streak} victorias seguidas`
        : `🔥 Racha de ${stats.streak} victorias`;
    return;
  }

  el.streakText.hidden = true;
}

/* ============ HISTORIAL ============ */
/* Se guardan las claves de jugada, no el texto ya formateado: así el
   historial sobrevive a cambios de idioma o de emoji. */

function addHistoryEntry(playerMove, opponentMove, result) {
  stats.history.unshift({
    p: playerMove || null,
    o: opponentMove || null,
    r: result,
    t: Date.now()
  });

  if (stats.history.length > HISTORY_LIMIT) stats.history.length = HISTORY_LIMIT;
}

function moveLabel(move) {
  return move && MOVES[move] ? `${MOVES[move].glyph} ${MOVES[move].label}` : '⏳ Sin elegir';
}

function renderHistory() {
  el.historyCount.hidden = stats.history.length === 0;
  el.historyCount.textContent = stats.history.length;

  if (stats.history.length === 0) {
    el.historyList.innerHTML = '<p class="empty-state">Aún no has jugado ninguna ronda.</p>';
    return;
  }

  const icons = { win: '✅', lose: '❌', tie: '🤝' };
  const fragment = document.createDocumentFragment();

  stats.history.forEach((entry) => {
    const item = document.createElement('div');
    item.className = `history-item history-item--${entry.r}`;

    const icon = document.createElement('span');
    icon.className = 'history-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = icons[entry.r] || '•';

    const moves = document.createElement('span');
    moves.className = 'history-moves';
    moves.textContent = `${moveLabel(entry.p)} vs ${moveLabel(entry.o)}`;

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = entry.t
      ? new Date(entry.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    item.append(icon, moves, time);
    fragment.appendChild(item);
  });

  el.historyList.innerHTML = '';
  el.historyList.appendChild(fragment);
}

/* ============ REGLAS ============ */
/* Generadas desde BEATS, así la tarjeta siempre coincide con el modo
   activo (en la versión anterior era HTML fijo con las 3 reglas clásicas). */

function renderRules() {
  const moves = activeMoves();
  el.rulesContent.innerHTML = '';

  moves.forEach((move) => {
    Object.keys(BEATS[move])
      .filter((target) => moves.includes(target))
      .forEach((target) => {
        const item = document.createElement('li');
        item.innerHTML =
          `<b>${MOVES[move].glyph} ${MOVES[move].label}</b> ${BEATS[move][target]} ` +
          `<b>${MOVES[target].glyph} ${MOVES[target].label}</b>`;
        el.rulesContent.appendChild(item);
      });
  });
}

/* ============ MODOS ============ */

function syncChips(container, attribute, value) {
  container.querySelectorAll('.chip').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset[attribute] === String(value)));
  });
}

function updateModeUI() {
  syncChips(el.modeChips, 'mode', state.mode);
  syncChips(el.difficultyChips, 'difficulty', state.difficulty);
  syncChips(el.targetChips, 'target', state.target);
  syncChips(el.durationChips, 'duration', state.duration);

  el.difficultyHint.textContent = DIFFICULTY_HINTS[state.difficulty];
  el.difficultyGroup.hidden = isOnline();
  el.targetGroup.hidden = state.mode !== 'firstTo';
  el.durationGroup.hidden = state.mode !== 'timed';
  el.onlinePanel.hidden = !isOnline();
  el.timer.hidden = !(state.mode === 'timed' || (isOnline() && net.phase === 'countdown'));

  // Un invitado no puede cambiar el set de jugadas: manda el anfitrión.
  el.bigBangToggle.disabled = isOnline() && net.connected && !net.isHost;

  renderScore();
  renderTargetTrack();
  updateChoiceButtonsState();
}

function setMode(mode) {
  // Pulsar el modo ya activo reinicia la partida: es la forma de empezar
  // otra tras cerrar el diálogo final sin usar "Jugar de nuevo".
  if (mode === state.mode && !state.matchOver) return;

  const previous = state.mode;
  state.mode = mode;

  clearGameTimer();
  clearOnlineTimers();
  el.timer.textContent = '';

  if (previous === 'online' && mode !== 'online') {
    teardownOnline();
  }

  if (mode === 'online') {
    resetMatch('Conectando con la sala…');
    updateModeUI();
    startOnlineSession();
    return;
  }

  resetMatch();
  updateModeUI();

  if (mode === 'timed') startTimer();
}

function setDifficulty(difficulty) {
  state.difficulty = difficulty;
  botMemory.moves.length = 0;
  botMemory.frequency = Object.create(null);
  botMemory.transitions = Object.create(null);
  savePrefs();
  updateModeUI();
}

function setTarget(target) {
  state.target = target;
  savePrefs();
  resetMatch();
  updateModeUI();
}

function setDuration(duration) {
  state.duration = duration;
  savePrefs();

  if (state.mode === 'timed') {
    resetMatch();
    startTimer();
  }

  updateModeUI();
}

function handleBigBangToggle() {
  state.bigBang = el.bigBangToggle.checked;
  savePrefs();
  renderChoiceButtons();
  renderRules();

  if (isOnline() && net.connected && net.isHost) {
    sendOnlineMessage({ type: 'config', bigBang: state.bigBang });
  }

  if (!isOnline()) {
    resetMatch();
    if (state.mode === 'timed') startTimer();
  }
}

/* ============ TEMPORIZADOR ============ */

function clearGameTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.timerPaused = false;
}

function renderTimer() {
  if (state.mode === 'timed') {
    el.timer.hidden = false;
    el.timer.textContent = state.timerPaused ? '⏸ En pausa' : `⏱️ ${state.timeLeft}s`;
    el.timer.dataset.urgent = String(!state.timerPaused && state.timeLeft <= 5);
    return;
  }

  if (isOnline() && net.phase === 'countdown') {
    el.timer.hidden = false;
    el.timer.dataset.urgent = 'false';
    el.timer.textContent = `⏱️ ${net.countdownLeft}s`;
    return;
  }

  el.timer.hidden = true;
  el.timer.textContent = '';
}

function startTimer() {
  clearGameTimer();
  state.timeLeft = state.duration;
  renderTimer();

  state.timerId = setInterval(() => {
    if (state.timerPaused) return;

    state.timeLeft -= 1;
    renderTimer();

    if (state.timeLeft <= 0) endTimedMatch();
  }, 1000);
}

function endTimedMatch() {
  clearGameTimer();
  state.matchOver = true;
  updateChoiceButtonsState();

  const { playerScore, opponentScore } = state;

  if (playerScore > opponentScore) {
    showMatchOverlay('🎉', '¡Se acabó el tiempo!', 'Ganaste la partida.', 'win');
  } else if (opponentScore > playerScore) {
    showMatchOverlay('💀', '¡Se acabó el tiempo!', 'El bot se llevó la partida.', 'lose');
  } else {
    showMatchOverlay('🤝', '¡Se acabó el tiempo!', 'Empate técnico.', 'tie');
  }
}

/* Pausa el reloj si la pestaña queda en segundo plano: perder una
   partida por una notificación es frustrante y no aporta nada. */
function handleVisibilityChange() {
  if (state.mode !== 'timed' || !state.timerId) return;

  state.timerPaused = document.hidden;
  renderTimer();
}

/* ============ FIN DE PARTIDA ============ */

function checkMatchEnd() {
  if (state.mode !== 'firstTo') return;

  if (state.playerScore >= state.target) {
    state.matchOver = true;
    updateChoiceButtonsState();
    showMatchOverlay('🎉', '¡Victoria!', `Llegaste a ${state.target} antes que el bot.`, 'win');
  } else if (state.opponentScore >= state.target) {
    state.matchOver = true;
    updateChoiceButtonsState();
    showMatchOverlay('💀', 'Derrota', `El bot llegó a ${state.target} primero.`, 'lose');
  }
}

function showMatchOverlay(emoji, title, subtitle, tone) {
  el.overlayEmoji.textContent = emoji;
  el.overlayMessage.textContent = title;
  el.overlaySub.textContent = subtitle;
  el.finalHumanScore.textContent = state.playerScore;
  el.finalComputerScore.textContent = state.opponentScore;

  openDialog(el.overlay, el.playAgain);

  if (tone === 'win') {
    sfx.match();
    launchConfetti();
  } else if (tone === 'lose') {
    sfx.lose();
  }
}

function launchConfetti() {
  if (prefersReducedMotion.matches) return;

  loadScript(CONFETTI_URL)
    .then(() => {
      if (typeof window.confetti !== 'function') return;
      window.confetti({
        particleCount: 140,
        spread: 74,
        origin: { y: 0.62 },
        colors: ['#ff7a59', '#ffc75f', '#3ec8ff', '#3ddc97'],
        scalar: 1.1,
        ticks: 220
      });
    })
    .catch(() => {
      /* sin conexión al CDN el juego sigue igual, solo sin confeti */
    });
}

/* ============ DIÁLOGOS ============ */

let activeDialog = null;
let lastFocused = null;
let confirmAction = null;

function focusableIn(container) {
  return Array.from(
    container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter((node) => !node.disabled && node.offsetParent !== null);
}

function openDialog(dialog, initialFocus) {
  lastFocused = document.activeElement;
  dialog.hidden = false;
  activeDialog = dialog;

  const target = initialFocus || focusableIn(dialog)[0];
  if (target) target.focus();
}

function closeDialog(dialog) {
  dialog.hidden = true;
  if (activeDialog === dialog) activeDialog = null;
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
}

function trapFocus(event) {
  if (!activeDialog || event.key !== 'Tab') return;

  const nodes = focusableIn(activeDialog);
  if (nodes.length === 0) return;

  const first = nodes[0];
  const last = nodes[nodes.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function closeMatchOverlay(restart) {
  closeDialog(el.overlay);

  if (!restart) {
    // La partida sigue terminada: el tablero queda con el resultado final
    // a la vista y bloqueado hasta empezar una nueva.
    el.resultText.textContent = 'Partida terminada. Vuelve a pulsar el modo de juego para empezar otra.';
    updateChoiceButtonsState();
    return;
  }

  resetMatch();
  if (state.mode === 'timed') startTimer();
}

function askConfirm(onAccept) {
  confirmAction = onAccept;
  openDialog(el.confirmDialog, el.confirmCancel);
}

/* ============ PERSISTENCIA ============ */

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* cuota llena o modo privado: se juega igual, solo no persiste */
  }
}

function saveStats() {
  writeJson(STORAGE.stats, stats);
}

function savePrefs() {
  writeJson(STORAGE.prefs, {
    difficulty: state.difficulty,
    bigBang: state.bigBang,
    target: state.target,
    duration: state.duration,
    sound: state.sound
  });
}

function loadStats() {
  const saved = readJson(STORAGE.stats);

  if (saved) {
    stats.games = Number(saved.games) || 0;
    stats.wins = Number(saved.wins) || 0;
    stats.losses = Number(saved.losses) || 0;
    stats.ties = Number(saved.ties) || 0;
    stats.streak = Number(saved.streak) || 0;
    stats.bestStreak = Number(saved.bestStreak) || 0;
    stats.history = Array.isArray(saved.history) ? saved.history.slice(0, HISTORY_LIMIT) : [];
    return;
  }

  // Migración desde el formato antiguo (rps-stats), sin perder el contador.
  const legacy = readJson(STORAGE.legacyStats);
  if (!legacy) return;

  stats.games = Number(legacy.totalGames) || 0;
  stats.wins = Number(legacy.wins) || 0;
  stats.losses = Number(legacy.losses) || 0;
  stats.ties = Math.max(0, stats.games - stats.wins - stats.losses);
  stats.history = [];
  saveStats();
}

function loadPrefs() {
  const saved = readJson(STORAGE.prefs);
  if (!saved) return;

  if (DIFFICULTY_HINTS[saved.difficulty]) state.difficulty = saved.difficulty;
  if (typeof saved.bigBang === 'boolean') state.bigBang = saved.bigBang;
  if ([3, 5, 10].includes(Number(saved.target))) state.target = Number(saved.target);
  if ([15, 30, 60].includes(Number(saved.duration))) state.duration = Number(saved.duration);
  if (typeof saved.sound === 'boolean') state.sound = saved.sound;
}

function resetAllData() {
  stats.games = 0;
  stats.wins = 0;
  stats.losses = 0;
  stats.ties = 0;
  stats.streak = 0;
  stats.bestStreak = 0;
  stats.history = [];

  botMemory.moves.length = 0;
  botMemory.frequency = Object.create(null);
  botMemory.transitions = Object.create(null);

  try {
    localStorage.removeItem(STORAGE.stats);
    localStorage.removeItem(STORAGE.legacyStats);
  } catch (error) {
    /* nada que limpiar */
  }

  renderStats();
  renderHistory();
  resetMatch();

  if (state.mode === 'timed') startTimer();
  toast('Estadísticas reiniciadas', 'success');
}

/* ============ ONLINE (P2P con PeerJS) ============ */

function setOnlineStatus(message, tone = 'neutral') {
  el.onlineStatus.textContent = message;
  el.onlineStatus.dataset.tone = tone;
}

function clearOnlineTimers() {
  if (net.countdownTimer) {
    clearInterval(net.countdownTimer);
    net.countdownTimer = null;
  }
  if (net.choiceTimer) {
    clearTimeout(net.choiceTimer);
    net.choiceTimer = null;
  }
}

function generateRoomId() {
  return `rps-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function buildRoomLink(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  url.searchParams.set('bigbang', state.bigBang ? '1' : '0');
  return url.toString();
}

function updateRoomLink() {
  el.roomLink.value = net.roomId ? buildRoomLink(net.roomId) : '';
}

function copyRoomLink() {
  if (!el.roomLink.value) {
    toast('Primero crea una sala', 'warning');
    return;
  }

  const fallback = () => {
    el.roomLink.select();
    toast('Copia el enlace con Ctrl+C', 'warning');
  };

  if (!navigator.clipboard) {
    fallback();
    return;
  }

  navigator.clipboard
    .writeText(el.roomLink.value)
    .then(() => toast('Enlace copiado', 'success'))
    .catch(fallback);
}

function destroyPeer() {
  clearOnlineTimers();

  if (net.conn) {
    try { net.conn.close(); } catch (error) { /* ya cerrada */ }
    net.conn = null;
  }

  if (net.peer) {
    try { net.peer.destroy(); } catch (error) { /* ya destruido */ }
    net.peer = null;
  }

  net.connected = false;
  net.phase = 'idle';
  net.localChoice = null;
  net.remoteChoice = null;
}

function teardownOnline() {
  destroyPeer();
  net.roomId = '';
  net.joinRequested = false;
  net.joinRoomId = '';
  net.isHost = false;
  setOnlineStatus('Inactivo');
  updateRoomLink();
  el.leaveRoomBtn.hidden = true;
}

function leaveOnlineSession() {
  if (net.conn && net.conn.open) {
    sendOnlineMessage({ type: 'opponent-left' });
  }

  teardownOnline();
  setMode('classic');
  toast('Saliste de la sala');
}

function startOnlineSession() {
  if (net.joinRequested && net.joinRoomId) {
    joinOnlineRoom(net.joinRoomId);
  } else {
    createOnlineRoom();
  }
}

/* PeerJS se descarga solo cuando hace falta: quien nunca use el modo
   online no paga ~80 KB de JavaScript de terceros al abrir la página. */
function withPeerJs(onReady) {
  setOnlineStatus('Cargando módulo online…');

  loadScript(PEERJS_URL)
    .then(() => {
      if (typeof window.Peer === 'undefined') throw new Error('PeerJS no disponible');
      onReady();
    })
    .catch(() => {
      setOnlineStatus('No se pudo cargar el módulo online', 'error');
      el.resultText.textContent = '⚠️ Sin conexión con el servidor online. Prueba el modo clásico.';
    });
}

function createOnlineRoom() {
  withPeerJs(() => {
    destroyPeer();
    net.isHost = true;
    net.joinRequested = false;
    net.joinRoomId = '';
    net.roomId = generateRoomId();

    resetMatch('Sala creada. Comparte el enlace para empezar.');
    updateRoomLink();
    setOnlineStatus('Creando sala…');

    net.peer = new window.Peer(net.roomId);
    bindPeerEvents(false);
  });
}

function joinOnlineRoom(roomId) {
  if (!roomId) {
    setOnlineStatus('No se encontró el enlace de la sala', 'error');
    return;
  }

  withPeerJs(() => {
    destroyPeer();
    net.isHost = false;
    net.joinRequested = true;
    net.joinRoomId = roomId;
    net.roomId = roomId;

    resetMatch('Conectando con el anfitrión…');
    updateRoomLink();
    setOnlineStatus('Conectando…');

    net.peer = new window.Peer();
    bindPeerEvents(true);
  });
}

function bindPeerEvents(isGuest) {
  if (!net.peer) return;

  net.peer.on('open', () => {
    if (isGuest) {
      setOnlineStatus('Buscando al anfitrión…');
      bindConnection(net.peer.connect(net.roomId, { reliable: true }));
    } else {
      setOnlineStatus('Sala lista. Comparte el enlace.', 'success');
      el.leaveRoomBtn.hidden = false;
    }
  });

  net.peer.on('connection', (conn) => {
    if (!net.isHost) return;

    // Solo un rival por sala.
    if (net.conn && net.conn.open) {
      conn.close();
      return;
    }

    bindConnection(conn);
  });

  net.peer.on('error', (error) => {
    const type = error && error.type ? error.type : 'desconocido';
    const message = type === 'peer-unavailable'
      ? 'Esa sala ya no existe. Pide un enlace nuevo.'
      : `Error de conexión (${type})`;

    setOnlineStatus(message, 'error');
    updateChoiceButtonsState();
  });

  net.peer.on('disconnected', () => {
    setOnlineStatus('Conexión con el servidor perdida', 'warning');
  });
}

function bindConnection(conn) {
  net.conn = conn;

  conn.on('open', () => {
    net.connected = true;
    el.leaveRoomBtn.hidden = false;
    updateModeUI();

    if (net.isHost) {
      setOnlineStatus('Rival conectado', 'success');
      sendOnlineMessage({ type: 'config', bigBang: state.bigBang });
      scheduleOnlineRound();
    } else {
      setOnlineStatus('Conectado', 'success');
      sendOnlineMessage({ type: 'hello' });
    }
  });

  conn.on('data', handleOnlineMessage);
  conn.on('close', () => handleOnlineDisconnect('La conexión se cerró.'));
  conn.on('error', () => handleOnlineDisconnect('Se perdió la conexión.'));
}

function sendOnlineMessage(message) {
  if (net.conn && net.conn.open) {
    net.conn.send(message);
  }
}

function startGuestCountdown(seconds) {
  net.phase = 'countdown';
  net.localChoice = null;
  net.remoteChoice = null;
  net.countdownLeft = seconds;
  clearOnlineTimers();
  resetArena();
  el.resultText.textContent = `⏳ La ronda empieza en ${net.countdownLeft}…`;
  renderTimer();
  updateChoiceButtonsState();

  net.countdownTimer = setInterval(() => {
    net.countdownLeft -= 1;
    renderTimer();

    if (net.countdownLeft <= 0) {
      clearOnlineTimers();
      net.phase = 'choose';
      el.resultText.textContent = '🎯 ¡Elige tu jugada!';
      renderTimer();
      updateChoiceButtonsState();
    }
  }, 1000);
}

function handleOnlineMessage(message) {
  if (!message || typeof message !== 'object') return;

  switch (message.type) {
    case 'hello':
      break;

    case 'config':
      state.bigBang = Boolean(message.bigBang);
      el.bigBangToggle.checked = state.bigBang;
      renderChoiceButtons();
      renderRules();
      break;

    case 'round-start':
      net.roundId = message.roundId || net.roundId + 1;
      startGuestCountdown(message.countdown || ONLINE_COUNTDOWN_SECONDS);
      break;

    case 'round-open':
      net.phase = 'choose';
      el.resultText.textContent = '🎯 ¡Elige tu jugada!';
      renderTimer();
      updateChoiceButtonsState();
      break;

    case 'choice':
      net.remoteChoice = message.choice || null;
      if (net.isHost) maybeResolveOnlineRound();
      break;

    case 'result':
      applyOnlineResult(message);
      break;

    case 'opponent-left':
      handleOnlineDisconnect('El rival salió de la partida.');
      break;

    default:
      break;
  }
}

function scheduleOnlineRound() {
  if (!net.connected || !net.isHost || !isOnline()) return;

  clearOnlineTimers();
  net.roundId += 1;
  net.phase = 'countdown';
  net.localChoice = null;
  net.remoteChoice = null;
  net.countdownLeft = ONLINE_COUNTDOWN_SECONDS;

  resetArena();
  el.resultText.textContent = `⏳ La ronda empieza en ${net.countdownLeft}…`;
  renderTimer();
  updateChoiceButtonsState();

  sendOnlineMessage({
    type: 'round-start',
    roundId: net.roundId,
    countdown: ONLINE_COUNTDOWN_SECONDS
  });

  net.countdownTimer = setInterval(() => {
    net.countdownLeft -= 1;
    renderTimer();

    if (net.countdownLeft <= 0) {
      clearOnlineTimers();
      openOnlineChoicePhase();
    }
  }, 1000);
}

function openOnlineChoicePhase() {
  if (!net.connected || !net.isHost || !isOnline()) return;

  net.phase = 'choose';
  el.resultText.textContent = '🎯 ¡Elige tu jugada!';
  renderTimer();
  updateChoiceButtonsState();

  sendOnlineMessage({ type: 'round-open', roundId: net.roundId });

  clearTimeout(net.choiceTimer);
  net.choiceTimer = setTimeout(() => resolveOnlineRound('timeout'), ONLINE_CHOICE_TIMEOUT_MS);
}

function submitOnlineChoice(move) {
  if (!isOnline() || !net.connected || net.phase !== 'choose' || net.localChoice) return;

  net.localChoice = move;
  markSelected(move);
  sfx.click();
  el.resultText.textContent = '⏳ Jugada enviada. Esperando al rival…';
  updateChoiceButtonsState();

  if (net.isHost) {
    maybeResolveOnlineRound();
    return;
  }

  sendOnlineMessage({ type: 'choice', roundId: net.roundId, choice: move });
}

function maybeResolveOnlineRound() {
  if (!net.isHost || !net.connected || !isOnline()) return;
  if (net.localChoice && net.remoteChoice) resolveOnlineRound('normal');
}

function resolveOnlineRound(reason) {
  if (!net.isHost || !isOnline()) return;

  clearOnlineTimers();

  const hostChoice = net.localChoice;
  const guestChoice = net.remoteChoice;
  let winner = 'tie';
  let noContest = false;

  if (!hostChoice && !guestChoice) {
    noContest = true;
  } else if (!hostChoice) {
    winner = 'guest';
  } else if (!guestChoice) {
    winner = 'host';
  } else {
    const outcome = judge(hostChoice, guestChoice);
    winner = outcome === 'tie' ? 'tie' : outcome === 'win' ? 'host' : 'guest';
  }

  const payload = {
    type: 'result',
    roundId: net.roundId,
    hostChoice,
    guestChoice,
    winner,
    reason,
    noContest
  };

  sendOnlineMessage(payload);
  applyOnlineResult(payload);
}

function applyOnlineResult(payload) {
  clearOnlineTimers();
  net.phase = 'idle';
  renderTimer();

  const localMove = net.isHost ? payload.hostChoice : payload.guestChoice;
  const remoteMove = net.isHost ? payload.guestChoice : payload.hostChoice;

  if (payload.noContest) {
    el.resultText.textContent = '⏱️ Nadie eligió a tiempo. Va otra ronda.';
    updateChoiceButtonsState();
    if (net.isHost && net.connected) {
      net.choiceTimer = setTimeout(scheduleOnlineRound, 1800);
    }
    return;
  }

  let result = 'tie';
  if (payload.winner !== 'tie') {
    const localWon = (payload.winner === 'host') === net.isHost;
    result = localWon ? 'win' : 'lose';
  }

  let message = '';
  if (!localMove || !remoteMove) {
    message = result === 'win'
      ? '✅ Ganaste la ronda: el rival no eligió a tiempo.'
      : '❌ Perdiste la ronda: se te acabó el tiempo.';
  }

  revealHands(localMove, remoteMove);
  resolveRound(localMove, remoteMove, result, message);

  if (net.isHost && net.connected) {
    net.choiceTimer = setTimeout(scheduleOnlineRound, 2200);
  }
}

function handleOnlineDisconnect(message) {
  clearOnlineTimers();
  net.connected = false;
  net.phase = 'idle';
  net.localChoice = null;
  net.remoteChoice = null;
  renderTimer();
  updateChoiceButtonsState();

  el.resultText.textContent = `⚠️ ${message}`;

  if (net.isHost) {
    setOnlineStatus('El rival se fue. Comparte el enlace otra vez.', 'warning');
    el.leaveRoomBtn.hidden = false;
  } else {
    setOnlineStatus('Se perdió la conexión con el anfitrión', 'error');
  }
}

/* ============ ATAJOS DE TECLADO ============ */

function handleKeydown(event) {
  if (activeDialog) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (activeDialog === el.overlay) closeMatchOverlay(false);
      else closeDialog(activeDialog);
      return;
    }
    trapFocus(event);
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const moves = activeMoves();
  const index = Number(event.key);

  if (Number.isInteger(index) && index >= 1 && index <= moves.length) {
    event.preventDefault();
    handleChoice(moves[index - 1]);
    return;
  }

  switch (event.key.toLowerCase()) {
    case 't':
      toggleTheme();
      break;
    case 'm':
      toggleSound();
      break;
    case 'r':
      askConfirm(resetAllData);
      break;
    default:
      break;
  }
}

/* ============ EVENTOS ============ */

function delegateChips(container, attribute, handler) {
  container.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip || chip.disabled) return;

    const raw = chip.dataset[attribute];
    handler(attribute === 'mode' || attribute === 'difficulty' ? raw : Number(raw));
  });
}

function setupEventListeners() {
  delegateChips(el.modeChips, 'mode', setMode);
  delegateChips(el.difficultyChips, 'difficulty', setDifficulty);
  delegateChips(el.targetChips, 'target', setTarget);
  delegateChips(el.durationChips, 'duration', setDuration);

  el.bigBangToggle.addEventListener('change', handleBigBangToggle);

  el.themeToggle.addEventListener('click', toggleTheme);
  el.soundToggle.addEventListener('click', toggleSound);
  el.resetBtn.addEventListener('click', () => askConfirm(resetAllData));

  el.createRoomBtn.addEventListener('click', createOnlineRoom);
  el.copyRoomLink.addEventListener('click', copyRoomLink);
  el.leaveRoomBtn.addEventListener('click', leaveOnlineSession);
  el.roomLink.addEventListener('focus', () => el.roomLink.select());

  el.playAgain.addEventListener('click', () => closeMatchOverlay(true));
  el.overlayClose.addEventListener('click', () => closeMatchOverlay(false));

  el.confirmAccept.addEventListener('click', () => {
    closeDialog(el.confirmDialog);
    if (confirmAction) confirmAction();
    confirmAction = null;
  });

  el.confirmCancel.addEventListener('click', () => {
    closeDialog(el.confirmDialog);
    confirmAction = null;
  });

  // Clic fuera del cuadro cierra el diálogo.
  el.confirmDialog.addEventListener('click', (event) => {
    if (event.target === el.confirmDialog) {
      closeDialog(el.confirmDialog);
      confirmAction = null;
    }
  });

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Cerrar la pestaña en mitad de una partida online avisa al rival.
  window.addEventListener('pagehide', () => {
    if (net.connected) sendOnlineMessage({ type: 'opponent-left' });
  });
}

/* ============ ARRANQUE ============ */

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('bigbang') === '1') state.bigBang = true;

  const room = params.get('room');
  if (room) {
    state.mode = 'online';
    net.joinRequested = true;
    net.joinRoomId = room;
  }
}

function init() {
  loadPrefs();
  loadStats();
  applyUrlState();

  el.bigBangToggle.checked = state.bigBang;
  el.soundToggle.setAttribute('aria-pressed', String(state.sound));
  el.soundToggle.querySelector('.icon-btn-glyph').textContent = state.sound ? '🔊' : '🔇';
  syncThemeIcon();

  renderChoiceButtons();
  renderRules();
  renderStats();
  renderHistory();
  renderStreak();
  resetMatch();
  updateModeUI();
  setupEventListeners();

  if (isOnline()) {
    el.resultText.textContent = 'Conectando con la sala…';
    startOnlineSession();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

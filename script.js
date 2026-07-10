// ============ ESTADO DEL JUEGO ============
let gameState = {
  humanScore: 0,
  computerScore: 0,
  totalGames: 0,
  wins: 0,
  losses: 0,
  history: [],
  currentMode: 'classic',
  useBigBang: false,
  timeLeft: 30,
  timer: null
};

let onlineState = {
  peer: null,
  conn: null,
  roomId: '',
  isHost: false,
  connected: false,
  phase: 'idle',
  roundId: 0,
  localChoice: null,
  remoteChoice: null,
  countdownTimer: null,
  choiceTimer: null,
  countdownLeft: 3,
  roomJoinRequested: false,
  joinRoomId: '',
  connectedPeerId: '',
  remoteName: 'Rival'
};

// ============ ELEMENTOS DOM ============
const resultText = document.getElementById('result-text');
const scoreDisplay = document.getElementById('score');
const timerText = document.getElementById('timer-text');
const modeSelect = document.getElementById('mode');
const bigBangToggle = document.getElementById('bigbang-toggle');
const onlinePanel = document.getElementById('online-panel');
const onlineStatus = document.getElementById('online-status');
const roomLinkInput = document.getElementById('room-link');
const createRoomBtn = document.getElementById('create-room-btn');
const copyRoomLinkBtn = document.getElementById('copy-room-link');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlay-message');
const playAgainBtn = document.getElementById('play-again');
const choicesDiv = document.querySelector('.choices');
const themeToggle = document.querySelector('.theme-toggle');
const resetBtn = document.querySelector('.reset-btn');

// Estadísticas
const totalGamesEl = document.getElementById('total-games');
const winsEl = document.getElementById('wins');
const lossesEl = document.getElementById('losses');
const winRateEl = document.getElementById('win-rate');

// Historial
const historyList = document.getElementById('history-list');

// Audio
const winSound = document.getElementById('win-sound');
const loseSound = document.getElementById('lose-sound');

// ============ CONSTANTES ============
const CHOICES = {
  CLASSIC: ['rock', 'paper', 'scissors'],
  BIG_BANG: ['rock', 'paper', 'scissors', 'lizard', 'spock']
};

const CHOICE_NAMES = {
  rock: '🪨 Piedra',
  paper: '📄 Papel',
  scissors: '✂️ Tijeras',
  lizard: '🦎 Lagarto',
  spock: '🖖 Spock'
};

const RULES = {
  rock: { beats: ['scissors', 'lizard'], name: 'rompe' },
  paper: { beats: ['rock', 'spock'], name: 'cubre' },
  scissors: { beats: ['paper', 'lizard'], name: 'corta' },
  lizard: { beats: ['spock', 'paper'], name: 'envenena' },
  spock: { beats: ['scissors', 'rock'], name: 'rompe' }
};

const URL_PARAMS = new URLSearchParams(window.location.search);
const INITIAL_ROOM_ID = URL_PARAMS.get('room') || '';
const INITIAL_BIG_BANG = URL_PARAMS.get('bigbang') === '1';
const ONLINE_COUNTDOWN_SECONDS = 3;
const ONLINE_CHOICE_TIMEOUT_MS = 15000;

function clearGameTimer() {
  if (gameState.timer) {
    clearInterval(gameState.timer);
    gameState.timer = null;
  }
}

function clearOnlineTimers() {
  if (onlineState.countdownTimer) {
    clearInterval(onlineState.countdownTimer);
    onlineState.countdownTimer = null;
  }

  if (onlineState.choiceTimer) {
    clearTimeout(onlineState.choiceTimer);
    onlineState.choiceTimer = null;
  }
}

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
  loadGameState();
  applyInitialUrlState();
  updateChoiceButtons();
  setupEventListeners();
  updateStatsDisplay();
  updateHistoryDisplay();
  updateScoreDisplay();
  updateModeUI();

  if (gameState.currentMode === 'online') {
    if (onlineState.roomJoinRequested && onlineState.joinRoomId) {
      joinOnlineRoom(onlineState.joinRoomId);
    } else {
      createOnlineRoom();
    }
  }
});

// ============ EVENT LISTENERS ============
function setupEventListeners() {
  modeSelect.addEventListener('change', handleModeChange);
  bigBangToggle.addEventListener('change', handleBigBangToggle);
  createRoomBtn.addEventListener('click', createOnlineRoom);
  copyRoomLinkBtn.addEventListener('click', copyRoomLink);
  leaveRoomBtn.addEventListener('click', leaveOnlineSession);
  playAgainBtn.addEventListener('click', hideOverlay);
  themeToggle.addEventListener('click', toggleTheme);
  resetBtn.addEventListener('click', resetAllData);
}

function applyInitialUrlState() {
  if (INITIAL_BIG_BANG) {
    bigBangToggle.checked = true;
    gameState.useBigBang = true;
  }

  if (INITIAL_ROOM_ID) {
    modeSelect.value = 'online';
    gameState.currentMode = 'online';
    onlineState.roomJoinRequested = true;
    onlineState.joinRoomId = INITIAL_ROOM_ID;
  }
}

// ============ TEMA ============
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('rps-theme', newTheme);
  
  const icon = themeToggle.querySelector('.theme-icon');
  icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
}

// Cargar tema guardado
const savedTheme = localStorage.getItem('rps-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.querySelector('.theme-icon').textContent = savedTheme === 'dark' ? '🌙' : '☀️';

function updateModeUI() {
  const onlineActive = gameState.currentMode === 'online';
  const firstTo5Option = modeSelect.querySelector('option[value="firstTo5"]');
  const timedOption = modeSelect.querySelector('option[value="timed"]');

  firstTo5Option.disabled = onlineActive;
  timedOption.disabled = onlineActive;

  onlinePanel.hidden = !onlineActive;
  bigBangToggle.disabled = onlineActive && onlineState.connected && !onlineState.isHost;
  leaveRoomBtn.hidden = !onlineActive || !onlineState.connected;

  if (onlineActive) {
    clearGameTimer();
    timerText.textContent = '';
    if (!onlineState.roomJoinRequested && !onlineState.isHost && !onlineState.connected) {
      createOnlineRoom();
    }
  }
}

// ============ BOTONES DE OPCIÓN ============
function updateChoiceButtons() {
  const choices = gameState.useBigBang ? CHOICES.BIG_BANG : CHOICES.CLASSIC;
  
  choicesDiv.innerHTML = '';
  
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = CHOICE_NAMES[choice];
    btn.addEventListener('click', () => handleChoiceSelection(choice));
    choicesDiv.appendChild(btn);
  });

  updateChoiceButtonsState();
}

function handleChoiceSelection(choice) {
  if (gameState.currentMode === 'online') {
    submitOnlineChoice(choice);
    return;
  }

  playRound(choice);
}

function updateChoiceButtonsState() {
  const choiceButtons = choicesDiv.querySelectorAll('button');
  const localTimedLocked = gameState.currentMode === 'timed' && gameState.timeLeft <= 0;
  const onlineLocked = gameState.currentMode === 'online'
    ? !(onlineState.connected && onlineState.phase === 'choose' && !onlineState.localChoice)
    : localTimedLocked;

  choiceButtons.forEach(button => {
    button.disabled = onlineLocked;
  });
}

// ============ LÓGICA DEL JUEGO ============
function getComputerChoice() {
  const choices = gameState.useBigBang ? CHOICES.BIG_BANG : CHOICES.CLASSIC;
  return choices[Math.floor(Math.random() * choices.length)];
}

function playRound(humanChoice) {
  // Validar que el juego esté activo
  if (gameState.currentMode === 'timed' && gameState.timeLeft <= 0) return;

  const computerChoice = getComputerChoice();
  const result = determineWinner(humanChoice, computerChoice);
  
  displayResult(humanChoice, computerChoice, result);
  updateGameState(result);
  addToHistory(humanChoice, computerChoice, result);
  updateStatsDisplay();
  updateHistoryDisplay();
  
  checkEndCondition();
}

function determineWinner(human, computer) {
  if (human === computer) return 'tie';
  
  if (RULES[human].beats.includes(computer)) {
    return 'human';
  }
  return 'computer';
}

function displayResult(human, computer, result, customMessage = '') {
  if (customMessage) {
    resultText.textContent = customMessage;
    if (result === 'human') {
      playWinSound();
    } else if (result === 'computer') {
      playLoseSound();
    }
    return;
  }

  let message = '';
  
  if (result === 'tie') {
    message = `🤝 ¡Empate! Ambos elegisteis ${CHOICE_NAMES[human]}`;
  } else if (result === 'human') {
    const verb = RULES[human].name;
    message = `✅ ¡Ganaste! ${CHOICE_NAMES[human]} ${verb} ${CHOICE_NAMES[computer]}`;
    playWinSound();
  } else {
    const verb = RULES[computer].name;
    message = `❌ ¡Perdiste! ${CHOICE_NAMES[computer]} ${verb} ${CHOICE_NAMES[human]}`;
    playLoseSound();
  }
  
  resultText.textContent = message;
}

function updateGameState(result) {
  if (!result) {
    return;
  }

  gameState.totalGames++;
  
  if (result === 'human') {
    gameState.humanScore++;
    gameState.wins++;
  } else if (result === 'computer') {
    gameState.computerScore++;
    gameState.losses++;
  }
  
  updateScoreDisplay();
  saveGameState();
}

function updateScoreDisplay() {
  if (gameState.currentMode === 'online') {
    scoreDisplay.textContent = `Tú: ${gameState.humanScore} | Rival: ${gameState.computerScore}`;
    return;
  }

  scoreDisplay.textContent = `Tu Puntuación: ${gameState.humanScore} | Bot: ${gameState.computerScore}`;
}

// ============ ESTADÍSTICAS ============
function updateStatsDisplay() {
  totalGamesEl.textContent = gameState.totalGames;
  winsEl.textContent = gameState.wins;
  lossesEl.textContent = gameState.losses;
  
  const winRate = gameState.totalGames === 0 
    ? 0 
    : Math.round((gameState.wins / gameState.totalGames) * 100);
  winRateEl.textContent = `${winRate}%`;
}

function addToHistory(human, computer, result) {
  const entry = {
    timestamp: new Date().toLocaleTimeString(),
    human: human ? CHOICE_NAMES[human] : '⏳ Sin elegir',
    computer: computer ? CHOICE_NAMES[computer] : '⏳ Sin elegir',
    result
  };

  gameState.history.unshift(entry);
  if (gameState.history.length > 10) {
    gameState.history.pop();
  }
}

function updateHistoryDisplay() {
  if (gameState.history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">Sin historial</p>';
    return;
  }
  
  historyList.innerHTML = gameState.history
    .map((entry, idx) => `
      <div class="history-item ${entry.result}">
        <span>${entry.human} vs ${entry.computer}</span>
        <span class="history-result">${
          entry.result === 'human' ? '✅' : entry.result === 'computer' ? '❌' : '🤝'
        }</span>
      </div>
    `)
    .join('');
}

// ============ CONDICIONES FIN DE JUEGO ============
function checkEndCondition() {
  const { currentMode, humanScore, computerScore } = gameState;
  
  if (currentMode === 'firstTo5') {
    if (humanScore >= 5) {
      showOverlay('🎉 ¡VICTORIA! ¡Fuiste el primero en llegar a 5!');
      playWinSound();
      return true;
    } else if (computerScore >= 5) {
      showOverlay('💀 ¡DERROTA! El Bot llegó a 5 primero.');
      playLoseSound();
      return true;
    }
  }
  
  return false;
}

// ============ TEMPORIZADOR ============
function startTimer() {
  clearGameTimer();
  gameState.timeLeft = 30;
  resetRound();
  updateTimerDisplay();
  
  gameState.timer = setInterval(() => {
    gameState.timeLeft--;
    updateTimerDisplay();
    
    if (gameState.timeLeft <= 0) {
      endTimedGame();
    }
  }, 1000);

  updateChoiceButtonsState();
}

function updateTimerDisplay() {
  if (gameState.currentMode === 'timed') {
    timerText.textContent = `⏱️ ${gameState.timeLeft}s`;
  } else if (gameState.currentMode === 'online' && onlineState.phase === 'countdown') {
    timerText.textContent = `⏱️ ${onlineState.countdownLeft}s`;
  } else {
    timerText.textContent = '';
  }
}

function endTimedGame() {
  clearInterval(gameState.timer);
  const { humanScore, computerScore } = gameState;
  
  if (humanScore > computerScore) {
    showOverlay('🎉 ⏰ ¡SE ACABÓ EL TIEMPO! ¡GANASTE!');
    playWinSound();
  } else if (computerScore > humanScore) {
    showOverlay('💀 ⏰ ¡SE ACABÓ EL TIEMPO! ¡PERDISTE!');
    playLoseSound();
  } else {
    showOverlay('🤝 ⏰ ¡SE ACABÓ EL TIEMPO! ¡EMPATE!');
  }
}

// ============ MODOS DE JUEGO ============
function handleModeChange() {
  const previousMode = gameState.currentMode;
  gameState.currentMode = modeSelect.value;

  if (previousMode === 'online' && gameState.currentMode !== 'online') {
    leaveOnlineSession(false);
  }

  clearGameTimer();
  clearOnlineTimers();
  timerText.textContent = '';

  if (gameState.currentMode === 'online') {
    gameState.humanScore = 0;
    gameState.computerScore = 0;
    resultText.textContent = 'Conectando sala online...';
  } else {
    resetRound();
  }
  
  if (gameState.currentMode === 'timed') {
    startTimer();
  }

  if (gameState.currentMode === 'online') {
    updateModeUI();
    if (onlineState.roomJoinRequested && onlineState.joinRoomId) {
      joinOnlineRoom(onlineState.joinRoomId);
    } else if (!onlineState.peer && !onlineState.connected) {
      createOnlineRoom();
    }
  }

  updateChoiceButtonsState();
  updateScoreDisplay();
}

function handleBigBangToggle() {
  gameState.useBigBang = bigBangToggle.checked;
  resetRound();
  updateChoiceButtons();

  if (gameState.currentMode === 'online' && onlineState.connected) {
    sendOnlineMessage({
      type: 'config',
      useBigBang: gameState.useBigBang
    });
  }
}

function resetRound() {
  gameState.humanScore = 0;
  gameState.computerScore = 0;
  updateScoreDisplay();
  resultText.textContent = '¡Haz tu movimiento!';
  updateTimerDisplay();
  updateChoiceButtonsState();
}

// ============ OVERLAY ============
function showOverlay(message) {
  overlayMessage.textContent = message;
  overlayMessage.parentElement.querySelector('.overlay-stats').innerHTML = `
    <p>Tu Puntuación: <strong id="final-human-score">${gameState.humanScore}</strong></p>
    <p>Bot Puntuación: <strong id="final-computer-score">${gameState.computerScore}</strong></p>
  `;
  
  overlay.hidden = false;
  
  // Confeti si ganaste
  if (message.includes('VICTORIA') || message.includes('GANASTE')) {
    launchConfetti();
  }
}

function hideOverlay() {
  overlay.hidden = true;
  
  if (gameState.currentMode === 'timed') {
    startTimer();
  } else {
    resetRound();
  }
}

// ============ AUDIO ============
function playWinSound() {
  // Oscilador simple para sonido de victoria
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

function playLoseSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 300;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
}

// ============ CONFETI ============
function launchConfetti() {
  if (typeof confetti !== 'undefined') {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff00cc', '#ffde59', '#00ffff'],
      scalar: 1.2,
      ticks: 250
    });
  }
}

// ============ PERSISTENCIA ============
function saveGameState() {
  const { totalGames, wins, losses, history } = gameState;
  localStorage.setItem('rps-stats', JSON.stringify({
    totalGames,
    wins,
    losses,
    history
  }));
}

function loadGameState() {
  const saved = localStorage.getItem('rps-stats');
  if (saved) {
    try {
      const { totalGames = 0, wins = 0, losses = 0, history = [] } = JSON.parse(saved);
      gameState.totalGames = totalGames;
      gameState.wins = wins;
      gameState.losses = losses;
      gameState.history = Array.isArray(history) ? history : [];
    } catch (error) {
      localStorage.removeItem('rps-stats');
    }
  }
}

function resetAllData() {
  if (confirm('¿Estás seguro de que quieres resetear todos los datos?')) {
    clearGameTimer();
    leaveOnlineSession(true);
    gameState = {
      ...gameState,
      totalGames: 0,
      wins: 0,
      losses: 0,
      history: []
    };
    localStorage.removeItem('rps-stats');
    updateStatsDisplay();
    updateHistoryDisplay();
    resetRound();
    timerText.textContent = '';
  }
}

// ============ ONLINE ============
function choiceLabel(choice) {
  return choice ? CHOICE_NAMES[choice] : '⏳ sin elegir';
}

function generateRoomId() {
  return `rps-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function buildRoomLink(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'online');
  url.searchParams.set('room', roomId);
  url.searchParams.set('bigbang', gameState.useBigBang ? '1' : '0');
  return url.toString();
}

function updateRoomLink() {
  if (!roomLinkInput) {
    return;
  }

  if (!onlineState.roomId) {
    roomLinkInput.value = '';
    return;
  }

  roomLinkInput.value = buildRoomLink(onlineState.roomId);
}

function copyRoomLink() {
  if (!roomLinkInput.value) {
    setOnlineStatus('Primero crea una sala.', 'warning');
    return;
  }

  navigator.clipboard.writeText(roomLinkInput.value)
    .then(() => setOnlineStatus('Enlace copiado.', 'success'))
    .catch(() => setOnlineStatus('No se pudo copiar el enlace.', 'error'));
}

function setOnlineStatus(message, tone = 'neutral') {
  if (!onlineStatus) {
    return;
  }

  onlineStatus.textContent = message;
  onlineStatus.dataset.tone = tone;
}

function destroyOnlinePeer() {
  clearOnlineTimers();

  if (onlineState.conn) {
    try {
      onlineState.conn.close();
    } catch (error) {
      // ignore
    }
    onlineState.conn = null;
  }

  if (onlineState.peer) {
    try {
      onlineState.peer.destroy();
    } catch (error) {
      // ignore
    }
    onlineState.peer = null;
  }

  onlineState.connected = false;
  onlineState.phase = 'idle';
  onlineState.localChoice = null;
  onlineState.remoteChoice = null;
  onlineState.connectedPeerId = '';
}

function leaveOnlineSession(restoreClassic = true) {
  destroyOnlinePeer();
  onlineState.roomId = '';
  onlineState.roomJoinRequested = false;
  onlineState.joinRoomId = '';
  onlineState.isHost = false;
  setOnlineStatus('Inactivo');
  updateRoomLink();
  onlinePanel.hidden = true;
  leaveRoomBtn.hidden = true;

  if (restoreClassic) {
    gameState.currentMode = 'classic';
    modeSelect.value = 'classic';
    resetRound();
    updateChoiceButtons();
    updateModeUI();
  }
}

function createOnlineRoom() {
  if (typeof Peer === 'undefined') {
    setOnlineStatus('PeerJS no está disponible en este navegador.', 'error');
    return;
  }

  destroyOnlinePeer();
  onlineState.isHost = true;
  onlineState.roomJoinRequested = false;
  onlineState.joinRoomId = '';
  onlineState.roomId = generateRoomId();
  gameState.humanScore = 0;
  gameState.computerScore = 0;
  updateScoreDisplay();
  updateRoomLink();
  updateChoiceButtonsState();
  setOnlineStatus('Creando sala...', 'neutral');

  onlineState.peer = new Peer(onlineState.roomId);
  bindOnlinePeerEvents();
}

function joinOnlineRoom(roomId) {
  if (!roomId) {
    setOnlineStatus('No se encontró el enlace de la sala.', 'error');
    return;
  }

  if (typeof Peer === 'undefined') {
    setOnlineStatus('PeerJS no está disponible en este navegador.', 'error');
    return;
  }

  destroyOnlinePeer();
  onlineState.isHost = false;
  onlineState.roomJoinRequested = true;
  onlineState.joinRoomId = roomId;
  onlineState.roomId = roomId;
  gameState.humanScore = 0;
  gameState.computerScore = 0;
  updateScoreDisplay();
  updateRoomLink();
  updateChoiceButtonsState();
  setOnlineStatus('Conectando a la sala...', 'neutral');

  onlineState.peer = new Peer();
  bindOnlinePeerEvents(true);
}

function bindOnlinePeerEvents(isGuest = false) {
  if (!onlineState.peer) {
    return;
  }

  onlineState.peer.on('open', () => {
    if (isGuest) {
      setOnlineStatus('Buscando al anfitrión...', 'neutral');
      const conn = onlineState.peer.connect(onlineState.roomId, { reliable: true });
      bindOnlineConnection(conn);
    } else {
      setOnlineStatus('Sala lista. Comparte el enlace.', 'success');
      leaveRoomBtn.hidden = false;
    }
  });

  onlineState.peer.on('connection', conn => {
    if (!onlineState.isHost) {
      return;
    }

    if (onlineState.conn && onlineState.conn.open) {
      conn.close();
      return;
    }

    bindOnlineConnection(conn);
  });

  onlineState.peer.on('error', error => {
    setOnlineStatus(`Error online: ${error.type || 'desconocido'}`, 'error');
    updateChoiceButtonsState();
  });

  onlineState.peer.on('disconnected', () => {
    if (onlineState.isHost) {
      setOnlineStatus('Se perdió la conexión con el servidor de señalización.', 'error');
    }
  });
}

function bindOnlineConnection(conn) {
  onlineState.conn = conn;

  conn.on('open', () => {
    onlineState.connected = true;
    onlineState.connectedPeerId = conn.peer || '';
    leaveRoomBtn.hidden = false;
    updateChoiceButtonsState();

    if (onlineState.isHost) {
      setOnlineStatus('Rival conectado. La ronda empieza ahora.', 'success');
      sendOnlineMessage({ type: 'config', useBigBang: gameState.useBigBang });
      scheduleOnlineRoundStart();
    } else {
      setOnlineStatus('Conectado. Espera al anfitrión.', 'success');
      sendOnlineMessage({ type: 'hello' });
    }
  });

  conn.on('data', handleOnlineMessage);
  conn.on('close', () => handleOnlineDisconnect('La conexión se cerró.'));
  conn.on('error', () => handleOnlineDisconnect('Se perdió la conexión.'));
}

function sendOnlineMessage(message) {
  if (!onlineState.conn || !onlineState.conn.open) {
    return;
  }

  onlineState.conn.send(message);
}

function handleOnlineMessage(message) {
  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.type === 'hello') {
    return;
  }

  if (message.type === 'config') {
    gameState.useBigBang = !!message.useBigBang;
    bigBangToggle.checked = gameState.useBigBang;
    updateChoiceButtons();
    updateChoiceButtonsState();
    return;
  }

  if (message.type === 'round-start') {
    onlineState.roundId = message.roundId || (onlineState.roundId + 1);
    onlineState.phase = 'countdown';
    onlineState.localChoice = null;
    onlineState.remoteChoice = null;
    onlineState.countdownLeft = message.countdown || ONLINE_COUNTDOWN_SECONDS;
    clearOnlineTimers();
    updateTimerDisplay();
    resultText.textContent = `⏳ La ronda comienza en ${onlineState.countdownLeft}...`;
    updateChoiceButtonsState();

    onlineState.countdownTimer = setInterval(() => {
      onlineState.countdownLeft -= 1;
      updateTimerDisplay();

      if (onlineState.countdownLeft <= 0) {
        clearOnlineTimers();
        onlineState.phase = 'choose';
        resultText.textContent = '🎯 Elige tu jugada';
        updateChoiceButtonsState();
      }
    }, 1000);
    return;
  }

  if (message.type === 'round-open') {
    onlineState.phase = 'choose';
    resultText.textContent = '🎯 Elige tu jugada';
    updateChoiceButtonsState();
    clearTimeout(onlineState.choiceTimer);
    onlineState.choiceTimer = setTimeout(() => {
      if (!onlineState.localChoice) {
        resultText.textContent = '⏱️ El tiempo se agotó. Esperando resolución...';
      }
    }, message.timeoutMs || ONLINE_CHOICE_TIMEOUT_MS);
    return;
  }

  if (message.type === 'choice') {
    onlineState.remoteChoice = message.choice || null;
    maybeResolveOnlineRound('normal');
    return;
  }

  if (message.type === 'result') {
    applyOnlineResult(message);
    return;
  }

  if (message.type === 'no-contest') {
    clearOnlineTimers();
    onlineState.phase = 'idle';
    resultText.textContent = message.message || '⏱️ Nadie eligió a tiempo. Nueva ronda.';
    updateChoiceButtonsState();
    if (onlineState.isHost && onlineState.connected) {
      onlineState.choiceTimer = setTimeout(() => scheduleOnlineRoundStart(), 1800);
    }
    return;
  }

  if (message.type === 'opponent-left') {
    handleOnlineDisconnect(message.message || 'El rival salió de la partida.');
  }
}

function scheduleOnlineRoundStart() {
  if (!onlineState.connected || !onlineState.isHost || gameState.currentMode !== 'online') {
    return;
  }

  clearOnlineTimers();
  onlineState.roundId += 1;
  onlineState.phase = 'countdown';
  onlineState.localChoice = null;
  onlineState.remoteChoice = null;
  onlineState.countdownLeft = ONLINE_COUNTDOWN_SECONDS;
  resultText.textContent = `⏳ La ronda comienza en ${onlineState.countdownLeft}...`;
  timerText.textContent = `⏱️ ${onlineState.countdownLeft}s`;
  updateChoiceButtonsState();

  sendOnlineMessage({
    type: 'round-start',
    roundId: onlineState.roundId,
    countdown: ONLINE_COUNTDOWN_SECONDS
  });

  onlineState.countdownTimer = setInterval(() => {
    onlineState.countdownLeft -= 1;
    updateTimerDisplay();

    if (onlineState.countdownLeft <= 0) {
      clearOnlineTimers();
      openOnlineChoicePhase();
    }
  }, 1000);
}

function openOnlineChoicePhase() {
  if (!onlineState.connected || !onlineState.isHost || gameState.currentMode !== 'online') {
    return;
  }

  onlineState.phase = 'choose';
  resultText.textContent = '🎯 Elige tu jugada';
  updateChoiceButtonsState();

  sendOnlineMessage({
    type: 'round-open',
    roundId: onlineState.roundId,
    timeoutMs: ONLINE_CHOICE_TIMEOUT_MS
  });

  clearTimeout(onlineState.choiceTimer);
  onlineState.choiceTimer = setTimeout(() => {
    resolveOnlineRound('timeout');
  }, ONLINE_CHOICE_TIMEOUT_MS);
}

function submitOnlineChoice(choice) {
  if (gameState.currentMode !== 'online' || !onlineState.connected || onlineState.phase !== 'choose' || onlineState.localChoice) {
    return;
  }

  onlineState.localChoice = choice;
  resultText.textContent = '⏳ Elección enviada. Esperando al rival...';
  updateChoiceButtonsState();

  if (onlineState.isHost) {
    maybeResolveOnlineRound('choice');
    return;
  }

  sendOnlineMessage({
    type: 'choice',
    roundId: onlineState.roundId,
    choice
  });
}

function maybeResolveOnlineRound(reason = 'normal') {
  if (!onlineState.isHost || !onlineState.connected || gameState.currentMode !== 'online') {
    return;
  }

  if (onlineState.localChoice && onlineState.remoteChoice) {
    resolveOnlineRound(reason);
    return;
  }

  if (reason === 'timeout') {
    resolveOnlineRound(reason);
  }
}

function resolveOnlineRound(reason = 'normal') {
  if (!onlineState.isHost || gameState.currentMode !== 'online') {
    return;
  }

  clearOnlineTimers();

  const hostChoice = onlineState.localChoice;
  const guestChoice = onlineState.remoteChoice;
  let winner = 'tie';
  let noContest = false;

  if (!hostChoice && !guestChoice) {
    noContest = true;
  } else if (!hostChoice) {
    winner = 'guest';
  } else if (!guestChoice) {
    winner = 'host';
  } else {
    const localResult = determineWinner(hostChoice, guestChoice);
    winner = localResult === 'tie' ? 'tie' : localResult === 'human' ? 'host' : 'guest';
  }

  const payload = {
    type: 'result',
    roundId: onlineState.roundId,
    hostChoice,
    guestChoice,
    winner,
    reason,
    noContest
  };

  if (onlineState.conn && onlineState.conn.open) {
    sendOnlineMessage(payload);
  }

  applyOnlineResult(payload);
}

function applyOnlineResult(payload) {
  clearOnlineTimers();
  onlineState.phase = 'idle';

  const localChoice = onlineState.isHost ? payload.hostChoice : payload.guestChoice;
  const remoteChoice = onlineState.isHost ? payload.guestChoice : payload.hostChoice;

  if (payload.noContest) {
    resultText.textContent = '⏱️ Nadie eligió a tiempo. Nueva ronda.';
    updateChoiceButtonsState();

    if (onlineState.isHost && onlineState.connected) {
      onlineState.choiceTimer = setTimeout(() => scheduleOnlineRoundStart(), 1800);
    }

    return;
  }

  let result = 'tie';
  if (payload.winner !== 'tie') {
    const localWon = (payload.winner === 'host' && onlineState.isHost) || (payload.winner === 'guest' && !onlineState.isHost);
    result = localWon ? 'human' : 'computer';
  }

  const message = buildOnlineResultMessage(localChoice, remoteChoice, result, payload.reason);
  displayResult(localChoice || remoteChoice || 'rock', remoteChoice || localChoice || 'rock', result, message);
  updateGameState(result);
  addToHistory(localChoice, remoteChoice, result);
  updateStatsDisplay();
  updateHistoryDisplay();
  updateScoreDisplay();
  updateChoiceButtonsState();

  if (onlineState.isHost && onlineState.connected) {
    onlineState.choiceTimer = setTimeout(() => scheduleOnlineRoundStart(), 2200);
  }
}

function buildOnlineResultMessage(localChoice, remoteChoice, result, reason) {
  const localLabel = choiceLabel(localChoice);
  const remoteLabel = choiceLabel(remoteChoice);

  if (!localChoice && !remoteChoice) {
    return '⏱️ Nadie eligió a tiempo. Nueva ronda.';
  }

  if (reason === 'disconnect') {
    if (result === 'human') {
      return '⚠️ El rival salió de la partida. Ganaste por abandono.';
    }

    if (result === 'computer') {
      return '⚠️ Se perdió la conexión. Perdiste por abandono.';
    }
  }

  if (result === 'tie') {
    return `🤝 ¡Empate! Ambos elegisteis ${localLabel}`;
  }

  if (result === 'human') {
    return `✅ ¡Ganaste! ${localLabel} ${RULES[localChoice].name} ${remoteLabel}`;
  }

  return `❌ ¡Perdiste! ${remoteLabel} ${RULES[remoteChoice].name} ${localLabel}`;
}

function handleOnlineDisconnect(message) {
  clearOnlineTimers();
  onlineState.connected = false;
  onlineState.phase = 'idle';
  onlineState.localChoice = null;
  onlineState.remoteChoice = null;
  updateChoiceButtonsState();

  if (onlineState.isHost) {
    setOnlineStatus('El rival salió de la partida. Puedes compartir el enlace otra vez.', 'warning');
    resultText.textContent = `⚠️ ${message}`;
    leaveRoomBtn.hidden = false;
    return;
  }

  setOnlineStatus('Se perdió la conexión con el anfitrión.', 'error');
  resultText.textContent = `⚠️ ${message}`;
}
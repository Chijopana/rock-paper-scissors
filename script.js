let humanScore = 0;
let computerScore = 0;
let timer = null;
let timeLeft = 30;

const resultText = document.getElementById("result-text");
const scoreDisplay = document.getElementById("score");
const timerText = document.getElementById("timer-text");
const modeSelect = document.getElementById("mode");
const bigBangToggle = document.getElementById("bigbang-toggle");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlay-message");
const playAgainBtn = document.getElementById("play-again");

const winSound = document.getElementById("win-sound");
const loseSound = document.getElementById("lose-sound");

const classicChoices = ['rock', 'paper', 'scissors'];
const bigBangChoices = ['rock', 'paper', 'scissors', 'lizard', 'spock'];

const choiceDisplayNames = {
  rock: "🪨 Rock",
  paper: "📄 Paper",
  scissors: "✂️ Scissors",
  lizard: "🦎 Lizard",
  spock: "🖖 Spock"
};

// Actualiza botones según el checkbox bigBangToggle
function updateChoiceButtons() {
  const choicesDiv = document.querySelector(".choices");
  const useBigBang = bigBangToggle.checked;

  let choicesToShow = useBigBang ? bigBangChoices : classicChoices;

  // Limpia botones actuales
  choicesDiv.innerHTML = '';

  // Crea botones para las opciones del modo actual
  choicesToShow.forEach(choice => {
    const btn = document.createElement('button');
    btn.id = choice;
    btn.className = 'choice-btn';
    btn.textContent = choiceDisplayNames[choice];
    btn.addEventListener('click', () => handleHumanChoice(choice));
    choicesDiv.appendChild(btn);
  });
}

function getComputerChoice() {
  const useBigBang = bigBangToggle.checked;
  let choices = useBigBang ? bigBangChoices : classicChoices;
  return choices[Math.floor(Math.random() * choices.length)];
}

function playRound(human, computer) {
  if (human === computer) return 'tie';

  const useBigBang = bigBangToggle.checked;

  if (!useBigBang) {
    // Reglas clásicas
    if (
      (human === 'rock' && computer === 'scissors') ||
      (human === 'paper' && computer === 'rock') ||
      (human === 'scissors' && computer === 'paper')
    ) {
      humanScore++;
      return 'human';
    } else {
      computerScore++;
      return 'computer';
    }
  } else {
    // Reglas Big Bang Theory
    const winsAgainst = {
      rock: ['scissors', 'lizard'],
      paper: ['rock', 'spock'],
      scissors: ['paper', 'lizard'],
      lizard: ['spock', 'paper'],
      spock: ['scissors', 'rock']
    };

    if (winsAgainst[human].includes(computer)) {
      humanScore++;
      return 'human';
    } else {
      computerScore++;
      return 'computer';
    }
  }
}

function displayResult(result, human, computer) {
  if (result === 'tie') {
    resultText.textContent = `🤝 Tie! You both chose ${choiceDisplayNames[human]}`;
  } else if (result === 'human') {
    resultText.textContent = `✅ You win! ${choiceDisplayNames[human]} beats ${choiceDisplayNames[computer]}`;
  } else {
    resultText.textContent = `❌ You lose! ${choiceDisplayNames[computer]} beats ${choiceDisplayNames[human]}`;
  }
  scoreDisplay.textContent = `Your Score: ${humanScore} | Bot Score: ${computerScore}`;
}

function resetGame() {
  humanScore = 0;
  computerScore = 0;
  scoreDisplay.textContent = `Your Score: 0 | Bot Score: 0`;
  resultText.textContent = "Make your move!";
  timerText.textContent = "";
  clearInterval(timer);
}

function checkEndCondition() {
  const mode = modeSelect.value;

  if (mode === 'firstTo5') {
    if (humanScore >= 5 || computerScore >= 5) {
      if (humanScore >= 5) {
        showOverlay("🎉 You reached 5 first! You Win!");
        playWinSound();
      } else {
        showOverlay("💀 Bot wins! Better luck next time.");
        playLoseSound();
      }
      clearInterval(timer);
      return true;
    }
  } else if (mode === 'timed') {
    if (timeLeft <= 0) {
      if (humanScore > computerScore) {
        showOverlay("⏰ Time's up! You Win!");
        playWinSound();
      } else if (humanScore < computerScore) {
        showOverlay("⏰ Time's up! Bot Wins!");
        playLoseSound();
      } else {
        showOverlay("⏰ Time's up! It's a Tie!");
      }
      return true;
    }
  }
  return false;
}

function handleHumanChoice(choice) {
  if (modeSelect.value === 'timed' && timeLeft <= 0) return;

  const bot = getComputerChoice();
  const result = playRound(choice, bot);
  displayResult(result, choice, bot);

  if (!checkEndCondition()) {
    if (modeSelect.value === 'timed') {
      timerText.textContent = `⏱️ Time left: ${timeLeft}s`;
    }
  }
}

function startTimer() {
  timeLeft = 30;
  resetGame();
  timer = setInterval(() => {
    timeLeft--;
    timerText.textContent = `⏱️ Time left: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      checkEndCondition();
    }
  }, 1000);
}

function showOverlay(message) {
  overlayMessage.textContent = message;
  overlay.style.display = 'flex';

  const lower = message.toLowerCase();
  if (
    lower.includes('you win') ||
    lower.includes('reached 5 first') ||
    lower.includes('victory') ||
    lower.includes('🎉')
  ) {
    launchConfetti();
  }
}

function hideOverlay() {
  overlay.style.display = 'none';
  resetGame();
  if (modeSelect.value === 'timed') startTimer();
}

function playWinSound() {
  winSound.currentTime = 0;
  winSound.play();
}

function playLoseSound() {
  loseSound.currentTime = 0;
  loseSound.play();
}

modeSelect.addEventListener("change", () => {
  clearInterval(timer);
  hideOverlay();
  resetGame();
  updateChoiceButtons();
  if (modeSelect.value === 'timed') startTimer();
});

bigBangToggle.addEventListener("change", () => {
  clearInterval(timer);
  hideOverlay();
  resetGame();
  updateChoiceButtons();
  if (modeSelect.value === 'timed') startTimer();
});

// Inicializa botones al cargar la página
updateChoiceButtons();

playAgainBtn.addEventListener("click", hideOverlay);

// Función para lanzar confeti centrado en pantalla
function launchConfetti() {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ff00cc', '#ffde59', '#1f0036'],
    scalar: 1.2,
    ticks: 250
  });
}

// Inicializa botones al cargar la página
updateChoiceButtons();

playAgainBtn.addEventListener("click", hideOverlay);
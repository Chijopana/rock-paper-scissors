// Variables globales para puntajes
let humanScore = 0;
let computerScore = 0;

// Función para obtener la elección de la computadora
function getComputerChoice() {
  const choices = ['rock', 'paper', 'scissors'];
  const randomIndex = Math.floor(Math.random() * 3);
  return choices[randomIndex];
}

// Función para manejar la elección del jugador
function handleHumanChoice(humanChoice) {
  const computerChoice = getComputerChoice();
  const result = playRound(humanChoice, computerChoice);
  displayResult(result, humanChoice, computerChoice);
}

// Función para jugar una ronda
function playRound(humanChoice, computerChoice) {
  if (humanChoice === computerChoice) {
    return 'tie';
  }

  if (
    (humanChoice === 'rock' && computerChoice === 'scissors') ||
    (humanChoice === 'paper' && computerChoice === 'rock') ||
    (humanChoice === 'scissors' && computerChoice === 'paper')
  ) {
    humanScore++;
    return 'human';
  } else {
    computerScore++;
    return 'computer';
  }
}

// Función para actualizar y mostrar el resultado de la ronda
function displayResult(result, humanChoice, computerChoice) {
  const resultText = document.getElementById('result-text');
  const score = document.getElementById('score');

  if (result === 'tie') {
    resultText.textContent = `It's a tie! Both chose ${humanChoice}.`;
  } else if (result === 'human') {
    resultText.textContent = `You win! ${humanChoice.charAt(0).toUpperCase() + humanChoice.slice(1)} beats ${computerChoice}.`;
  } else {
    resultText.textContent = `You lose! ${computerChoice.charAt(0).toUpperCase() + computerChoice.slice(1)} beats ${humanChoice}.`;
  }

  score.textContent = `Your Score: ${humanScore} | Computer Score: ${computerScore}`;
}

// Event listeners para las elecciones del jugador
document.getElementById('rock').addEventListener('click', () => handleHumanChoice('rock'));
document.getElementById('paper').addEventListener('click', () => handleHumanChoice('paper'));
document.getElementById('scissors').addEventListener('click', () => handleHumanChoice('scissors'));

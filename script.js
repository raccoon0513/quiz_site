// main.js
import { fetchQuestions } from './src/api.js';
import { shuffleArray } from './src/utils.js';

let allQuestions = [];
let targetQuestions = [];
let wrongQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let showImmediateFeedback = false;

const screens = document.querySelectorAll('.screen');

// 로그인 관련 DOM
const loginScreen = document.getElementById('login-screen');
const secretKeyInput = document.getElementById('secret-key-input');
const loginBtn = document.getElementById('login-btn');

// 기존 DOM
const unitSelection = document.getElementById('unit-selection');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const immediateFeedbackCb = document.getElementById('immediate-feedback-cb');
const progressText = document.getElementById('progress-text');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const scoreText = document.getElementById('score-text');
const wrongAnswersContainer = document.getElementById('wrong-answers-container');
const feedbackArea = document.getElementById('feedback-area');
const feedbackContent = document.getElementById('feedback-content');
const nextBtn = document.getElementById('next-btn');

function switchScreen(screenId) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// 🔑 키 입력 및 접속 처리
loginBtn.addEventListener('click', async () => {
  const key = secretKeyInput.value.trim();
  
  if (!key) {
    alert("키를 입력해주세요.");
    return;
  }

  // api.js에 키를 전달하여 복호화 시도
  const data = await fetchQuestions(key);

  if (data) {
    // 성공 시 데이터 세팅 및 다음 화면으로 이동
    allQuestions = data;
    const units = [...new Set(allQuestions.map(q => q.unit))];
    
    unitSelection.innerHTML = '';
    units.forEach(unit => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '8px 0';
      label.innerHTML = `<input type="checkbox" value="${unit}" checked> ${unit}`;
      unitSelection.appendChild(label);
    });

    switchScreen('start-screen');
  } else {
    alert("올바르지 않은 키이거나 데이터를 불러올 수 없습니다.");
  }
});

// 엔터 키로도 접속 가능하게 편의성 추가
secretKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

/* =======================================
   이하 퀴즈 진행 로직은 기존과 동일합니다.
======================================= */

startBtn.addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('#unit-selection input:checked');
  const selectedUnits = Array.from(checkboxes).map(cb => cb.value);

  if (selectedUnits.length === 0) {
    alert("최소 하나의 단원을 선택해주세요.");
    return;
  }

  showImmediateFeedback = immediateFeedbackCb.checked;
  const filteredQuestions = allQuestions.filter(q => selectedUnits.includes(q.unit));
  targetQuestions = shuffleArray(filteredQuestions);

  currentIndex = 0;
  correctCount = 0;
  wrongQuestions = [];

  switchScreen('quiz-screen');
  loadQuestion();
});

function loadQuestion() {
  feedbackArea.style.display = 'none';
  const currentQ = targetQuestions[currentIndex];
  
  progressText.textContent = `${currentIndex + 1} / ${targetQuestions.length}`;
  questionText.textContent = currentQ.question;
  optionsContainer.innerHTML = '';
  
  currentQ.options.forEach((optionText, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = optionText;
    btn.onclick = () => selectAnswer(index);
    optionsContainer.appendChild(btn);
  });
}

function selectAnswer(selectedIndex) {
  const optionBtns = document.querySelectorAll('.option-btn');
  optionBtns.forEach(btn => btn.disabled = true);

  const currentQ = targetQuestions[currentIndex];
  const isCorrect = (selectedIndex === currentQ.answer);

  if (isCorrect) {
    correctCount++;
    proceedToNext();
  } else {
    const wrongInfo = {
      question: currentQ.question,
      userAnswer: currentQ.options[selectedIndex],
      correctAnswer: currentQ.options[currentQ.answer],
      explanation: currentQ.explanation
    };
    wrongQuestions.push(wrongInfo);

    if (showImmediateFeedback) {
      feedbackContent.innerHTML = `
        <h4>❌ 오답입니다!</h4>
        <p><strong>내가 고른 답:</strong> ${wrongInfo.userAnswer}</p>
        <p><strong>정답:</strong> ${wrongInfo.correctAnswer}</p>
        <p class="explanation">💡 <strong>해설:</strong> ${wrongInfo.explanation}</p>
      `;
      feedbackArea.style.display = 'block';
    } else {
      proceedToNext();
    }
  }
}

nextBtn.addEventListener('click', proceedToNext);

function proceedToNext() {
  currentIndex++;
  if (currentIndex < targetQuestions.length) {
    loadQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  switchScreen('result-screen');
  scoreText.textContent = `총 ${targetQuestions.length}문제 중 ${correctCount}문제를 맞췄습니다!`;
  wrongAnswersContainer.innerHTML = '';

  if (wrongQuestions.length === 0) {
    wrongAnswersContainer.innerHTML = '<p>모든 문제를 맞췄습니다! 🎉</p>';
  } else {
    wrongQuestions.forEach(wrong => {
      const item = document.createElement('div');
      item.className = 'wrong-item';
      item.innerHTML = `
        <h4>❌ 오답: ${wrong.question}</h4>
        <p><strong>내가 고른 답:</strong> ${wrong.userAnswer}</p>
        <p><strong>정답:</strong> ${wrong.correctAnswer}</p>
        <p class="explanation">💡 <strong>풀이:</strong> ${wrong.explanation}</p>
      `;
      wrongAnswersContainer.appendChild(item);
    });
  }
}

restartBtn.addEventListener('click', () => switchScreen('start-screen'));
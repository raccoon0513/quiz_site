// main.js
import { fetchQuestions } from './api.js';
import { shuffleArray } from './utils.js';

// 상태 관리 변수
let allQuestions = [];
let targetQuestions = [];
let wrongQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let showImmediateFeedback = false;

// DOM 요소 선택
const screens = document.querySelectorAll('.screen');
const unitSelection = document.getElementById('unit-selection');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const immediateFeedbackCb = document.getElementById('immediate-feedback-cb');

const progressText = document.getElementById('progress-text');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const scoreText = document.getElementById('score-text');
const wrongAnswersContainer = document.getElementById('wrong-answers-container');

// 피드백 관련 DOM 요소
const feedbackArea = document.getElementById('feedback-area');
const feedbackContent = document.getElementById('feedback-content');
const nextBtn = document.getElementById('next-btn');

// 앱 초기화
async function init() {
  allQuestions = await fetchQuestions();
  const units = [...new Set(allQuestions.map(q => q.unit))];
  
  unitSelection.innerHTML = '';
  units.forEach(unit => {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.margin = '8px 0';
    label.innerHTML = `<input type="checkbox" value="${unit}" checked> ${unit}`;
    unitSelection.appendChild(label);
  });
}

function switchScreen(screenId) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// 퀴즈 시작
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

// 문제 불러오기
function loadQuestion() {
  feedbackArea.style.display = 'none'; // 피드백 영역 숨기기
  const currentQ = targetQuestions[currentIndex];
  
  progressText.textContent = `${currentIndex + 1} / ${targetQuestions.length}`;
  questionText.textContent = currentQ.question;
  optionsContainer.innerHTML = '';
  
  currentQ.options.forEach((optionText, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = optionText;
    // 클릭 이벤트 연결
    btn.onclick = () => selectAnswer(index);
    optionsContainer.appendChild(btn);
  });
}

// 정답 선택
function selectAnswer(selectedIndex) {
  // 중복 클릭 방지를 위해 모든 선택지 버튼 비활성화
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
      // 페이지 내부에 오답 피드백 표시
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

// 다음 문제 버튼 클릭 시 (오답 피드백 창에서 사용)
nextBtn.addEventListener('click', proceedToNext);

// 다음 문제 또는 결과 화면으로 이동
function proceedToNext() {
  currentIndex++;
  if (currentIndex < targetQuestions.length) {
    loadQuestion();
  } else {
    showResults();
  }
}

// 결과 화면 출력
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

// 실행
init();
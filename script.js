// script.js
import { fetchQuestions } from './src/api.js';
import { shuffleArray } from './src/utils.js';

let allQuestions = [];
let targetQuestions = [];
let wrongQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let showImmediateFeedback = false;

const screens = document.querySelectorAll('.screen');
const loginBtn = document.getElementById('login-btn');
const secretKeyInput = document.getElementById('secret-key-input');
const unitSelection = document.getElementById('unit-selection');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const quitBtn = document.getElementById('quit-btn');

const byBookCb = document.getElementById('by-book-cb');
const shuffleChapterCb = document.getElementById('shuffle-chapter-cb');
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

// 옵션 자동 저장 및 복원 (LocalStorage)
function savePrefs() {
  const prefs = { books: {}, units: {}, options: {} };
  document.querySelectorAll('.book-cb').forEach(cb => prefs.books[cb.value] = cb.checked);
  document.querySelectorAll('.unit-cb').forEach(cb => prefs.units[`${cb.dataset.book}::${cb.value}`] = cb.checked);
  prefs.options = {
    byBook: byBookCb.checked,
    shuffleChapter: shuffleChapterCb.checked,
    immediateFeedback: immediateFeedbackCb.checked
  };
  localStorage.setItem('quiz_prefs', JSON.stringify(prefs));
}

function restoreOptions() {
  const prefs = JSON.parse(localStorage.getItem('quiz_prefs')) || {};
  if (prefs.options) {
    byBookCb.checked = !!prefs.options.byBook;
    shuffleChapterCb.checked = !!prefs.options.shuffleChapter;
    immediateFeedbackCb.checked = !!prefs.options.immediateFeedback;
  }
}

[byBookCb, shuffleChapterCb, immediateFeedbackCb].forEach(cb => cb.addEventListener('change', savePrefs));

// 계층형 단원 UI 렌더링
function renderUnitSelection() {
  unitSelection.innerHTML = '';
  const prefs = JSON.parse(localStorage.getItem('quiz_prefs')) || { books: {}, units: {} };
  const books = {};
  
  allQuestions.forEach(q => {
    if (!books[q.book]) books[q.book] = new Set();
    books[q.book].add(q.unit);
  });

  for (const [bookName, units] of Object.entries(books)) {
    const bookDiv = document.createElement('div');
    bookDiv.style.marginBottom = '15px';
    bookDiv.style.padding = '10px';
    bookDiv.style.border = '1px solid #ddd';
    bookDiv.style.borderRadius = '8px';
    bookDiv.style.backgroundColor = '#fafafa';
    
    const bookLabel = document.createElement('label');
    bookLabel.style.fontWeight = 'bold';
    bookLabel.style.display = 'block';
    bookLabel.style.marginBottom = '8px';
    const bookCb = document.createElement('input');
    bookCb.type = 'checkbox';
    bookCb.className = 'book-cb';
    bookCb.value = bookName;
    bookCb.checked = prefs.books && prefs.books[bookName] !== undefined ? prefs.books[bookName] : true;
    
    bookLabel.appendChild(bookCb);
    bookLabel.append(` 📚 ${bookName} (전체 선택)`);
    bookDiv.appendChild(bookLabel);
    
    const unitContainer = document.createElement('div');
    unitContainer.style.marginLeft = '20px';
    const unitCbs = [];
    
    Array.from(units).forEach(unit => {
      const uLabel = document.createElement('label');
      uLabel.style.display = 'block';
      uLabel.style.margin = '5px 0';
      const uCb = document.createElement('input');
      uCb.type = 'checkbox';
      uCb.className = 'unit-cb';
      uCb.dataset.book = bookName;
      uCb.value = unit;
      const prefKey = `${bookName}::${unit}`;
      uCb.checked = prefs.units && prefs.units[prefKey] !== undefined ? prefs.units[prefKey] : true;
      
      uCb.addEventListener('change', () => {
        const allChecked = unitCbs.every(cb => cb.checked);
        const noneChecked = unitCbs.every(cb => !cb.checked);
        bookCb.checked = allChecked;
        bookCb.indeterminate = !allChecked && !noneChecked;
        savePrefs();
      });
      unitCbs.push(uCb);
      uLabel.appendChild(uCb);
      uLabel.append(` ${unit}`);
      unitContainer.appendChild(uLabel);
    });
    
    bookCb.addEventListener('change', (e) => {
      unitCbs.forEach(cb => cb.checked = e.target.checked);
      savePrefs();
    });
    
    const allChecked = unitCbs.every(cb => cb.checked);
    const noneChecked = unitCbs.every(cb => !cb.checked);
    bookCb.checked = allChecked;
    bookCb.indeterminate = !allChecked && !noneChecked;
    
    bookDiv.appendChild(unitContainer);
    unitSelection.appendChild(bookDiv);
  }
}

loginBtn.addEventListener('click', async () => {
  const key = secretKeyInput.value.trim();
  if (!key) { alert("키를 입력해주세요."); return; }

  const data = await fetchQuestions(key);
  if (data) {
    allQuestions = data;
    restoreOptions();
    renderUnitSelection();
    switchScreen('start-screen');
  } else {
    alert("올바르지 않은 키이거나 데이터를 불러올 수 없습니다.");
  }
});

secretKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

// 출제 배열 큐 빌더
function groupBy(array, keyFn) {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function buildQuestionQueue(filtered, byBook, shuffleChapter) {
  let queue = [];
  if (byBook && shuffleChapter) {
    const books = groupBy(filtered, q => q.book);
    shuffleArray(Object.keys(books)).forEach(bk => {
      const chapters = groupBy(books[bk], q => q.unit);
      shuffleArray(Object.keys(chapters)).forEach(ch => queue = queue.concat(shuffleArray(chapters[ch])));
    });
  } else if (byBook && !shuffleChapter) {
    const books = groupBy(filtered, q => q.book);
    shuffleArray(Object.keys(books)).forEach(bk => queue = queue.concat(shuffleArray(books[bk])));
  } else if (!byBook && shuffleChapter) {
    const chapters = groupBy(filtered, q => `${q.book}::${q.unit}`);
    shuffleArray(Object.keys(chapters)).forEach(ch => queue = queue.concat(shuffleArray(chapters[ch])));
  } else {
    queue = shuffleArray([...filtered]);
  }
  return queue;
}

startBtn.addEventListener('click', () => {
  const selectedUnitKeys = Array.from(document.querySelectorAll('.unit-cb:checked'))
                                .map(cb => `${cb.dataset.book}::${cb.value}`);
  if (selectedUnitKeys.length === 0) { alert("최소 하나의 단원을 선택해주세요."); return; }

  showImmediateFeedback = immediateFeedbackCb.checked;
  const filteredQuestions = allQuestions.filter(q => selectedUnitKeys.includes(`${q.book}::${q.unit}`));
  targetQuestions = buildQuestionQueue(filteredQuestions, byBookCb.checked, shuffleChapterCb.checked);

  currentIndex = 0;
  correctCount = 0;
  wrongQuestions = [];

  switchScreen('quiz-screen');
  loadQuestion();
});

function loadQuestion() {
  feedbackArea.style.display = 'none';
  const currentQ = targetQuestions[currentIndex];
  progressText.textContent = `${currentIndex + 1} / ${targetQuestions.length} (${currentQ.book} - ${currentQ.unit})`;
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

  if (isCorrect) correctCount++;
  else {
    wrongQuestions.push({
      question: currentQ.question,
      userAnswer: currentQ.options[selectedIndex],
      correctAnswer: currentQ.options[currentQ.answer],
      explanation: currentQ.explanation
    });
  }

  // 정답 및 오답에 따른 피드백 출력
  if (showImmediateFeedback) {
    if (isCorrect) {
      feedbackArea.style.backgroundColor = '#d4edda';
      feedbackArea.style.borderLeftColor = '#28a745';
      feedbackContent.innerHTML = `
        <h4 style="color: #28a745;">✅ 정답입니다!</h4>
        <p><strong>정답:</strong> ${currentQ.options[currentQ.answer]}</p>
        <p class="explanation" style="color: #444;">💡 <strong>해설:</strong> ${currentQ.explanation}</p>
      `;
    } else {
      feedbackArea.style.backgroundColor = '#fff3f3';
      feedbackArea.style.borderLeftColor = '#dc3545';
      feedbackContent.innerHTML = `
        <h4 style="color: #dc3545;">❌ 오답입니다!</h4>
        <p><strong>내가 고른 답:</strong> ${currentQ.options[selectedIndex]}</p>
        <p><strong>정답:</strong> ${currentQ.options[currentQ.answer]}</p>
        <p class="explanation" style="color: #444;">💡 <strong>해설:</strong> ${currentQ.explanation}</p>
      `;
    }
    feedbackArea.style.display = 'block';
  } else {
    proceedToNext();
  }
}

nextBtn.addEventListener('click', proceedToNext);

function proceedToNext() {
  currentIndex++;
  if (currentIndex < targetQuestions.length) loadQuestion();
  else showResults();
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
        <h4 style="color: #dc3545;">❌ 오답: ${wrong.question}</h4>
        <p><strong>내가 고른 답:</strong> ${wrong.userAnswer}</p>
        <p><strong>정답:</strong> ${wrong.correctAnswer}</p>
        <p class="explanation">💡 <strong>풀이:</strong> ${wrong.explanation}</p>
      `;
      wrongAnswersContainer.appendChild(item);
    });
  }
}



// 🛑 도중에 그만두기 버튼 이벤트
quitBtn.addEventListener('click', () => {
  if (confirm("정말 퀴즈를 그만두시겠습니까? 지금까지 푼 문제에 대한 결과만 표시됩니다.")) {
    // 전체 문제 배열을 현재까지 푼 문제 수만큼만 자르기 (결과창 통계 정확도를 위해)
    targetQuestions = targetQuestions.slice(0, currentIndex);
    showResults();
  }
});

// ⌨️ 스페이스바 입력 이벤트 (정답/해설 창이 떠 있을 때만 작동)
document.addEventListener('keydown', (e) => {
  // 스페이스바가 눌렸고, 피드백 영역이 화면에 보이고 있는 상태라면
  if (e.code === 'Space' && feedbackArea.style.display === 'block') {
    e.preventDefault(); // 스페이스바 기본 동작(페이지 스크롤 다운) 방지
    proceedToNext();
  }
});

restartBtn.addEventListener('click', () => switchScreen('start-screen'));
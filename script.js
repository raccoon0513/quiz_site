// script.js
import { fetchQuestions } from './src/api.js';
import { shuffleArray } from './src/utils.js';

let retryQuestions = [];
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

const questionNo = document.getElementById('question-no');
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
const infiniteReviewCb = document.getElementById('infinite-review-cb');

console.log("upload");

function switchScreen(screenId) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// 옵션 자동 저장 및 복원 (LocalStorage)
// 옵션 자동 저장
function savePrefs() {
  const prefs = { books: {}, units: {}, options: {} };
  document.querySelectorAll('.book-cb').forEach(cb => prefs.books[cb.value] = cb.checked);
  document.querySelectorAll('.unit-cb').forEach(cb => prefs.units[`${cb.dataset.book}::${cb.value}`] = cb.checked);
  prefs.options = {
    byBook: byBookCb.checked,
    shuffleChapter: shuffleChapterCb.checked,
    immediateFeedback: immediateFeedbackCb.checked,
    infiniteReview: infiniteReviewCb.checked // 🔥 추가
  };
  localStorage.setItem('quiz_prefs', JSON.stringify(prefs));
}

// 옵션 복원
function restoreOptions() {
  const prefs = JSON.parse(localStorage.getItem('quiz_prefs')) || {};
  if (prefs.options) {
    byBookCb.checked = !!prefs.options.byBook;
    shuffleChapterCb.checked = !!prefs.options.shuffleChapter;
    immediateFeedbackCb.checked = !!prefs.options.immediateFeedback;
    infiniteReviewCb.checked = !!prefs.options.infiniteReview; // 🔥 추가
  }
}

// 이벤트 리스너 배열에 추가
[byBookCb, shuffleChapterCb, immediateFeedbackCb, infiniteReviewCb].forEach(cb => cb.addEventListener('change', savePrefs));
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
    
    try {
      const bgResponse = await fetch('./src/bg_base64.txt');
      if (bgResponse.ok) {
        const bgBase64Text = await bgResponse.text();
        
        
        document.body.style.backgroundImage = `url(data:image/jpeg;base64,${bgBase64Text.trim()})`;
        // 배경이미지 css 적용
        document.body.style.backgroundSize = '30%';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundPosition = 'right center';
        document.body.style.backgroundAttachment = 'fixed';
      } else {
        console.warn("배경 이미지 파일을 찾을 수 없습니다.");
      }
    } catch (err) {
      console.warn("배경 이미지를 불러오는 중 에러가 발생했습니다.", err);
    }
  

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
  retryQuestions = []; // 🔥 시작할 때 복습 배열 초기화

  switchScreen('quiz-screen');
  loadQuestion();
});

// 문제 불러오기 (주관식/객관식 분기 처리)
function loadQuestion() {
  feedbackArea.style.display = 'none';
  const currentQ = targetQuestions[currentIndex];
  
  // 1. 문제 번호 표시 (JSON에 no가 없으면 현재 순서 인덱스로 표시)
  questionNo.textContent = currentQ.no ? `Q${currentQ.no}.` : `Q${0}.`;
  
  // 2. 진행도 표시
  progressText.textContent = `${currentIndex + 1} / ${targetQuestions.length} (${currentQ.book || ''} - ${currentQ.unit})`;
  
  // 3. 문제 텍스트 표시
  questionText.textContent = currentQ.question;
  
  optionsContainer.innerHTML = '';
  
  if (currentQ.quiz_type === 'sub') {
    // 주관식 UI 렌더링
    const inputField = document.createElement('textarea');
    inputField.id = 'sub-input';
    inputField.rows = 4;
    inputField.style.width = '100%';
    inputField.style.padding = '10px';
    inputField.style.marginBottom = '10px';
    inputField.style.borderRadius = '8px';
    inputField.style.border = '1px solid #ccc';
    inputField.style.fontFamily = 'inherit';
    inputField.placeholder = '정답을 입력하세요... (엔터 키로 제출 가능)';
    
    // Shift+Enter는 줄바꿈, 그냥 Enter는 제출
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation(); // 🔥 반드시 추가! 이벤트 중복 실행 방지
        submitSubAnswer();
      }
    });

    const submitBtn = document.createElement('button');
    submitBtn.id = 'sub-submit-btn';
    submitBtn.textContent = '정답 제출';
    submitBtn.onclick = () => submitSubAnswer();
    
    optionsContainer.appendChild(inputField);
    optionsContainer.appendChild(submitBtn);
    
    // 모바일이 아닌 환경을 위해 포커스 자동 지정
    setTimeout(() => inputField.focus(), 50);

  } else {
    // 객관식 UI 렌더링
    currentQ.options.forEach((optionText, index) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = optionText;
      btn.onclick = () => selectAnswer(index);
      optionsContainer.appendChild(btn);
    });
  }
  if (window.MathJax) {
    MathJax.typesetPromise([questionText, optionsContainer]).catch((err) => console.log('MathJax error: ', err));
  }
}

// 주관식 정답 제출 및 검사
// 주관식 정답 제출 및 검사
function submitSubAnswer() {
  const currentQ = targetQuestions[currentIndex];
  const inputField = document.getElementById('sub-input');
  const userInput = inputField.value.trim();
  
  // if (!userInput) {
  //   alert("정답을 입력해주세요.");
  //   return;
  // }

  // 중복 클릭 및 수정 방지
  inputField.disabled = true;
  const submitBtn = document.getElementById('sub-submit-btn');
  if (submitBtn) submitBtn.disabled = true;

  // 🔥 [복구된 로직] 띄어쓰기 및 배열 형태 키워드 모두 지원
  let keywords = [];
  if (typeof currentQ.keywords === 'string') {
    keywords = currentQ.keywords.split(/[,\s]+/).map(k => k.trim()).filter(k => k.length > 0);
  } else if (Array.isArray(currentQ.keywords)) {
    keywords = currentQ.keywords.map(k => String(k).trim()).filter(k => k.length > 0);
  }
  
  let matchCount = 0;
  keywords.forEach(kw => {
    if (userInput.includes(kw)) {
      matchCount++;
    }
  });

  // 70% 이상 일치하는지 확인
  const matchRatio = keywords.length > 0 ? matchCount / keywords.length : 0;
  const isCorrect = keywords.length === 0 ? true : (matchRatio >= 0.7);

  // 화면에 표시할 원래 정답 문자열
  const correctAnswerString = currentQ.answer !== undefined ? String(currentQ.answer) : keywords.join(' ');

  handleAnswerResult(isCorrect, userInput, correctAnswerString);
}

// 객관식 정답 선택
// 객관식 정답 선택
function selectAnswer(selectedIndex) {
  const optionBtns = document.querySelectorAll('.option-btn');
  optionBtns.forEach(btn => btn.disabled = true);

  const currentQ = targetQuestions[currentIndex];
  const isCorrect = (selectedIndex === currentQ.answer);
  
  // 🔥 추가: 엔터 키로 패스(-1)했을 때의 텍스트 처리
  const userAnswerString = selectedIndex === -1 ? "선택 안 함 (패스)" : currentQ.options[selectedIndex];
  const correctAnswerString = currentQ.options[currentQ.answer];

  handleAnswerResult(isCorrect, userAnswerString, correctAnswerString);
}

// 정답/오답 공통 처리 로직
function handleAnswerResult(isCorrect, userAnswerString, correctAnswerString) {
  const currentQ = targetQuestions[currentIndex]; // ✅ 중복 선언 제거됨

  if (isCorrect) {
    correctCount++;
  } else {
    wrongQuestions.push({
      question: currentQ.question,
      userAnswer: userAnswerString,
      correctAnswer: correctAnswerString,
      explanation: currentQ.explanation
    });
    // 🔥 무한 반복을 위해 틀린 문제의 원본 데이터를 다시 담아둠
    retryQuestions.push(currentQ);
  }

  if (showImmediateFeedback) {
    if (isCorrect) {
      feedbackArea.style.backgroundColor = '#d4edda';
      feedbackArea.style.borderLeftColor = '#28a745';
      feedbackContent.innerHTML = `
        <h4 style="color: #28a745;">✅ 정답입니다!</h4>
        <p><strong>정답:</strong> ${correctAnswerString}</p>
        <p class="explanation" style="color: #444;">💡 <strong>해설:</strong> ${currentQ.explanation}</p>
      `;
    } else {
      feedbackArea.style.backgroundColor = '#fff3f3';
      feedbackArea.style.borderLeftColor = '#dc3545';
      feedbackContent.innerHTML = `
        <h4 style="color: #dc3545;">❌ 오답입니다!</h4>
        <p><strong>내가 입력/고른 답:</strong> ${userAnswerString}</p>
        <p><strong>정답:</strong> ${correctAnswerString}</p>
        <p class="explanation" style="color: #444;">💡 <strong>해설:</strong> ${currentQ.explanation}</p>
      `;
    }
    feedbackArea.style.display = 'block';
  } else {
    proceedToNext();
  }

  // 🧮 피드백 창에 나타난 해설(explanation)의 수식 변환 (MathJax)
  if (window.MathJax && feedbackArea.style.display === 'block') {
    MathJax.typesetPromise([feedbackContent]).catch((err) => console.log('MathJax error: ', err));
  }
}

nextBtn.addEventListener('click', proceedToNext);

function proceedToNext() {
  currentIndex++;
  
  // 아직 현재 회차의 문제가 남았을 때
  if (currentIndex < targetQuestions.length) {
    loadQuestion();
  } 
  // 현재 회차의 문제를 다 풀었을 때
  else {
    // 🔥 무한 반복 옵션이 켜져 있고, 틀린 문제가 1개라도 남아있다면
    if (infiniteReviewCb.checked && retryQuestions.length > 0) {
      alert(`틀린 문제 ${retryQuestions.length}개를 다시 복습합니다!`);
      
      // 틀린 문제들을 섞어서 새로운 타겟으로 지정
      targetQuestions = shuffleArray([...retryQuestions]);
      currentIndex = 0;
      retryQuestions = []; // 다음 회차를 위해 배열 비우기
      
      loadQuestion();
    } else {
      showResults(); // 완전히 다 맞추거나 무한 반복 모드가 아닐 때 결과창 출력
    }
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
        <h4 style="color: #dc3545;">❌ 오답: ${wrong.question}</h4>
        <p><strong>내가 입력/고른 답:</strong> ${wrong.userAnswer}</p>
        <p><strong>정답:</strong> ${wrong.correctAnswer}</p>
        <p class="explanation">💡 <strong>풀이:</strong> ${wrong.explanation}</p>
      `;
      wrongAnswersContainer.appendChild(item);
    });
  }

  // 🧮 결과창 오답 노트에 있는 수식들 한꺼번에 변환 (MathJax)
  if (window.MathJax) {
    MathJax.typesetPromise([wrongAnswersContainer]).catch((err) => console.log('MathJax error: ', err));
  }
}

// 🛑 도중에 그만두기 버튼 이벤트
quitBtn.addEventListener('click', () => {
  if (confirm("정말 퀴즈를 그만두시겠습니까? 지금까지 푼 문제에 대한 결과만 표시됩니다.")) {
    targetQuestions = targetQuestions.slice(0, currentIndex);
    showResults();
  }
});

// ⌨️ 키보드 입력 이벤트
document.addEventListener('keydown', (e) => {
  // 1. 엔터 키로 다음 문제 진행 (피드백 창이 떠 있을 때만 작동)
  if (e.key === 'Enter' && feedbackArea.style.display === 'block') {
    e.preventDefault(); 
    proceedToNext();
    return;
  }

  // 2. 숫자키 1~10번 객관식 정답 선택 및 엔터키 패스
  const quizScreen = document.getElementById('quiz-screen');
  // 퀴즈 화면이 활성화되어 있고, 아직 정답을 고르지 않은 상태일 때만 작동
  if (quizScreen.classList.contains('active') && feedbackArea.style.display !== 'block') {
    const currentQ = targetQuestions[currentIndex];

    // 객관식 문제일 경우에만 작동
    if (currentQ && currentQ.quiz_type !== 'sub' && currentQ.options) {
      
      // 🔥 추가: 객관식 화면에서 엔터를 누르면 빈 답(-1)으로 제출하고 패스
      if (e.key === 'Enter') {
        e.preventDefault();
        selectAnswer(-1);
        return;
      }

      const match = e.code.match(/^Digit(\d)$/); // 'Digit1' ~ 'Digit0' 감지
      if (match) {
        const digit = parseInt(match[1], 10);
        // 숫자 1은 인덱스 0, 숫자 0은 인덱스 9(10번째 보기)로 매핑
        const selectedIndex = digit === 0 ? 9 : digit - 1;

        // 선택한 번호가 실제 보기 개수 안에 존재할 때만 정답 처리
        if (selectedIndex >= 0 && selectedIndex < currentQ.options.length) {
          e.preventDefault();
          selectAnswer(selectedIndex);
        }
      }
    }
  }
});

restartBtn.addEventListener('click', () => switchScreen('start-screen'));
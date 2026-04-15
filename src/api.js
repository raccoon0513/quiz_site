// api.js
export async function fetchQuestions() {
  try {
    const response = await fetch('../quiz/data.json');
    return await response.json();
  } catch (error) {
    console.error("데이터를 불러오는 데 실패했습니다:", error);
    return [];
  }
}
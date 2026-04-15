// src/api.js

// 1. 무작위 문자열을 생성하는 유틸리티 함수
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 2. data.json과 똑같은 구조의 가짜 데이터를 만드는 함수
function generateDummyData() {
  const dummyData = [];
  // 3~5개 정도의 가짜 문제를 무작위로 생성
  const numQuestions = Math.floor(Math.random() * 3) + 3; 
  
  for (let i = 0; i < numQuestions; i++) {
    dummyData.push({
      unit: `단원 ${generateRandomString(2)}`,
      question: `${generateRandomString(15)}가(이) ${generateRandomString(5)} 하는 것은?`,
      options: [
        generateRandomString(8),
        generateRandomString(8),
        generateRandomString(8),
        generateRandomString(8)
      ],
      answer: Math.floor(Math.random() * 4), // 0~3 사이 랜덤 정답
      explanation: `이것은 ${generateRandomString(10)} 법칙에 의해 ${generateRandomString(5)} 됩니다.`
    });
  }
  return dummyData;
}

export async function fetchQuestions(secretKey) {
  try {
    const response = await fetch('./quizs/encoded_data.txt');
    
    if (!response.ok) {
      throw new Error("암호화된 데이터 파일을 찾을 수 없습니다.");
    }
    
    const encodedText = await response.text();

    const binaryString = atob(encodedText);
    
    const decodedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      decodedBytes[i] = binaryString.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
    }

    const decoder = new TextDecoder('utf-8');
    const decodedText = decoder.decode(decodedBytes);

    // 정상적인 키라면 여기서 파싱 성공 후 리턴됩니다.
    return JSON.parse(decodedText);

  } catch (error) {
    // 🔥 키가 틀려서 파싱에 실패하면 에러를 뱉지 않고 가짜 데이터를 넘겨줍니다.
    console.warn("경고: 올바르지 않은 키가 감지되었습니다. 위장 데이터를 출력합니다.");
    return generateDummyData();
  }
}
// src/api.js

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateDummyData() {
  const dummyData = [];
  const numQuestions = Math.floor(Math.random() * 3) + 3; 
  
  for (let i = 0; i < numQuestions; i++) {
    dummyData.push({
      book: `book ${generateRandomString(3)}`,
      unit: `단원 ${generateRandomString(2)}`,
      question: `${generateRandomString(15)}가(이) ${generateRandomString(5)} 하는 것은?`,
      options: [
        generateRandomString(8), generateRandomString(8), generateRandomString(8), generateRandomString(8)
      ],
      answer: Math.floor(Math.random() * 4), 
      explanation: `이것은 ${generateRandomString(10)} 법칙에 의해 ${generateRandomString(5)} 됩니다.`
    });
  }
  return dummyData;
}

export async function fetchQuestions(secretKey) {
  try {
    const response = await fetch('./quizs/encoded_data.txt');
    if (!response.ok) throw new Error("암호화된 데이터 파일을 찾을 수 없습니다.");
    
    const encodedText = await response.text();
    const lines = encodedText.split('\n').filter(line => line.trim() !== '');
    let allQuestions = [];

    for (const line of lines) {
      const binaryString = atob(line);
      const decodedBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        decodedBytes[i] = binaryString.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
      }
      const decoder = new TextDecoder('utf-8');
      const decodedText = decoder.decode(decodedBytes);
      const bookData = JSON.parse(decodedText);
      allQuestions = allQuestions.concat(bookData);
    }
    return allQuestions;

  } catch (error) {
    console.warn("경고: 올바르지 않은 키가 감지되었습니다.");
    return generateDummyData();
  }
}
// src/api.js

export async function fetchQuestions(secretKey) {
  try {
    // 이제 original 대신 암호화된 파일을 불러옵니다.
    const response = await fetch('./quizs/encoded_data.txt');
    
    if (!response.ok) {
      throw new Error("암호화된 데이터 파일을 찾을 수 없습니다.");
    }
    
    const encodedText = await response.text();

    // 1. Base64 디코딩
    const binaryString = atob(encodedText);
    
    // 2. XOR 복호화 연산
    const decodedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      decodedBytes[i] = binaryString.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length);
    }

    // 3. 바이트 배열을 다시 한글(UTF-8) 문자열로 변환
    const decoder = new TextDecoder('utf-8');
    const decodedText = decoder.decode(decodedBytes);

    // 4. 문자열을 JSON 객체로 파싱
    return JSON.parse(decodedText);

  } catch (error) {
    console.error("데이터 복호화 실패 (키가 틀렸거나 파일이 손상됨):", error);
    return null; // 실패 시 null 반환
  }
}
// ご自身の環境で使用する場合は、以下の2つのカギを取得して設定してください
const LINE_ACCESS_TOKEN = 'YOUR_LINE_ACCESS_TOKEN_HERE';
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

function doPost(e) {
  const json = JSON.parse(e.postData.contents);
  const event = json.events[0];
  const replyToken = event.replyToken;
  
  try {
    if (event.type === 'message') {
      // 1. テキストが送られてきた場合
      if (event.message.type === 'text') {
        const userMessage = event.message.text;
        const translatedText = translateWithGemini(userMessage, null);
        replyToLine(replyToken, translatedText);
      } 
      // 2. 画像が送られてきた場合
      else if (event.message.type === 'image') {
        const messageId = event.message.id;
        const imageBase64 = getLineImage(messageId); // LINEから画像を取得
        const translatedText = translateWithGemini("この画像内のテキストを読み取り、自然な日本語に翻訳してください。", imageBase64);
        replyToLine(replyToken, translatedText);
      }
    }
  } catch (error) {
    replyToLine(replyToken, "エラーが発生しました: " + error.message);
  }
  
  return ContentService.createTextOutput("OK");
}

// LINEのサーバーから画像データを取得してBase64に変換する関数
function getLineImage(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const options = {
    'method': 'get',
    'headers': {
      'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN
    }
  };
  const response = UrlFetchApp.fetch(url, options);
  const blob = response.getBlob();
  return Utilities.base64Encode(blob.getBytes());
}

// Geminiにテキスト（＋画像）を投げる関数
function translateWithGemini(text, imageBase64) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  // 基本のテキストパーツ
  let parts = [{"text": text}];
  
  // 画像がある場合はパーツに追加
  if (imageBase64) {
    parts.push({
      "inlineData": {
        "mimeType": "image/jpeg",
        "data": imageBase64
      }
    });
  }

  const payload = {
    "system_instruction": {
      "parts": [{
        "text": "あなたは優秀なバイリンガル翻訳アシスタントです。以下のルールに従って応答してください。\n1. 入力が日本語のテキストの場合：教科書通りの直訳ではなく、日常会話で実際に使われる自然な英語のイディオムや表現に翻訳してください。複数の解釈ができる場合は状況に応じたフレーズを箇条書きで2〜3個提示してください。\n2. 入力が日本語以外の言語のテキストの場合：自然な日本語に翻訳してください。\n3. 画像が入力された場合：画像内のテキストを抽出し、それを自然な日本語に翻訳してください。\nいずれの場合も、挨拶や解説は不要です。翻訳結果のみを出力してください。"
      }]
    },
    "contents": [{
      "parts": parts
    }]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  return data.candidates[0].content.parts[0].text;
}

// LINEに返信する関数
function replyToLine(replyToken, text) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const payload = {
    'replyToken': replyToken,
    'messages': [{'type': 'text', 'text': text}]
  };
  const options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN
    },
    'payload': JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

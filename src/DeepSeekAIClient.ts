import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

let conversationHistory: ChatMessage[] = [];

export async function askDeepSeek(prompt: string, originalUserMessage?: string, imageData?: string): Promise<string> {
  try {
    // .env dosyasını extension'ın kendi dizininden yükle
    let envPath = '';
    const extensionRoot = path.resolve(__dirname, '../../..'); // dist/src'den çıkıp extension root'a git
    envPath = path.join(extensionRoot, '.env');

    // Eğer bulunamazsa, alternatif yolları dene
    if (!fs.existsSync(envPath)) {
      const alternativePaths = [
        path.resolve(__dirname, '../../.env'), // dist'den çık
        path.resolve(__dirname, '../.env'),    // src'den çık
        path.resolve(process.cwd(), '.env'),   // current working directory
      ];
      
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          envPath = altPath;
          break;
        }
      }
    }

    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`Loaded .env from: ${envPath}`);
    } else {
      console.warn(`.env file not found. Tried paths: ${envPath}`);
    }
    
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error(`DEEPSEEK_API_KEY environment variable is not set. Please check your .env file. Tried paths: ${envPath}`);
    }

    // Add user message to history (use original message if provided, otherwise use prompt)
    const messageToAdd = originalUserMessage || prompt;
    conversationHistory.push({
      role: 'user',
      content: messageToAdd,
      timestamp: Date.now()
    });

    const messages: any[] = [
      {
        role: 'system',
        content: 'Sen yardımcı bir AI asistanısın. Kullanıcılara kod yazma, hata ayıklama ve teknik sorularında yardımcı oluyorsun. Cevaplarını Türkçe ver.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Resim varsa son kullanıcı mesajına ekle
    if (imageData) {
      // DeepSeek'in resim desteği olmayabilir, sadece text gönder
      console.log('DeepSeek: Resim tespit edildi ancak DeepSeek API resim desteği olmayabilir. Sadece text prompt gönderiliyor.');
      messages[messages.length - 1] = {
        role: 'user',
        content: `${prompt}\n\n[Not: Resim yüklendi ancak DeepSeek API resim desteği olmayabilir. Resim içeriği analiz edilemiyor.]`
      };
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    // Stream response'u oku
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                fullResponse += parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } else {
      // Fallback for non-stream responses
      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('DeepSeek API\'den geçersiz yanıt alındı');
      }
      fullResponse = data.choices[0].message.content;
    }

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now()
    });

    return fullResponse;

  } catch (error) {
    console.error('DeepSeek API error:', error);
    throw error;
  }
}

export function clearConversationHistory() {
  conversationHistory = [];
}

export function getConversationHistory(): ChatMessage[] {
  return [...conversationHistory];
}

export function restoreConversationHistory(history: ChatMessage[]) {
  conversationHistory = [...history];
} 
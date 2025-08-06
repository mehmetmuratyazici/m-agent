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

export async function askDeepSeek(prompt: string, imageData?: string): Promise<string> {
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

    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    });

    const messages: any[] = [
      {
        role: 'system',
        content: 'Sen yardımcı bir AI asistanısın. Kullanıcılara kod yazma, hata ayıklama ve teknik sorularında yardımcı oluyorsun. Cevaplarını Türkçe ver.'
      }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      if (msg.role === 'user' && msg === conversationHistory[conversationHistory.length - 1] && imageData) {
        // Son kullanıcı mesajına resim ekleme
        messages.push({
          role: msg.role,
          content: [
            {
              type: 'text',
              text: msg.content
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData
              }
            }
          ]
        });
      } else {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('DeepSeek API\'den geçersiz yanıt alındı');
    }

    const assistantMessage = data.choices[0].message.content;

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: Date.now()
    });

    return assistantMessage;

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
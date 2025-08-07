import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

let conversationHistory: ChatMessage[] = [];
let anthropicClient: Anthropic | null = null;
let currentMessages: any[] = [];

// .env dosyasını yükle
function loadEnv() {
  let envPath = '';
  const extensionRoot = path.resolve(__dirname, '../../..');
  envPath = path.join(extensionRoot, '.env');

  if (!fs.existsSync(envPath)) {
    const alternativePaths = [
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../.env'),
      path.resolve(process.cwd(), '.env'),
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
}

// Anthropic client'ı başlat
function initializeAnthropicClient() {
  if (!anthropicClient) {
    loadEnv();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error(`ANTHROPIC_API_KEY environment variable is not set. Please check your .env file.`);
    }
    
    anthropicClient = new Anthropic({
      apiKey: apiKey,
    });
  }
  return anthropicClient;
}

// Conversation history'yi mesaj formatına çevir
function convertHistoryToMessages(history: ChatMessage[]): any[] {
  return history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

// Mesajı history'ye ekle
function addToHistory(role: 'user' | 'assistant', content: string) {
  conversationHistory.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Son 20 mesajı tut (10 çift)
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }
}

export async function askClaude(prompt: string, originalUserMessage?: string, imageData?: string): Promise<string> {
  try {
    const client = initializeAnthropicClient();
    
    // Add user message to history (use original message if provided, otherwise use prompt)
    const messageToAdd = originalUserMessage || prompt;
    addToHistory('user', messageToAdd);
    
    // Mevcut conversation history'yi mesaj formatına çevir
    const historyMessages = convertHistoryToMessages(conversationHistory.slice(0, -1)); // Son mesajı çıkar
    
    // Mevcut mesajı hazırla
    const currentMessage: any = {
      role: 'user',
      content: prompt
    };

    // Resim varsa content'i array yap
    if (imageData) {
      currentMessage.content = [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.match(/data:([^;]+);base64/)?.[1] || 'image/jpeg',
            data: imageData.replace(/^data:[^;]+;base64,/, '')
          }
        }
      ];
    }

    // Tüm mesajları birleştir
    const allMessages = [...historyMessages, currentMessage];

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',//'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: allMessages
    });

    if (!response.content || !response.content[0]) {
      throw new Error('Claude API\'den geçersiz yanıt alındı');
    }

    const firstContent = response.content[0];
    if (firstContent.type !== 'text') {
      throw new Error('Claude API\'den text olmayan yanıt alındı');
    }

    const assistantMessage = firstContent.text;

    // Add assistant response to history
    addToHistory('assistant', assistantMessage);

    return assistantMessage;

  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

export function clearConversationHistory() {
  conversationHistory = [];
  currentMessages = [];
}

export function getConversationHistory(): ChatMessage[] {
  return [...conversationHistory];
}

export function restoreConversationHistory(history: ChatMessage[]) {
  conversationHistory = [...history];
  currentMessages = convertHistoryToMessages(history);
} 
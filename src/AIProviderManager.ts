import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { askGemini, clearConversationHistory as clearGeminiHistory, getConversationHistory as getGeminiHistory, restoreConversationHistory as restoreGeminiHistory, ChatMessage as GeminiChatMessage } from './GeminiAIClient';
import { askDeepSeek, clearConversationHistory as clearDeepSeekHistory, getConversationHistory as getDeepSeekHistory, restoreConversationHistory as restoreDeepSeekHistory, ChatMessage as DeepSeekChatMessage } from './DeepSeekAIClient';

export type AIProvider = 'gemini' | 'deepseek';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

let currentProvider: AIProvider = 'gemini';

export function setAIProvider(provider: AIProvider) {
  currentProvider = provider;
}

export function getCurrentProvider(): AIProvider {
  return currentProvider;
}

export function getProviderDisplayName(provider: AIProvider): string {
  switch (provider) {
    case 'gemini':
      return '🤖 Gemini';
    case 'deepseek':
      return '🧠 DeepSeek';
    default:
      return '🤖 AI';
  }
}

export function getProviderIcon(provider: AIProvider): string {
  switch (provider) {
    case 'gemini':
      return '🤖';
    case 'deepseek':
      return '🧠';
    default:
      return '🤖';
  }
}

export async function askAI(prompt: string, originalUserMessage?: string, imageData?: string): Promise<string> {
  try {
    switch (currentProvider) {
      case 'gemini':
        return await askGemini(prompt, originalUserMessage, imageData);
      case 'deepseek':
        // DeepSeek doesn't need the originalUserMessage parameter like Gemini
        const messageToUse = originalUserMessage || prompt;
        return await askDeepSeek(messageToUse, imageData);
      default:
        throw new Error(`Bilinmeyen AI provider: ${currentProvider}`);
    }
  } catch (error) {
    console.error(`${currentProvider} AI error:`, error);
    throw error;
  }
}

export function clearConversationHistory() {
  switch (currentProvider) {
    case 'gemini':
      clearGeminiHistory();
      break;
    case 'deepseek':
      clearDeepSeekHistory();
      break;
  }
}

export function getConversationHistory(): ChatMessage[] {
  switch (currentProvider) {
    case 'gemini':
      return getGeminiHistory();
    case 'deepseek':
      return getDeepSeekHistory();
    default:
      return [];
  }
}

export function restoreConversationHistory(history: ChatMessage[]) {
  switch (currentProvider) {
    case 'gemini':
      restoreGeminiHistory(history as GeminiChatMessage[]);
      break;
    case 'deepseek':
      restoreDeepSeekHistory(history as DeepSeekChatMessage[]);
      break;
  }
}

export function getAvailableProviders(): AIProvider[] {
  return ['gemini', 'deepseek'];
}

export async function checkProviderAvailability(provider: AIProvider): Promise<boolean> {
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

    switch (provider) {
      case 'gemini':
        return !!process.env.GEMINI_API_KEY;
      case 'deepseek':
        return !!process.env.DEEPSEEK_API_KEY;
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
} 
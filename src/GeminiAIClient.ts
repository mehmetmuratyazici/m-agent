// src/GeminiAIClient.ts

import * as vscode from 'vscode';
import dotenv from "dotenv";
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import * as path from 'path';
import * as fs from 'fs';

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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(`GEMINI_API_KEY environment variable is not set. Please check your .env file. Tried paths: ${envPath}`);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Conversation history interface
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Global conversation history
let conversationHistory: ChatMessage[] = [];

// Chat session
let chatSession: ChatSession | null = null;

// Initialize chat session
function initializeChatSession() {
  if (!chatSession) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    chatSession = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });
  }
  return chatSession;
}

// Add message to history
function addToHistory(role: 'user' | 'assistant', content: string) {
  conversationHistory.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Keep only last 20 messages to prevent token limit issues
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }
}

// Clear conversation history
export function clearConversationHistory() {
  conversationHistory = [];
  chatSession = null;
}

// Get conversation history
export function getConversationHistory(): ChatMessage[] {
  return [...conversationHistory];
}

// Restore conversation history
export async function restoreConversationHistory(history: ChatMessage[]): Promise<void> {
  conversationHistory = [...history];
  
  // Chat session'ı yeniden başlat ve history'yi yükle
  if (history.length > 0) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // History'yi chat formatına çevir
    const chatHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));
    
    // Son mesajı çıkar (çünkü sendMessage ile ekleyeceğiz)
    const historyWithoutLast = chatHistory.slice(0, -1);
    
    chatSession = model.startChat({
      history: historyWithoutLast,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });
  }
}

export async function askGemini(prompt: string, originalUserMessage?: string, imageData?: string): Promise<string> {
  try {
    const session = initializeChatSession();
    
    // Add user message to history (use original message if provided, otherwise use prompt)
    const messageToAdd = originalUserMessage || prompt;
    addToHistory('user', messageToAdd);
    
    // Prepare message parts
    const messageParts: any[] = [{ text: prompt }];
    
    // Add image if provided
    if (imageData) {
      messageParts.push({
        inlineData: {
          mimeType: imageData.match(/data:([^;]+);base64/)?.[1] || 'image/png',
          data: imageData.replace(/^data:[^;]+;base64,/, '')
        }
      });
    }
    
    // Send message to chat session
    const result = await session.sendMessage(messageParts);
    const response = result.response;
    const text = response.text();
    
    // Add assistant response to history
    addToHistory('assistant', text);
    
    console.log("Yanıt:", text);
    return text;
  } catch (err: any) {
    console.error("Hata:", err.message || err);
    return err.message;
  }
}

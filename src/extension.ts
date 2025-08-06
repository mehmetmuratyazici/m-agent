import * as vscode from 'vscode';
import { askAI, clearConversationHistory, getConversationHistory, restoreConversationHistory, ChatMessage, setAIProvider, getCurrentProvider, getProviderDisplayName, getAvailableProviders, checkProviderAvailability, AIProvider } from './AIProviderManager';
import { marked } from 'marked';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { initializeProviderManager } from './AIProviderManager';

// Dosya işlemleri için yardımcı fonksiyonlar
async function getProjectFiles(): Promise<string[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return [];

  const files: string[] = [];
  
  for (const folder of workspaceFolders) {
    const pattern = new vscode.RelativePattern(folder, '**/*');
    const fileUris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    
    for (const uri of fileUris) {
      files.push(uri.fsPath);
    }
  }
  
  return files;
}

async function readFileContent(filePath: string): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`Dosya okunamadı: ${filePath}`);
  }
}

async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    // Dizin yoksa oluştur
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    
    await fs.promises.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Dosya yazılamadı: ${filePath}`);
  }
}

async function getFileTree(): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return '';

  let tree = '';
  
  for (const folder of workspaceFolders) {
    tree += `📁 ${folder.name}\n`;
    tree += await buildFileTree(folder.uri.fsPath, '  ');
  }
  
  return tree;
}

async function buildFileTree(dirPath: string, indent: string): Promise<string> {
  let tree = '';
  
  try {
    const items = await fs.promises.readdir(dirPath);
    
    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
      
      const fullPath = path.join(dirPath, item);
      const stat = await fs.promises.stat(fullPath);
      
      if (stat.isDirectory()) {
        tree += `${indent}📁 ${item}\n`;
        tree += await buildFileTree(fullPath, indent + '  ');
      } else {
        tree += `${indent}📄 ${item}\n`;
      }
    }
  } catch (error) {
    // Hata durumunda sessizce devam et
  }
  
  return tree;
}

// Resim işleme fonksiyonları
async function saveImageToProject(imageData: string, context: vscode.ExtensionContext): Promise<string> {
  try {
    // Base64'ten binary'e çevir
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Resim formatını belirle
    const format = imageData.match(/data:image\/([a-z]+);base64/)?.[1] || 'png';
    const extension = format === 'jpeg' ? 'jpg' : format;
    
    // Benzersiz dosya adı oluştur
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const fileName = `uploaded_image_${timestamp}_${randomId}.${extension}`;
    
    // Proje içinde images klasörü oluştur
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let imagesDir: string;
    
    if (workspaceFolders && workspaceFolders.length > 0) {
      imagesDir = path.join(workspaceFolders[0].uri.fsPath, 'images');
    } else {
      // Workspace yoksa extension storage'da sakla
      imagesDir = path.join(context.globalStorageUri.fsPath, 'images');
    }
    
    // Dizin yoksa oluştur
    if (!fs.existsSync(imagesDir)) {
      await fs.promises.mkdir(imagesDir, { recursive: true });
    }
    
    const imagePath = path.join(imagesDir, fileName);
    await fs.promises.writeFile(imagePath, imageBuffer);
    
    return imagePath;
  } catch (error) {
    throw new Error(`Resim kaydedilemedi: ${error}`);
  }
}

async function encodeImageToBase64(imagePath: string): Promise<string> {
  try {
    const imageBuffer = await fs.promises.readFile(imagePath);
    const base64 = imageBuffer.toString('base64');
    
    // Resim formatını belirle
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/png';
    
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    throw new Error(`Resim encode edilemedi: ${error}`);
  }
}

// Conversation history'yi kaydetme ve yükleme fonksiyonları
function getHistoryFilePath(context: vscode.ExtensionContext): string {
  return path.join(context.globalStorageUri.fsPath, 'conversation-history.json');
}

async function saveConversationHistory(context: vscode.ExtensionContext): Promise<void> {
  try {
    const history = getConversationHistory();
    const historyPath = getHistoryFilePath(context);
    
    // Dizin yoksa oluştur
    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    
    await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Conversation history kaydedilemedi:', error);
  }
}

async function loadConversationHistory(context: vscode.ExtensionContext): Promise<ChatMessage[]> {
  try {
    const historyPath = getHistoryFilePath(context);
    
    if (fs.existsSync(historyPath)) {
      const data = await fs.promises.readFile(historyPath, 'utf8');
      const history = JSON.parse(data) as ChatMessage[];
      
      // History'yi GeminiAIClient'a yükle
      await restoreConversationHistory(history);
      
      return history;
    }
  } catch (error) {
    console.error('Conversation history yüklenemedi:', error);
  }
  
  return [];
}

// AI yanıtını analiz edip dosya işlemlerini gerçekleştir
async function processAIResponse(response: string, webviewView: vscode.WebviewView): Promise<string> {
  let processedResponse = response;
  
  try {
    // Workspace root'unu al
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let workspaceRoot: string;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
      // Workspace yoksa, kullanıcının home dizininde yeni bir proje klasörü oluştur
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      if (!homeDir) {
        throw new Error('Home dizini bulunamadı');
      }
      
      // Yeni proje klasörü oluştur
      const projectName = 'ai-generated-project';
      workspaceRoot = path.join(homeDir, projectName);
      
      // Klasör yoksa oluştur
      if (!fs.existsSync(workspaceRoot)) {
        await fs.promises.mkdir(workspaceRoot, { recursive: true });
      }
      
      // VSCode'da yeni workspace aç
      const workspaceUri = vscode.Uri.file(workspaceRoot);
      await vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
      
      processedResponse += `\n\n📁 **Yeni proje klasörü oluşturuldu:** \`${workspaceRoot}\``;
    } else {
      workspaceRoot = workspaceFolders[0].uri.fsPath;
    }
    
    // Dosya oluşturma komutlarını ara (daha spesifik pattern)
    const fileCreatePattern = /```(?:file|create|new):([^\n]+)\n([\s\S]*?)```/g;
    let fileCreateMatch;
    
    while ((fileCreateMatch = fileCreatePattern.exec(response)) !== null) {
      const relativePath = fileCreateMatch[1].trim();
      const fileContent = fileCreateMatch[2].trim();
      
      // Göreceli yolu tam yola çevir
      const fullPath = path.isAbsolute(relativePath) 
        ? relativePath 
        : path.join(workspaceRoot, relativePath);
      
      try {
        // Dosyayı oluştur
        await writeFileContent(fullPath, fileContent);
        
        // Başarı mesajını ekle
        processedResponse += `\n\n✅ **Dosya oluşturuldu:** \`${relativePath}\``;
        
        // Webview'a bildirim gönder
        webviewView.webview.postMessage({ 
          command: 'fileWritten', 
          filePath: relativePath 
        });
      } catch (error) {
        processedResponse += `\n\n❌ **Dosya oluşturulamadı:** \`${relativePath}\` - ${error}`;
      }
    }
    
    // Dosya güncelleme komutlarını ara
    const fileUpdatePattern = /```(?:update|edit):([^\n]+)\n([\s\S]*?)```/g;
    let fileUpdateMatch;
    
    while ((fileUpdateMatch = fileUpdatePattern.exec(response)) !== null) {
      const relativePath = fileUpdateMatch[1].trim();
      const fileContent = fileUpdateMatch[2].trim();
      
      // Göreceli yolu tam yola çevir
      const fullPath = path.isAbsolute(relativePath) 
        ? relativePath 
        : path.join(workspaceRoot, relativePath);
      
      try {
        // Dosyayı güncelle
        await writeFileContent(fullPath, fileContent);
        
        // Başarı mesajını ekle
        processedResponse += `\n\n✅ **Dosya güncellendi:** \`${relativePath}\``;
        
        // Webview'a bildirim gönder
        webviewView.webview.postMessage({ 
          command: 'fileWritten', 
          filePath: relativePath 
        });
      } catch (error) {
        processedResponse += `\n\n❌ **Dosya güncellenemedi:** \`${relativePath}\` - ${error}`;
      }
    }
    
    // Dosya okuma komutlarını ara
    const fileReadPattern = /```(?:read|show):([^\n]+)```/g;
    let fileReadMatch;
    
    while ((fileReadMatch = fileReadPattern.exec(response)) !== null) {
      const relativePath = fileReadMatch[1].trim();
      
      // Göreceli yolu tam yola çevir
      const fullPath = path.isAbsolute(relativePath) 
        ? relativePath 
        : path.join(workspaceRoot, relativePath);
      
      try {
        // Dosyayı oku
        const content = await readFileContent(fullPath);
        
        // Dosya içeriğini AI yanıtına ekle
        processedResponse += `\n\n📄 **Dosya içeriği:** \`${relativePath}\`\n\`\`\`\n${content}\n\`\`\``;
        
        // Dosya içeriğini webview'a da gönder
        webviewView.webview.postMessage({ 
          command: 'fileContent', 
          filePath: relativePath, 
          content: content 
        });
      } catch (error) {
        processedResponse += `\n\n❌ **Dosya okunamadı:** \`${relativePath}\` - ${error}`;
      }
    }
    
  } catch (error) {
    console.error('AI yanıtı işlenirken hata:', error);
  }
  
  return processedResponse;
}

export function activate(context: vscode.ExtensionContext) {
  initializeProviderManager(context); // AIProviderManager'ı başlat
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'aiSidebarView',
      new AIWebviewProvider(context)
    )
  );
}

class AIWebviewProvider implements vscode.WebviewViewProvider {
  private context: vscode.ExtensionContext;
  private historyLoaded = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    console.log('AIWebviewProvider initialized');
    
    // Extension başladığında history'yi yükle
    this.loadHistoryOnStartup();
  }

  private async loadHistoryOnStartup(): Promise<void> {
    try {
      await loadConversationHistory(this.context);
      this.historyLoaded = true;
      console.log('Conversation history loaded on startup');
    } catch (error) {
      console.error('Failed to load conversation history on startup:', error);
    }
  }
    
  resolveWebviewView(
    webviewView: vscode.WebviewView
  ): void {
    console.log('✅ resolveWebviewView CALLED');
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    
    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js')
    );
    const styleUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css')
    );
    const logoUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'ai-icon.svg')
    );

    var htmlContent = this.getHtml(this.context.extensionUri);

    webviewView.webview.html = htmlContent
      .replace('{{scriptUri}}', scriptUri.path)
      .replace('{{styleUri}}', styleUri.path)
      .replace('{{logoUri}}', logoUri.path);

    // Webview başlatıldığında mevcut provider'ı gönder
    const currentProvider = getCurrentProvider();
    webviewView.webview.postMessage({ 
      command: 'currentProvider', 
      provider: currentProvider,
      displayName: getProviderDisplayName(currentProvider),
      availableProviders: getAvailableProviders().map(p => ({
        value: p,
        displayName: getProviderDisplayName(p)
      }))
    });


    
    webviewView.webview.onDidReceiveMessage(async message => {
      if (message.command === 'sendPrompt') {
        try {
          // Proje bilgilerini AI'ya gönder
          let enhancedPrompt = message.text;
          let imageData: string | undefined;
          
          // Resim varsa işle
          if (message.imageData) {
            try {
              const imagePath = await saveImageToProject(message.imageData, this.context);
              imageData = message.imageData;
              enhancedPrompt += `\n\n📷 **Yüklenen resim:** ${path.basename(imagePath)}`;
            } catch (error) {
              console.error('Resim kaydedilemedi:', error);
            }
          }
          
          // Eğer prompt dosya işlemleri ile ilgiliyse, proje bilgilerini ekle
          if (message.text.toLowerCase().includes('dosya') || 
              message.text.toLowerCase().includes('file') ||
              message.text.toLowerCase().includes('proje') ||
              message.text.toLowerCase().includes('project') ||
              message.text.toLowerCase().includes('kod') ||
              message.text.toLowerCase().includes('code') ||
              message.text.toLowerCase().includes('yap') ||
              message.text.toLowerCase().includes('oluştur') ||
              message.text.toLowerCase().includes('create') ||
              message.text.toLowerCase().includes('make') ||
              message.text.toLowerCase().includes('app') ||
              message.text.toLowerCase().includes('uygulama') ||
              message.text.toLowerCase().includes('revize') ||
              message.text.toLowerCase().includes('düzenle') ||
              message.text.toLowerCase().includes('edit')) {
            
            const fileTree = await getFileTree();
 enhancedPrompt = `Proje yapısı:
\`\`\`
${fileTree}
\`\`\`

Kullanıcı sorusu: ${message.text}

Aşağıdaki 4 işlem türünden istediğin kadarını kullanabilirsin. Her dosya işlemi için ayrı bir **kod bloğu** kullan:

---

### 💡 Desteklenen İşlem Türleri

1. ✏️ Dosya Güncelleme  
\`\`\`update:dizin/dosya_adı
(dosyanın yeni içeriği)
\`\`\`

2. 📄 Yeni Dosya Oluşturma  
\`\`\`create:dizin/yeni_dosya_adı
(yeni dosyanın içeriği)
\`\`\`

3. ❌ Dosya Silme  
\`\`\`delete:dizin/dosya_adı
\`\`\`

4. 📖 Dosya Okuma İsteği  
\`\`\`read:dizin/dosya_adı
\`\`\`

---

## 📌 Kurallar:

- ✅ Cevap **birden fazla kod bloğu** içerebilir. Her dosya işlemi için ayrı kod bloğu kullan.
- 🧾 Her blok yukarıdaki 4 formatta biri ile başlamalı (\`update:\`, \`create:\`, \`delete:\`, \`read:\`).
- ✅ Kod bloğu dışında açıklama yapabilirsin, ancak dosya işlemleri için mutlaka kod bloğu kullan.
- ⚠️ Kod bloğu içeriği yalnızca işlemle ilgili olmalı.
- 🧪 Dosya yolları tam ve geçerli olmalı (\`src/...\` gibi).
- 🧹 Kod bloğu etiketleri ve içeriği arasında boşluk bırakma (örnek: \`\`\`update:src/index.js\`).
- Sana bir resim dosyası veya bir url verildiyse onu detaylıca incele ve onun ile ilgili istenileni algılayıp yerine getir (örnek: bir url verildi ve onu aynısı yap dene bilir veya url verilir buradaki tüm bilgileri tara ve o kapsamda benim çözümüme cevap ver denebilir. ) bu kısım aşırı kritik .
---

## 🎯 Örnek – Çoklu İşlem Cevabı:

\`\`\`update:src/App.js
import React from 'react';
function App() {
  return <div>Yeni içerik</div>;
}
export default App;
\`\`\`

\`\`\`create:src/utils/math.js
export function sum(a, b) {
  return a + b;
}
\`\`\`

\`\`\`delete:src/old/DeprecatedComponent.jsx
\`\`\`

\`\`\`read:src/hooks/useAuth.js
\`\`\`
`;
          }
          
                      const response = await askAI(enhancedPrompt, message.text, imageData);
          
          console.log('AI Response:', response);
          console.log('Response length:', response.length);
          
          // AI yanıtını işle ve dosya işlemlerini gerçekleştir
          const processedResponse = await processAIResponse(response, webviewView);
          
          console.log('Processed Response:', processedResponse);
          console.log('Processed Response length:', processedResponse.length);
          const html = marked(processedResponse);
          webviewView.webview.postMessage({ command: 'addResponse', html: html });
          
          // Her mesajdan sonra history'yi kaydet
          await saveConversationHistory(this.context);
        } catch (error) {
          console.error('Error processing message:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          webviewView.webview.postMessage({ 
            command: 'addResponse', 
            html: '<p style="color: red;">Error: ' + errorMessage + '</p>' 
          });
        }
      } else if (message.command === 'clearChat') {
        // Clear conversation history when chat is cleared
        clearConversationHistory();
        webviewView.webview.postMessage({ command: 'chatCleared' });
        
        // History dosyasını da sil
        try {
          const historyPath = getHistoryFilePath(this.context);
          if (fs.existsSync(historyPath)) {
            await fs.promises.unlink(historyPath);
          }
        } catch (error) {
          console.error('History dosyası silinemedi:', error);
        }
      } else if (message.command === 'getHistory') {
        // Send conversation history to webview
        const history = getConversationHistory();
        webviewView.webview.postMessage({ command: 'historyLoaded', history: history });
      } else if (message.command === 'readFile') {
        // Dosya okuma
        try {
          const content = await readFileContent(message.filePath);
          webviewView.webview.postMessage({ 
            command: 'fileContent', 
            filePath: message.filePath, 
            content: content 
          });
        } catch (error) {
          webviewView.webview.postMessage({ 
            command: 'fileError', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      } else if (message.command === 'writeFile') {
        // Dosya yazma
        try {
          await writeFileContent(message.filePath, message.content);
          webviewView.webview.postMessage({ 
            command: 'fileWritten', 
            filePath: message.filePath 
          });
        } catch (error) {
          webviewView.webview.postMessage({ 
            command: 'fileError', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      } else if (message.command === 'getFileTree') {
        // Dosya ağacı alma
        try {
          const fileTree = await getFileTree();
          webviewView.webview.postMessage({ 
            command: 'fileTree', 
            tree: fileTree 
          });
        } catch (error) {
          webviewView.webview.postMessage({ 
            command: 'fileError', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      } else if (message.command === 'getProjectFiles') {
        // Proje dosyalarını alma
        try {
          const files = await getProjectFiles();
          webviewView.webview.postMessage({ 
            command: 'projectFiles', 
            files: files 
          });
        } catch (error) {
          webviewView.webview.postMessage({ 
            command: 'fileError', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      } else if (message.command === 'changeProvider') {
        // AI provider değiştirme - sadece provider'ı değiştir, chat'i temizleme
        const newProvider = message.provider as AIProvider;
        setAIProvider(newProvider);
        
        // Webview'e provider bilgisini gönder
        webviewView.webview.postMessage({ 
          command: 'providerChanged', 
          provider: newProvider,
          displayName: getProviderDisplayName(newProvider)
        });
      } else if (message.command === 'getCurrentProvider') {
        // Mevcut provider bilgisini gönder
        const provider = getCurrentProvider();
        webviewView.webview.postMessage({ 
          command: 'currentProvider', 
          provider: provider,
          displayName: getProviderDisplayName(provider),
          availableProviders: getAvailableProviders().map(p => ({
            value: p,
            displayName: getProviderDisplayName(p)
          }))
        });
      }
    });
  }

  private getHtml(uri: vscode.Uri): string {
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(uri.path, 'src', 'webviewContent.html');
    return fs.readFileSync(htmlPath, 'utf8');
  }
}



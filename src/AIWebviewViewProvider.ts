import * as vscode from 'vscode';
import { askGemini } from './GeminiAIClient';

export class AIWebviewViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    // Webview'den mesaj al
    webviewView.webview.onDidReceiveMessage(async message => {
      switch (message.command) {
        case 'sendPrompt':
          const prompt = message.text;
          // Burada Gemini API çağrısını yap, sonucu al
          const response = await askGemini(prompt);
          // Sonucu webview'a gönder
          this._view?.webview.postMessage({ command: 'showResponse', text: response });
          break;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Basit input ve sonuç alanı
    return `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 1rem; }
          textarea { width: 100%; height: 4rem; }
          #response { white-space: pre-wrap; margin-top: 1rem; background: #f3f3f3; padding: 1rem; border-radius: 6px; }
          button { margin-top: 0.5rem; }
        </style>
      </head>
      <body>
        <h3>AI Bard Prompt</h3>
        <textarea id="prompt" placeholder="Sorunu yaz..."></textarea>
        <button id="sendBtn">Gönder</button>
        <div id="response"></div>

        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById('sendBtn').addEventListener('click', () => {
            const text = document.getElementById('prompt').value;
            vscode.postMessage({ command: 'sendPrompt', text });
          });

          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showResponse') {
              document.getElementById('response').textContent = message.text;
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}



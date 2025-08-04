import * as vscode from 'vscode';

export class AIPanelProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    console.log('✅ resolveWebviewView CALLED!');
    webviewView.webview.options = { enableScripts: true };

    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );

    webviewView.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: sans-serif; margin: 0; padding: 10px; }
        #chat { height: 250px; border: 1px solid #ccc; margin-bottom: 10px; overflow-y: auto; }
        #input { display: flex; gap: 5px; }
        #prompt { flex: 1; padding: 5px; }
        button { padding: 5px 10px; }
      </style>
    </head>
    <body>
      <h2>AI Chat Panel</h2>
      <div id="chat"></div>
      <div id="input">
        <input id="prompt" type="text" placeholder="Prompt yaz..." />
        <button id="sendBtn">Gönder</button>
      </div>
      <script src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

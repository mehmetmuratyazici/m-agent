import * as vscode from 'vscode';

export function showResponsePanel(content: string) {
  const panel = vscode.window.createWebviewPanel(
    'aiResponse',
    'AI Yanıtı',
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  panel.webview.html = getWebviewContent(content);
}

function getWebviewContent(content: string): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <style>
      body {
        font-family: 'Segoe UI', sans-serif;
        padding: 1rem;
      }
      pre {
        background-color: #f3f3f3;
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
      }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
  </head>
  <body>
    <h2>AI Yanıtı</h2>
    <pre><code class="language-ts">${escapeHtml(content)}</code></pre>
  </body>
  </html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


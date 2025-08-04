import { addChatMessage, addWelcomeMessage, addHtmlMessage } from './markdownRenderer';

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
const promptInput = document.getElementById('prompt') as HTMLInputElement;
const chatContainer = document.getElementById('chat') as HTMLDivElement;

// Sayfa yüklendiğinde karşılama mesajını ekle
document.addEventListener('DOMContentLoaded', () => {
  addWelcomeMessage(chatContainer);
});

sendBtn.addEventListener('click', () => {
  const text = promptInput.value.trim();
  if (text) {
    addChatMessage(chatContainer, text, true, false);
    vscode.postMessage({ command: 'sendPrompt', text });
    promptInput.value = '';
  }
});

// Enter tuşu ile gönderme
promptInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});

// VSCode'dan gelen mesajları dinle
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.command) {
    case 'addResponse':
      if (message.html) {
        // Extension'dan gelen render edilmiş HTML
        addHtmlMessage(chatContainer, message.html);
      } else if (message.text) {
        // Ham markdown metni
        addChatMessage(chatContainer, message.text, false, true);
      }
      break;
    case 'clearChat':
      chatContainer.innerHTML = '';
      addWelcomeMessage(chatContainer);
      break;
  }
});

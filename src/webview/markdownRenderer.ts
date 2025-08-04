declare function acquireVsCodeApi(): any;

// Markdown render işlevi (sadece webview tarafında kullanılır)
export function renderMarkdown(md: string): string {
  // marked kütüphanesinin yüklü olduğunu varsayıyoruz
  if (typeof window === 'undefined') {
    throw new Error('renderMarkdown can only be used in webview context');
  }
  
  const html = (window as any).marked.parse(md, {
    highlight: function(code: string, lang: string) {
      if (lang && (window as any).hljs.getLanguage(lang)) {
        return (window as any).hljs.highlight(code, { language: lang }).value;
      }
      return (window as any).hljs.highlightAuto(code).value;
    }
  });
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Kod bloklarına kopyalama butonu ekle
  temp.querySelectorAll('pre code').forEach(function(block: Element) {
    const pre = block.parentElement;
    if (pre) {
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Kopyala';
      btn.onclick = function(e: Event) {
        e.preventDefault();
        navigator.clipboard.writeText((block as HTMLElement).textContent || '');
        btn.textContent = 'Kopyalandı!';
        setTimeout(function() { 
          btn.textContent = 'Kopyala'; 
        }, 1200);
      };
      pre.style.position = 'relative';
      pre.appendChild(btn);
    }
  });
  
  return temp.innerHTML;
}

// Chat mesajı ekleme işlevi
export function addChatMessage(
  chatContainer: HTMLElement, 
  message: string, 
  isUser: boolean = false,
  isMarkdown: boolean = true
): void {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
  
  if (isMarkdown && !isUser) {
    const mdBody = document.createElement('span');
    mdBody.className = 'markdown-body';
    mdBody.innerHTML = renderMarkdown(message);
    messageDiv.appendChild(mdBody);
  } else {
    messageDiv.textContent = message;
  }
  
  chatContainer.appendChild(messageDiv);
  
  // Syntax highlighting'i yenile
  if ((window as any).hljs) {
    (window as any).hljs.highlightAll();
  }
  
  // Chat'i en alta kaydır
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// HTML olarak gelen mesajı ekleme işlevi (extension'dan gelen render edilmiş HTML için)
export function addHtmlMessage(
  chatContainer: HTMLElement, 
  html: string
): void {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message assistant';
  const mdBody = document.createElement('span');
  mdBody.className = 'markdown-body';
  mdBody.innerHTML = html;
  messageDiv.appendChild(mdBody);
  
  chatContainer.appendChild(messageDiv);
  
  // Syntax highlighting'i yenile
  if ((window as any).hljs) {
    (window as any).hljs.highlightAll();
  }
  
  // Chat'i en alta kaydır
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Chat container'ını temizleme işlevi
export function clearChat(chatContainer: HTMLElement): void {
  chatContainer.innerHTML = '';
}

// İlk karşılama mesajını ekleme işlevi
export function addWelcomeMessage(chatContainer: HTMLElement): void {
  const welcomeMessage = `Merhaba!

Bir kod örneği:

\`\`\`js
console.log("Merhaba!");
\`\`\`

Bir başlık
====
- Liste
- **Kalın**
- _İtalik_`;

  addChatMessage(chatContainer, welcomeMessage, false, true);
} 
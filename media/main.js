(function () {
  const vscode = acquireVsCodeApi();

  document.getElementById('send').addEventListener('click', () => {
    const prompt = document.getElementById('prompt').value;
    vscode.postMessage({ command: 'prompt', text: prompt });
  });

  window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'response') {
      document.getElementById('response').innerHTML = message.text;
    }
  });
})();

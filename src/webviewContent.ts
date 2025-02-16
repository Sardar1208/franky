export function getWebviewContent(): string {
  return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; }
                    #chat { height: calc(100vh - 60px); border: 1px solid #ccc; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; }
                    #input { width: 100%; padding: 10px; margin-top: 10px; box-sizing: border-box; }
                    .tool-message { background: black; color: white; padding: 8px; margin: 5px 0; border-radius: 5px; font-style: italic; display: flex; align-items: center; }
                    .loader { border: 2px solid #ccc; border-top: 2px solid #000; border-radius: 50%; width: 12px; height: 12px; margin-right: 8px; animation: spin 1s linear infinite;}
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div id="chat"></div>
                <input id="input" type="text" placeholder="Type a message..." />
                <script>
                    const chat = document.getElementById('chat');
                    const input = document.getElementById('input');
                    const vscode = acquireVsCodeApi();
                    let toolMessageElement = null;
  
                    window.addEventListener('message', event => {
                        const message = event.data;
                        let lastMessage = chat.lastElementChild;
  
                        if (message.type === 'tool_use') {
                            if (!toolMessageElement) {
                                toolMessageElement = document.createElement('div');
                                toolMessageElement.classList.add("tool-message");
                                toolMessageElement.innerHTML = '<div class="loader"></div>' + message.text;
                                chat.appendChild(toolMessageElement);
                            }
                        } else if (message.type === 'text') {
                            if (toolMessageElement) {
                                chat.removeChild(toolMessageElement);
                                toolMessageElement = null;
                            }
                            if (lastMessage && lastMessage.classList.contains("system-message")) {
                                lastMessage.textContent += message.text;
                            } else {
                                const messageElement = document.createElement('div');
                                messageElement.textContent = 'System: ' + message.text;
                                messageElement.classList.add("system-message");
                                chat.appendChild(messageElement);
                            }
                        }
  
                        chat.scrollTop = chat.scrollHeight;
                    });
  
                    input.addEventListener('keydown', event => {
                        if (event.key === 'Enter') {
                            const userMessage = input.value;
                            const messageElement = document.createElement('div');
                            messageElement.textContent = 'You: ' + userMessage;
                            chat.appendChild(messageElement);
                            input.value = '';
                            chat.scrollTop = chat.scrollHeight;
  
                            vscode.postMessage({ text: userMessage });
                        }
                    });
                </script>
            </body>
            </html>
        `;
}

// import * as vscode from "vscode";

// export function activate(context: vscode.ExtensionContext) {
//   // Register the chat view
//   vscode.window.registerWebviewViewProvider(
//     "chatView",
//     new ChatViewProvider(context)
//   );
// }

// class ChatViewProvider implements vscode.WebviewViewProvider {
//   private _view?: vscode.WebviewView;
//   private _context: vscode.ExtensionContext;

//   constructor(context: vscode.ExtensionContext) {
//     this._context = context;
//   }

//   public async chatWithOllama(webviewView: vscode.WebviewView, userPrompt: string) {

//     console.log("userPrompt: ", userPrompt);

//     const response = await fetch("http://localhost:11434/api/chat", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "llama3.1",
//         stream: true, // Enable streaming response
//         messages: [
//           {
//             role: "system",
//             content: "reply in short. keep it in 2-3 sentences",
//           },
//           {
//             role: "user",
//             content: userPrompt,
//           },
//         ],
//       }),
//     });

//     if (!response.body) {
//       console.error("No response body received.");
//       webviewView.webview.postMessage({ text: "system error" });
//       return;
//     }

//     const reader = response.body.getReader();
//     const decoder = new TextDecoder();

//     let fullResponse = ""; // Store accumulated response

//     while (true) {
//       const { value, done } = await reader.read();
//       if (done) break;

//       const chunk = decoder.decode(value, { stream: true });

//       // Each chunk may contain multiple JSON objects separated by newlines
//       const lines = chunk.split("\n").filter((line) => line.trim() !== "");

//       for (const line of lines) {
//         try {
//           const json = JSON.parse(line);
//           if (json.message?.content) {
//             process.stdout.write(json.message.content); // Print response in real-time
//             fullResponse += json.message.content;
//             webviewView.webview.postMessage({ text: json.message.content });
//           }
//           if (json.done) {
//             console.log("\nResponse complete.");
//           }
//         } catch (error) {
//           console.error("Error parsing JSON chunk:", error);
//         }
//       }
//     }

//     return fullResponse;
//   }

//   public resolveWebviewView(webviewView: vscode.WebviewView): void {
//     this._view = webviewView;

//     // Configure the webview
//     webviewView.webview.options = {
//       enableScripts: true,
//       localResourceRoots: [this._context.extensionUri],
//     };

//     // Set the HTML content for the webview
//     webviewView.webview.html = this.getWebviewContent(webviewView.webview);

//     // Handle messages from the webview
//     webviewView.webview.onDidReceiveMessage((message) => {
//       // Respond with "hello" when a message is received
//       this.chatWithOllama(webviewView, message.text);
//       // webviewView.webview.postMessage({ text: "hello" });
//     });
//   }

//   private getWebviewContent(webview: vscode.Webview): string {
//     return `
//             <!DOCTYPE html>
//             <html lang="en">
//             <head>
//                 <meta charset="UTF-8">
//                 <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                 <title>Chat</title>
//                 <style>
//                     body {
//                         font-family: Arial, sans-serif;
//                         padding: 10px;
//                     }
//                     #chat {
//                         height: calc(100vh - 60px);
//                         border: 1px solid #ccc;
//                         padding: 10px;
//                         overflow-y: auto;
//                     }
//                     #input {
//                         width: 100%;
//                         padding: 10px;
//                         margin-top: 10px;
//                         box-sizing: border-box;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div id="chat"></div>
//                 <input id="input" type="text" placeholder="Type a message..." />
//                 <script>
//                   const chat = document.getElementById('chat');
//                   const input = document.getElementById('input');
//                   const vscode = acquireVsCodeApi(); // FIX: Ensure correct messaging API is used

//                   // Handle incoming messages from the extension
//                   window.addEventListener('message', event => {
//                     const message = event.data;

//                     // Check if the last message is from the system
//                     let lastMessage = chat.lastElementChild;

//                     if (lastMessage && lastMessage.classList.contains("system-message")) {
//                         // Append new text to the last message instead of creating a new div
//                         lastMessage.textContent += message.text;
//                     } else {
//                         // Create a new message element only if there's no existing system message
//                         const messageElement = document.createElement('div');
//                         messageElement.textContent = 'System: ' + message.text;
//                         messageElement.classList.add("system-message"); // Add a class to track system messages
//                         chat.appendChild(messageElement);
//                     }

//                     chat.scrollTop = chat.scrollHeight; // Auto-scroll to the bottom
//                   });

//                   // Send user input to the extension
//                   input.addEventListener('keydown', event => {
//                       if (event.key === 'Enter') {
//                           const userMessage = input.value;
//                           const messageElement = document.createElement('div');
//                           messageElement.textContent = 'You: ' + userMessage;
//                           chat.appendChild(messageElement);
//                           input.value = ''; // Clear the input field
//                           chat.scrollTop = chat.scrollHeight; // Auto-scroll to the bottom

//                           // Send the message to the extension
//                           vscode.postMessage({ text: userMessage }); // FIXED LINE
//                       }
//                   });
//                 </script>
//             </body>
//             </html>
//         `;
//   }
// }

// export function deactivate() {}

import * as vscode from "vscode";
import { ChatViewProvider } from "./chatViewProvider";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatViewProvider(context);
  vscode.window.registerWebviewViewProvider("chatView", provider);
}

export function deactivate() {}

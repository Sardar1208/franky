const chat = document.getElementById("chat");
const emptyChat = document.getElementById("empty-chat");
const input = document.getElementById("input");
const panel = document.getElementById("panel");
const expandButton = document.getElementById("expand-button");
const sendButton = document.getElementById("send-button");
const settings = document.getElementById("settings");
const modeToggle = document.getElementById("mode-toggle");
const modePill = document.getElementById("mode-pill");
const modeText = document.getElementById("mode-text");
const emptyChatText = document.getElementById("empty-chat-text");
const fileAccessToggle = document.getElementById("file-access-toggle");
const fileAccessIcon = document.getElementById("file-access-icon-text");
const addCustomFileButton = document.getElementById("add-custom-file-button");
const vscode = acquireVsCodeApi();
let toolMessageElement = null;

// Set default mode
let currentModeValue = "Control";
let currentFileAccessValue = "Current file";

// Update mode pill and toggle
const updateMode = (mode) => {
  currentModeValue = mode;
  modePill.textContent = mode;
  Array.from(modeToggle.children).forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
};

// Update file access mode and icon
const updateFileAccessMode = (mode) => {
  currentFileAccessValue = mode;
  fileAccessIcon.textContent =
    mode === "Current file" ? "📄" : mode === "Custom files" ? "📂" : "📁";
  Array.from(fileAccessToggle.children).forEach((button) => {
    button.classList.toggle("active", button.dataset.fileAccess === mode);
  });
  addCustomFileButton.style.display =
    mode === "Custom files" ? "block" : "none";
};

// Toggle panel expansion
expandButton.addEventListener("click", () => {
  panel.classList.toggle("expanded");
  expandButton.textContent = panel.classList.contains("expanded") ? "▼" : "▲";
  modeText.style.display = panel.classList.contains("expanded")
    ? "none"
    : "flex";
  if (panel.classList.contains("expanded")) {
    chat.style.paddingBottom = "17em";
  } else {
    chat.style.paddingBottom = "7em";
  }
});

// Handle mode toggle clicks
modeToggle.addEventListener("click", (event) => {
  if (event.target.tagName === "BUTTON") {
    const mode = event.target.dataset.mode;
    updateMode(mode);
  }
});

// Handle file access toggle clicks
fileAccessToggle.addEventListener("click", (event) => {
  if (event.target.tagName === "BUTTON") {
    const mode = event.target.dataset.fileAccess;
    updateFileAccessMode(mode);
  }
});

// Handle sending messages
const sendMessage = () => {
  const userMessage = input.value;
  if (userMessage.trim()) {
    emptyChat.style.display = "none";
    chat.classList.add("has-messages");
    const messageElement = document.createElement("div");
    messageElement.textContent = userMessage;
    messageElement.classList.add("user-message");
    chat.appendChild(messageElement);
    input.value = "";
    chat.scrollTop = chat.scrollHeight;
    vscode.postMessage({ text: userMessage });
  }
};

// Send message on Enter key
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

// Send message on send button click
sendButton.addEventListener("click", sendMessage);

// Handle incoming messages
window.addEventListener("message", (event) => {
  const message = event.data;
  let lastMessage = chat.lastElementChild;

  if (message.type === "tool_use") {
    if (!toolMessageElement) {
      toolMessageElement = document.createElement("div");
      toolMessageElement.classList.add("tool-message");

      toolMessageElement.innerHTML = `
        <div class="tool-card">
          <div class="loader"></div>
          <span class="tool-text">${message.text}</span>
        </div>
      `;
      chat.appendChild(toolMessageElement);
    }
  } else if (message.type === "text") {
    if (toolMessageElement) {
      // Replace loader with green tick instead of removing the dialog
      const loader = toolMessageElement.querySelector(".loader");
      if (loader) {
        loader.outerHTML = `<div class="tick">✔</div>`;
      }
      toolMessageElement = null; // reset so new tool_use can create again
    }

    if (lastMessage && lastMessage.classList.contains("system-message")) {
      lastMessage.textContent += message.text;
    } else {
      const messageElement = document.createElement("div");
      messageElement.textContent = message.text;
      messageElement.classList.add("system-message");
      chat.appendChild(messageElement);
    }
  }

  if (chat.children.length > 0) {
    emptyChat.style.display = "none";
    chat.classList.add("has-messages");
  }

  chat.scrollTop = chat.scrollHeight;
});

// Initialize file access mode
updateFileAccessMode(currentFileAccessValue);

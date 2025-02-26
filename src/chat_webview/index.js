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
const vscode = acquireVsCodeApi();
let toolMessageElement = null;

// Set default mode
let currentModeValue = "Control";

// Update mode pill and toggle
const updateMode = (mode) => {
  currentModeValue = mode;
  modePill.textContent = mode;
  // Update toggle buttons
  Array.from(modeToggle.children).forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
};

// Toggle panel expansion
expandButton.addEventListener("click", () => {
  panel.classList.toggle("expanded");
  expandButton.textContent = panel.classList.contains("expanded") ? "⌄" : "^";
  // Hide mode text in expanded state
  modeText.style.display = panel.classList.contains("expanded")
    ? "none"
    : "flex";
  // Adjust chat padding based on panel state
  if (panel.classList.contains("expanded")) {
    chat.style.paddingBottom = "17em"; /* Expanded panel height + margin */
  } else {
    chat.style.paddingBottom = "7em"; /* Contracted panel height + margin */
  }
});

// Handle mode toggle clicks
modeToggle.addEventListener("click", (event) => {
  if (event.target.tagName === "BUTTON") {
    const mode = event.target.dataset.mode;
    updateMode(mode);
  }
});

// Handle sending messages
const sendMessage = () => {
  const userMessage = input.value;
  if (userMessage.trim()) {
    // Hide empty chat and show chat div
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
      toolMessageElement.innerHTML =
        '<div class="loader"></div>' + message.text;
      chat.appendChild(toolMessageElement);
    }
  } else if (message.type === "text") {
    if (toolMessageElement) {
      chat.removeChild(toolMessageElement);
      toolMessageElement = null;
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

  // Hide empty chat state if messages exist
  if (chat.children.length > 0) {
    emptyChat.style.display = "none";
    chat.classList.add("has-messages");
  }

  chat.scrollTop = chat.scrollHeight;
});

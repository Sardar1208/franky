import * as vscode from "vscode";

let MessageType = {
  TEXT: "text",
  TOOL_USE: "tool_use",
  ERROR: "error",
};

export class ChatManager {
  private messages: Array<{
    role: "user" | "system" | "assistant" | "tool";
    content: string;
    name?: string;
  }> = [];

  constructor() {
    this.messages.push({
      role: "system",
      content: `You are Franky, an extremely skilled and friendly software developer assistant who exisits inside a code editor. So all your questions will be in the context of the code editor, its files, read, write ,edit etc. 

    1) You can only use the available tools. Nothing else!
    2) Do not call the tool unnecessarily, if you already have its context. 
    `,
    });
  }

  private sendMessage(webviewView: any, type: string, data: string) {
    webviewView.webview.postMessage({ type: type, text: data });
  }

  public async streamChatWithOllama(webviewView: any, userPrompt: string) {
    this.messages.push({ role: "user", content: userPrompt });
    await this.processResponse(webviewView);
  }

  private async processResponse(webviewView: any) {
    console.log("messages: ", this.messages);

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3:14b-q4_k_m",
        stream: true,
        messages: this.messages,
        think: false,
        tools: [
          {
            type: "function",
            function: {
              name: "read_file",
              description: "Read the contents of a file",
              parameters: {
                type: "object",
                properties: {
                  filename: {
                    type: "string",
                    description:
                      "The name of the file to read e.g. index.ts . return 'active_file' if current active file has to be read.",
                  },
                },
                required: ["filename"],
              },
            },
          },
        ],
      }),
    });

    if (!response.body) {
      console.error("No response body received.");
      this.sendMessage(webviewView, MessageType.ERROR, "System error");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ""; // Buffer for incoming data
    let assistantResponse = "";
    let isToolCall = false;
    let toolCallBuffer = ""; // Buffer for tool call content

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });

      // Split the buffer into lines (each line is a JSON object)
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      // Process each line (JSON object)
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const content = json.message.content; // Extract the actual content

          if (json.message.tool_calls) {
            isToolCall = true;
            await this.toolCall(
              json.message.tool_calls[0].function,
              webviewView
            );
          } else {
            let spaceIndex;
            while ((spaceIndex = buffer.indexOf(" ")) !== -1) {
              const word = buffer.substring(0, spaceIndex + 1); // Include the space
              buffer = buffer.substring(spaceIndex + 1); // Remove the processed word from buffer

              this.sendMessage(webviewView, MessageType.TEXT, word);
              assistantResponse += word;
            }
            this.sendMessage(webviewView, MessageType.TEXT, buffer);
            assistantResponse += buffer;
            buffer = "";
          }

          console.log(content);

          // Append the content to the buffer for word-by-word processing
          buffer += content;
        } catch (error) {
          console.error("Error parsing JSON chunk:", error);
          continue;
        }
      }
    }

    // Store assistant response in message history if it's not a tool call
    if (!isToolCall) {
      this.messages.push({ role: "assistant", content: assistantResponse });
    }
  }

  private async toolCall(toolCall: any, webviewView: any) {
    console.log("toolCall: ", toolCall);
    if (toolCall.name === "read_file") {
      try {
        this.sendMessage(
          webviewView,
          MessageType.TOOL_USE,
          "reading file content..."
        );

        let fileContent;

        if (toolCall?.arguments?.filename) {
          const filename = toolCall.arguments.filename;
          if (filename === "active_file") {
            // Default to original active file behavior
            fileContent = await this.readActiveFile();
          } else {
            fileContent = await this.findAndReadFile(filename);
          }

          const tool_content = {
            name: toolCall.name,
            params: toolCall?.arguments,
            content: fileContent.length === 0 ? "File is empty" : fileContent,
          };

          // Add tool response with proper source information
          this.messages.push({
            role: "tool",
            content: JSON.stringify({
              ...tool_content,
            }),
          });

          await this.processResponse(webviewView);
        }
      } catch (e) {
        console.log("Error executing tool:", e);
        this.messages.push({
          role: "tool",
          content: JSON.stringify({
            name: toolCall.name,
            error: `File read failed`,
          }),
        });
      }
    }
  }

  private async handleToolCall(
    toolCall: any,
  ) {
    // console.log("Tool call detected:", toolCall);

    if (toolCall.name === "write_to_current_file") {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        console.log(toolCall);
        const position = new vscode.Position(0, 0); // Insert at the beginning of the file

        editor.edit((editBuilder) => {
          editBuilder.insert(position, toolCall.params.content ?? "blah blah");
        });
      } else {
        vscode.window.showErrorMessage("No active editor found.");
      }
    }
  }

  private async findAndReadFile(fileName: string): Promise<string> {
    const files = await vscode.workspace.findFiles(
      `**/${fileName}`,
      "**/node_modules/**"
    );

    if (files.length > 0) {
      const fileUri = files[0];
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const contentString = Buffer.from(fileContent).toString("utf8");

      // vscode.window.showInformationMessage(`File found: ${fileUri.fsPath}`);
      console.log("File Contents:", contentString);

      return contentString;
    } else {
      // vscode.window.showWarningMessage(`File not found: ${fileName}`);
      return "File not found";
    }
  }

  private async readActiveFile(): Promise<string> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      return editor.document.getText();
    }
    return "No active file open.";
  }
}

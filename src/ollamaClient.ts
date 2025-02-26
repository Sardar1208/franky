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
    You have the following tools at your disposal that can be used only if it is required.

    ------
    AVAILABLE TOOLS: 
    1) read_file: Reads the requested file(s) and returns its contents.
    -> OUTPUT FORMAT
    <Explain what you are about to do> <what are you going to do with the result> <TOOL_CALL>{"name": "<tool name>", "params": "<tool parameters>"}<TOOL_CALL_END>
    -> EXAMPLE
    'Let me read the contents of the file. So that I will be able to summarise it <TOOL_CALL>{"name": "read_file", "params": "{}"}<TOOL_CALL_END>'
    -> TOOL PARAMETERS
    file_name: Reads a specific file. Value should be the name of the file.
    read_all_files: boolean value that determines weather to read all avaialble files or not.
    -> PARAMETERS RULES
    Only one parameter can be used, decide percisely on basis of what user wants.
    If no parameters are passed, it will return the contents of the currently open file.
    Do not call the read_all_files if not necessary. As it is a very heavy operation
    -> EXMAPLE 
    "params": "{"file_name": "index.html"}" -> To read a specific file
    "params": "{"all_files": "true"}" -> To read all available files
    "params": "{}" -> To read the current open file

    2) write_to_current_file: Writes the data to the current file.
    -> OUTPUT FORMAT
    {tell user what you are about to do} <TOOL_CALL>{"name": "<tool name>", "params": {"content": "<file content to write>"}}<TOOL_CALL_END> {Ending remarks if requied}
    -> NOTE: The "<file content to write>" should be in proper json parsable format

    ------
    STRICT RULES:
    1) You can only use the above tools. Nothing else!
    2) Do not call the tool unnecessarily, if you already have its context. 

    ------
    Example 1: 'read the contents of this file'
    -> Here you need something from the user i.e. the file contents. So you will look at the available tools and call the appropriate one.
    -> Since user did not provide the file name or context, it means he must be referring to the current open file.
    -> Also, you cant return your final response untill you get the contents from the tool. So there should be nothing at the end of a tool call
    -> Expected response : 'Sure. I would need to read the file first. <TOOL_CALL>{"name": "read_file", "params": "{}"}<TOOL_CALL_END>'

    Example 2: 'write a js function to add two numbers to current file'
    -> Here you need to write content to current file. So you will look at the available tools and call the appropriate one.
    -> This request does not require any more data from the user, so just give your response freely but within the output formats of the tool
    -> Expected response : 'Sure. Here is javaScript function that adds two numbers. <TOOL_CALL>{"name": "write_to_current_file", "params": {"content": "function add(a, b) {\\n  return a + b;\\n}"}}<TOOL_CALL_END>'
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
        model: "llama3.1",
        stream: true,
        messages: this.messages,
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
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Split the buffer into lines (each line is a JSON object)
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      // Process each line (JSON object)
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const content = json.message.content; // Extract the actual content

          // Append the content to the buffer for word-by-word processing
          buffer += content;
        } catch (error) {
          console.error("Error parsing JSON chunk:", error);
          continue;
        }
      }

      // Process buffer word by word
      let spaceIndex;
      while ((spaceIndex = buffer.indexOf(" ")) !== -1) {
        const word = buffer.substring(0, spaceIndex + 1); // Include the space
        buffer = buffer.substring(spaceIndex + 1); // Remove the processed word from buffer

        if (isToolCall) {
          // If we're inside a tool call, buffer everything until <TOOL_CALL_END>
          toolCallBuffer += word;
          if (word.includes("<TOOL_CALL_END>")) {
            // Tool call ended, process the tool call
            console.log(
              "final tool data: ",
              toolCallBuffer.replace("<TOOL_CALL_END>", "").trim()
            );
            try {
              const toolJson = JSON.parse(
                toolCallBuffer.replace("<TOOL_CALL_END>", "").trim()
              );
              isToolCall = false;
              toolCallBuffer = "";
              await this.handleToolCall(
                toolJson,
                webviewView,
                assistantResponse
              );
              return;
            } catch (e) {
              console.error("Error parsing tool JSON:", e);
            }
          }
        } else {
          // Check if the word is <TOOL_CALL>
          if (word.includes("<TOOL_CALL>")) {
            isToolCall = true;
            toolCallBuffer = word.split("<TOOL_CALL>")[1] ?? "";
            toolCallBuffer = toolCallBuffer.trim();
          } else {
            // Stream the word to the UI
            this.sendMessage(webviewView, MessageType.TEXT, word);
            assistantResponse += word;
          }
        }
      }
    }

    // Handle any remaining data in the buffer
    if (buffer.length > 0) {
      if (isToolCall) {
        toolCallBuffer += buffer;
        if (toolCallBuffer.includes("<TOOL_CALL_END>")) {
          try {
            const toolJson = JSON.parse(
              toolCallBuffer.replace("<TOOL_CALL_END>", "").trim()
            );
            isToolCall = false;
            toolCallBuffer = "";
            await this.handleToolCall(toolJson, webviewView, assistantResponse);
            return;
          } catch (e) {
            console.error("Error parsing tool JSON:", e);
          }
        }
      } else {
        this.sendMessage(webviewView, MessageType.TEXT, buffer);
        assistantResponse += buffer;
      }
    }

    // Store assistant response in message history if it's not a tool call
    if (!isToolCall) {
      this.messages.push({ role: "assistant", content: assistantResponse });
    }
  }

  private async handleToolCall(
    toolCall: any,
    webviewView: any,
    assistantResponse: string
  ) {
    // console.log("Tool call detected:", toolCall);

    if (toolCall.name === "read_file") {
      this.sendMessage(
        webviewView,
        MessageType.TOOL_USE,
        "reading file content..."
      );
      try {
        let fileContent;

        // New conditional logic for file handling
        if (toolCall.params?.file_name) {
          // Handle specific file request
          fileContent = await this.findAndReadFile(toolCall.params.file_name);
        } else {
          // Default to original active file behavior
          fileContent = await this.readActiveFile();
        }

        const tool_content = {
          name: toolCall.name,
          params: toolCall.params,
          content: fileContent.length === 0 ? "File is empty" : fileContent,
        };

        this.messages.push({ role: "assistant", content: assistantResponse });

        // Add tool response with proper source information
        this.messages.push({
          role: "tool",
          content: JSON.stringify({
            ...tool_content,
          }),
        });

        await this.processResponse(webviewView);
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
    } else if (toolCall.name === "write_to_current_file") {
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

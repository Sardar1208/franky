import * as vscode from "vscode";
import { Messages, MessageType } from "./types/common_types";
import { sendMessage } from "./UtilityFunctions";
import { handleToolCall } from "./tools/ReadFile";
import { toolDefinations } from "./tools/ToolDefinations";
import { WTF_tool_call } from "./tools/WriteToFile";

export class ChatManager {
  private messages: Messages = [];

  constructor() {
    this.messages.push({
      role: "system",
      content: `You are Franky, an extremely skilled and friendly software developer assistant who exisits inside a code editor. So all your questions will be in the context of the code editor, its files, read, write ,edit etc. 

    1) You can only use the available tools. Nothing else!
    2) Do not call the tool unnecessarily, if you already have its context. 
    `,
    });
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
        tools: toolDefinations,
      }),
    });

    if (!response.body) {
      console.error("No response body received.");
      sendMessage(webviewView, MessageType.ERROR, "System error");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ""; // Buffer for incoming data
    let assistantResponse = "";
    let isToolCall = false;

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

              sendMessage(webviewView, MessageType.TEXT, word);
              assistantResponse += word;
            }
            sendMessage(webviewView, MessageType.TEXT, buffer);
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
      await handleToolCall(webviewView, toolCall, this.messages, () => {
        this.processResponse(webviewView);
      });
    }
    if (toolCall.name === "write_to_file") {
      await WTF_tool_call(webviewView, toolCall, this.messages, () => {});
    }
  }
}

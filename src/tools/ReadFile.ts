import * as vscode from "vscode";
import { Messages, MessageType } from "../types/common_types";
import { sendMessage } from "../UtilityFunctions";

const read_defination = {
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
};

async function handleToolCall(
  webviewView: any,
  toolCall: any,
  messages: Messages,
  callback: () => void
) {
  try {
    sendMessage(webviewView, MessageType.TOOL_USE, "reading file content...");

    let fileContent;

    if (toolCall?.arguments?.filename) {
      const filename = toolCall.arguments.filename;
      if (filename === "active_file") {
        // Default to original active file behavior
        fileContent = await readActiveFile();
      } else {
        fileContent = await findAndReadFile(filename);
      }

      const tool_content = {
        name: toolCall.name,
        params: toolCall?.arguments,
        content: fileContent.length === 0 ? "File is empty" : fileContent,
      };

      // Add tool response with proper source information
      messages.push({
        role: "tool",
        content: JSON.stringify({
          ...tool_content,
        }),
      });

      await callback();
    }
  } catch (e) {
    console.log("Error executing tool:", e);
    messages.push({
      role: "tool",
      content: JSON.stringify({
        name: toolCall.name,
        error: `File read failed`,
      }),
    });
  }
}

async function findAndReadFile(fileName: string): Promise<string> {
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

async function readActiveFile(): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return editor.document.getText();
  }
  return "No active file open.";
}


export {
    read_defination,
    handleToolCall,
};

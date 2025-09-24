import * as vscode from "vscode";
import { Messages, MessageType } from "../types/common_types";
import { sendMessage } from "../UtilityFunctions";
import { setActiveApproval } from "../state/Approval";

const write_to_file_defination = {
  type: "function",
  function: {
    name: "write_to_file",
    description: "Write contents to a file at a particular position",
    parameters: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description:
            "The name of the file to write in e.g. index.ts . return 'active_file' if  need to write in the current active file.",
        },
        content: {
          type: "string",
          description: "The content that has to be written to the file",
        },
        position: {
          type: "object",
          description:
            "The postion in x and y where the text has to be inserted. Ex: {x: 20, y: 10}",
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
    sendMessage(
      webviewView,
      MessageType.TOOL_USE,
      `Updating ${toolCall.arguments.filename}...`
    );

    if (toolCall?.arguments?.filename) {
      const filename = toolCall.arguments.filename;
      if (filename === "active_file") {
        // Default to original active file behavior
        await writeToActiveFile(
          toolCall.arguments.content,
          toolCall.arguments.position
        );
      } else {
        await findAndWriteToFile(
          filename,
          toolCall.arguments.content,
          toolCall.arguments.position
        );
      }

      const tool_content = {
        name: toolCall.name,
        params: toolCall?.arguments,
        content: `Updated ${toolCall.arguments.filename}`,
      };

      // Add tool response with proper source information
      messages.push({
        role: "tool",
        content: JSON.stringify({
          ...tool_content,
        }),
      });

      callback();
    }
  } catch (e) {
    console.log("Error executing tool:", e);
    messages.push({
      role: "tool",
      content: JSON.stringify({
        name: toolCall.name,
        error: `Write to file failed`,
      }),
    });
  }
}

async function findAndWriteToFile(
  fileName: string,
  content: string,
  positionArg: { x: number; y: number }
) {
  const files = await vscode.workspace.findFiles(
    `**/${fileName}`,
    "**/node_modules/**"
  );

  if (files.length === 0) {
    return "File not found";
  }

  const fileUri = files[0];
  const document = await vscode.workspace.openTextDocument(fileUri);
  const editor = await vscode.window.showTextDocument(document);

  await write(positionArg, editor, content);
}

async function writeToActiveFile(
  content: string,
  positionArg: { x: number; y: number }
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return;
  }

  await write(positionArg, editor, content);
}

async function write(
  positionArg: { x: number; y: number },
  editor: vscode.TextEditor,
  content: string
) {
  // Default position is (0,0) unless provided
  const line = positionArg?.y ?? 0;
  const char = positionArg?.x ?? 0;
  const position = new vscode.Position(line, char);

  await editor.edit((editBuilder) => {
    editBuilder.insert(position, content ?? "blah blah");
  });

  // 3. Define the inserted range
  const insertedRange = new vscode.Range(
    position,
    position.translate(0, content.length)
  );

  // 4. Highlight the inserted text
  const highlight = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 215, 0, 0.3)", // light yellow
    border: "1px solid orange",
  });
  editor.setDecorations(highlight, [insertedRange]);

  // 5. Provide CodeLens above inserted text
  const codeLensProvider: vscode.CodeLensProvider = {
    provideCodeLenses(doc) {
      return [
        new vscode.CodeLens(insertedRange, {
          title: "✅ Accept",
          command: "extension.acceptChange",
        }),
        new vscode.CodeLens(insertedRange, {
          title: "❌ Decline",
          command: "extension.declineChange",
        }),
      ];
    },
  };

  // 6. Register the CodeLens provider (scoped to this file’s language)
  const providerDisposable = vscode.languages.registerCodeLensProvider(
    { scheme: "file", language: editor.document.languageId },
    codeLensProvider
  );

  // 5. Save approval state so the global command handlers can use it
  setActiveApproval({
    editor,
    range: insertedRange,
    highlight,
    providerDisposable,
  });
}

export { write_to_file_defination, handleToolCall as WTF_tool_call };

export type Messages = Array<{
  role: "user" | "system" | "assistant" | "tool";
  content: string;
  name?: string;
}>;

export const MessageType = {
  TEXT: "text",
  TOOL_USE: "tool_use",
  ERROR: "error",
};

import * as fs from "fs";
import * as path from "path";

export function getWebviewContent(): string {

  // Construct absolute paths relative to the project root
  const htmlPath = path.resolve(__dirname, "../src/chat_webview/index.html");
  const cssPath = path.resolve(__dirname, "../src/chat_webview/index.css");
  const jsPath = path.resolve(__dirname, "../src/chat_webview/index.js");

  // Read files
  let html = fs.readFileSync(htmlPath, "utf8");
  const css = fs.readFileSync(cssPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");

  // Inject CSS and JS into HTML
  html = html
    .replace(
      '<link rel="stylesheet" href="style.css">',
      `<style>${css}</style>`
    )
    .replace('<script src="script.js"></script>', `<script>${js}</script>`);

  return html;
}

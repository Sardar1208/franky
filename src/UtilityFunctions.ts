function sendMessage(webviewView: any, type: string, data: string) {
  webviewView.webview.postMessage({ type: type, text: data });
}

export {
    sendMessage,
};

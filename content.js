chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageText") {
    const text = document.body.innerText;
    sendResponse({ text });
  }
});

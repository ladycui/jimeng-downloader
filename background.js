chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "download") {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      }
      // After the download starts, the object URL is no longer needed.
      // The sendResponse callback ensures this runs after the message is handled.
      sendResponse({status: "download started"});
    });
    return true; // Indicates that the response is sent asynchronously
  }
});

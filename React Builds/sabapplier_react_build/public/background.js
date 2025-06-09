// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener((tabId) => {
  chrome.sidePanel.setOptions({
    tabId,
    path: "index.html",
    enabled: true,
  });
});

// Background Service Worker for DevDeck Chrome Extension (Manifest V3)

// Clicking the extension icon in the toolbar opens DevDeck in a new tab
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'index.html' });
});

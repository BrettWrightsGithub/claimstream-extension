// Background service worker for ClaimStream extension
console.log('ClaimStream background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('ClaimStream extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set up initial configuration
    chrome.storage.local.set({
      extensionVersion: '1.0.0',
      installDate: new Date().toISOString(),
      analysisCount: 0
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'incrementAnalysisCount':
      incrementAnalysisCount();
      break;
    case 'getAnalysisCount':
      getAnalysisCount().then(count => sendResponse({ count }));
      return true; // Keep message channel open
    default:
      console.log('Unknown action:', request.action);
  }
});

async function incrementAnalysisCount() {
  try {
    const result = await chrome.storage.local.get(['analysisCount']);
    const newCount = (result.analysisCount || 0) + 1;
    await chrome.storage.local.set({ analysisCount: newCount });
    console.log('Analysis count updated to:', newCount);
  } catch (error) {
    console.error('Error updating analysis count:', error);
  }
}

async function getAnalysisCount() {
  try {
    const result = await chrome.storage.local.get(['analysisCount']);
    return result.analysisCount || 0;
  } catch (error) {
    console.error('Error getting analysis count:', error);
    return 0;
  }
}

// Handle tab updates to detect YouTube navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    console.log('YouTube video page loaded:', tab.url);
    // Could trigger content script injection or other initialization here
  }
});

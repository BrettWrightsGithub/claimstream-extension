// Content script for ClaimStream extension
console.log('ClaimStream content script loaded on:', window.location.href);
console.log('Document ready state:', document.readyState);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    console.log('Received getVideoInfo request:', request);
    
    try {
      // Get video information from the page
      const videoInfo = getVideoInfo();
      
      // Combine with request data
      const videoData = {
        videoId: request.videoId,
        videoUrl: request.videoUrl,
        title: videoInfo.title,
        channel: videoInfo.channel,
        views: videoInfo.views,
        thumbnail: getThumbnailUrl(request.videoId),
        extractedAt: new Date().toISOString()
      };
      
      console.log('Sending video data:', videoData);
      sendResponse({ success: true, data: videoData });
    } catch (error) {
      console.error('Error getting video info:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open for async response
  }
  
  // Legacy support for old analyzeVideo action
  if (request.action === 'analyzeVideo') {
    console.log('Received legacy analyze request:', request);
    
    // Get video information from the page
    const videoInfo = getVideoInfo();
    
    // For now, just simulate the analysis
    simulateAnalysis(request.videoId, request.videoUrl, videoInfo)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('Analysis error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
});

function getVideoInfo() {
  try {
    // Extract video title
    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string');
    const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
    
    // Extract channel name
    const channelElement = document.querySelector('#channel-name a');
    const channel = channelElement ? channelElement.textContent.trim() : 'Unknown Channel';
    
    // Extract view count and other stats
    const viewsElement = document.querySelector('#info-strings yt-formatted-string');
    const views = viewsElement ? viewsElement.textContent.trim() : 'Unknown Views';
    
    return {
      title,
      channel,
      views,
      url: window.location.href
    };
  } catch (error) {
    console.error('Error extracting video info:', error);
    return {
      title: 'Unknown Title',
      channel: 'Unknown Channel',
      views: 'Unknown Views',
      url: window.location.href
    };
  }
}

async function simulateAnalysis(videoId, videoUrl, videoInfo) {
  console.log('Starting analysis simulation for:', videoId);
  console.log('Video info:', videoInfo);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock analysis result
  return {
    videoId,
    videoUrl,
    videoInfo,
    analysisId: 'mock-' + Date.now(),
    status: 'processing',
    message: 'Analysis initiated successfully'
  };
}

function getThumbnailUrl(videoId) {
  // Generate YouTube thumbnail URL
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Add visual indicator when extension is active
function addExtensionIndicator() {
  // Remove any existing indicator first
  const existingIndicator = document.getElementById('claimstream-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  console.log('Creating extension indicator...');
  
  const indicator = document.createElement('div');
  indicator.id = 'claimstream-indicator';
  indicator.innerHTML = '🔍 ClaimStream Active';
  indicator.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    right: 10px !important;
    background: #4CAF50 !important;
    color: white !important;
    padding: 8px 12px !important;
    border-radius: 4px !important;
    font-size: 12px !important;
    z-index: 999999 !important;
    font-family: Arial, sans-serif !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
    pointer-events: none !important;
  `;
  
  // Wait for body to be available
  if (document.body) {
    document.body.appendChild(indicator);
    console.log('Indicator added to body');
  } else {
    console.log('Body not ready, waiting...');
    setTimeout(() => {
      if (document.body) {
        document.body.appendChild(indicator);
        console.log('Indicator added to body (delayed)');
      } else {
        console.log('Body still not available');
      }
    }, 100);
  }
  
  // Remove indicator after 3 seconds
  setTimeout(() => {
    const el = document.getElementById('claimstream-indicator');
    if (el) {
      el.remove();
      console.log('Indicator removed');
    }
  }, 3000);
}

// Show indicator when content script loads
function initializeExtension() {
  console.log('Initializing ClaimStream extension...');
  console.log('Current URL:', window.location.href);
  
  const isWatchPage = window.location.href.includes('youtube.com/watch');
  const isShortsPage = window.location.href.includes('youtube.com/shorts');
  const isYouTubeVideo = isWatchPage || isShortsPage;
  
  console.log('Is YouTube watch page:', isWatchPage);
  console.log('Is YouTube shorts page:', isShortsPage);
  console.log('Is YouTube video page:', isYouTubeVideo);
  
  if (isYouTubeVideo) {
    console.log('Adding extension indicator...');
    addExtensionIndicator();
  } else {
    console.log('Not on YouTube video/shorts page, skipping indicator');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // DOM is already ready
  initializeExtension();
}

// Also listen for navigation changes (YouTube is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed to:', url);
    setTimeout(initializeExtension, 1000); // Wait for page to load
  }
}).observe(document, { subtree: true, childList: true });

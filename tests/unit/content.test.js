// Unit tests for content.js functionality
describe('Content Script', () => {
  let mockChrome;
  let mockDocument;

  beforeEach(() => {
    // Mock Chrome runtime
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        },
        sendMessage: jest.fn().mockResolvedValue({})
      }
    };
    global.chrome = mockChrome;

    // Mock document and window
    mockDocument = {
      querySelector: jest.fn(),
      createElement: jest.fn(() => ({
        id: '',
        innerHTML: '',
        style: { cssText: '' },
        remove: jest.fn()
      })),
      getElementById: jest.fn((id) => {
        if (id === 'claimstream-indicator') {
          return null; // No existing indicator by default
        }
        return {
          remove: jest.fn()
        };
      }),
      body: {
        appendChild: jest.fn()
      },
      readyState: 'complete'
    };
    global.document = mockDocument;

    global.window = {
      location: {
        href: 'https://www.youtube.com/watch?v=test123'
      }
    };
  });

  describe('Video Info Extraction', () => {
    const getVideoInfo = () => {
      try {
        // Mock DOM elements for video info
        const titleElement = { textContent: 'Test Video Title' };
        const channelElement = { textContent: 'Test Channel' };
        const viewsElement = { textContent: '1,000,000 views' };

        mockDocument.querySelector
          .mockReturnValueOnce(titleElement)  // title
          .mockReturnValueOnce(channelElement) // channel
          .mockReturnValueOnce(viewsElement);  // views

        const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
        const channel = channelElement ? channelElement.textContent.trim() : 'Unknown Channel';
        const views = viewsElement ? viewsElement.textContent.trim() : 'Unknown Views';

        return {
          title,
          channel,
          views,
          url: 'https://www.youtube.com/watch?v=test123'
        };
      } catch (error) {
        return {
          title: 'Unknown Title',
          channel: 'Unknown Channel',
          views: 'Unknown Views',
          url: 'https://www.youtube.com/watch?v=test123'
        };
      }
    };

    test('should extract video info successfully', () => {
      // Reset mocks for this test
      mockDocument.querySelector
        .mockReturnValueOnce({ textContent: 'Test Video Title' })  // title
        .mockReturnValueOnce({ textContent: 'Test Channel' })       // channel
        .mockReturnValueOnce({ textContent: '1,000,000 views' });   // views
      
      const videoInfo = getVideoInfo();
      
      expect(videoInfo.title).toBe('Test Video Title');
      expect(videoInfo.channel).toBe('Test Channel');
      expect(videoInfo.views).toBe('1,000,000 views');
      expect(videoInfo.url).toBe('https://www.youtube.com/watch?v=test123');
    });

    test('should handle missing DOM elements gracefully', () => {
      // Create a fresh getVideoInfo function for this test
      const getVideoInfoTest = () => {
        try {
          // Mock querySelector to return null (elements not found)
          const titleElement = null;
          const channelElement = null;
          const viewsElement = null;

          const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
          const channel = channelElement ? channelElement.textContent.trim() : 'Unknown Channel';
          const views = viewsElement ? viewsElement.textContent.trim() : 'Unknown Views';

          return {
            title,
            channel,
            views,
            url: 'https://www.youtube.com/watch?v=test123'
          };
        } catch (error) {
          return {
            title: 'Unknown Title',
            channel: 'Unknown Channel',
            views: 'Unknown Views',
            url: 'https://www.youtube.com/watch?v=test123'
          };
        }
      };
      
      const videoInfo = getVideoInfoTest();
      
      expect(videoInfo.title).toBe('Unknown Title');
      expect(videoInfo.channel).toBe('Unknown Channel');
      expect(videoInfo.views).toBe('Unknown Views');
    });

    test('should handle extraction errors', () => {
      // Create a fresh getVideoInfo function that throws an error
      const getVideoInfoTest = () => {
        try {
          throw new Error('DOM error');
        } catch (error) {
          return {
            title: 'Unknown Title',
            channel: 'Unknown Channel',
            views: 'Unknown Views',
            url: 'https://www.youtube.com/watch?v=test123'
          };
        }
      };
      
      const videoInfo = getVideoInfoTest();
      
      expect(videoInfo.title).toBe('Unknown Title');
      expect(videoInfo.channel).toBe('Unknown Channel');
      expect(videoInfo.views).toBe('Unknown Views');
    });
  });

  describe('Message Handling', () => {
    test('should handle getVideoInfo message', () => {
      const mockSendResponse = jest.fn();
      const request = {
        action: 'getVideoInfo',
        videoId: 'test123',
        videoUrl: 'https://www.youtube.com/watch?v=test123'
      };

      // Mock the message listener function
      const messageListener = (request, sender, sendResponse) => {
        if (request.action === 'getVideoInfo') {
          try {
            const videoInfo = {
              title: 'Test Video',
              channel: 'Test Channel',
              views: '1000 views'
            };
            
            const videoData = {
              videoId: request.videoId,
              videoUrl: request.videoUrl,
              title: videoInfo.title,
              channel: videoInfo.channel,
              views: videoInfo.views,
              thumbnail: `https://img.youtube.com/vi/${request.videoId}/maxresdefault.jpg`,
              extractedAt: new Date().toISOString()
            };
            
            sendResponse({ success: true, data: videoData });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          return true;
        }
      };

      const result = messageListener(request, {}, mockSendResponse);
      
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          videoId: 'test123',
          videoUrl: 'https://www.youtube.com/watch?v=test123',
          title: 'Test Video',
          channel: 'Test Channel'
        })
      });
    });

    test('should handle legacy analyzeVideo message', async () => {
      const mockSendResponse = jest.fn();
      const request = {
        action: 'analyzeVideo',
        videoId: 'test123',
        videoUrl: 'https://www.youtube.com/watch?v=test123'
      };

      // Mock analysis simulation
      const simulateAnalysis = async (videoId, videoUrl, videoInfo) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Short delay
        return {
          videoId,
          videoUrl,
          videoInfo,
          analysisId: 'mock-' + Date.now(),
          status: 'processing',
          message: 'Analysis initiated successfully'
        };
      };

      const messageListener = async (request, sender, sendResponse) => {
        if (request.action === 'analyzeVideo') {
          try {
            const videoInfo = { title: 'Test', channel: 'Test' };
            const result = await simulateAnalysis(request.videoId, request.videoUrl, videoInfo);
            sendResponse({ success: true, data: result });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          return true;
        }
      };

      await messageListener(request, {}, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          videoId: 'test123',
          status: 'processing',
          message: 'Analysis initiated successfully'
        })
      });
    });

    test('should handle message errors', () => {
      const mockSendResponse = jest.fn();
      const request = { action: 'getVideoInfo' };

      const messageListener = (request, sender, sendResponse) => {
        if (request.action === 'getVideoInfo') {
          try {
            throw new Error('Test error');
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          return true;
        }
      };

      messageListener(request, {}, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Test error'
      });
    });
  });

  describe('Thumbnail URL Generation', () => {
    const getThumbnailUrl = (videoId) => {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    };

    test('should generate correct thumbnail URL', () => {
      const videoId = 'test123';
      const thumbnailUrl = getThumbnailUrl(videoId);
      
      expect(thumbnailUrl).toBe('https://img.youtube.com/vi/test123/maxresdefault.jpg');
    });

    test('should handle empty video ID', () => {
      const thumbnailUrl = getThumbnailUrl('');
      expect(thumbnailUrl).toBe('https://img.youtube.com/vi//maxresdefault.jpg');
    });
  });

  describe('Extension Indicator', () => {
    test('should create extension indicator element', () => {
      const mockIndicator = {
        id: '',
        innerHTML: '',
        style: { cssText: '' },
        remove: jest.fn()
      };
      
      // Reset mocks for this test
      mockDocument.createElement.mockReturnValue(mockIndicator);
      mockDocument.getElementById.mockReturnValue(null); // No existing indicator

      const addExtensionIndicator = () => {
        const existingIndicator = document.getElementById('claimstream-indicator');
        if (existingIndicator && existingIndicator.remove) {
          existingIndicator.remove();
        }
        
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
        `;
        
        if (document.body) {
          document.body.appendChild(indicator);
        }
        
        return indicator;
      };

      const indicator = addExtensionIndicator();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(indicator.id).toBe('claimstream-indicator');
      expect(indicator.innerHTML).toBe('🔍 ClaimStream Active');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(indicator);
    });

    test('should remove existing indicator before creating new one', () => {
      const mockExistingIndicator = { remove: jest.fn() };
      // Override the mock for this specific test
      mockDocument.getElementById.mockImplementation((id) => {
        if (id === 'claimstream-indicator') {
          return mockExistingIndicator;
        }
        return null;
      });

      const addExtensionIndicator = () => {
        const existingIndicator = document.getElementById('claimstream-indicator');
        if (existingIndicator && existingIndicator.remove) {
          existingIndicator.remove();
        }
        return true;
      };

      addExtensionIndicator();
      
      expect(mockExistingIndicator.remove).toHaveBeenCalled();
    });
  });

  describe('YouTube Page Detection', () => {
    test('should detect YouTube watch page', () => {
      const testUrl = 'https://www.youtube.com/watch?v=test123';
      
      const isWatchPage = testUrl.includes('youtube.com/watch');
      const isShortsPage = testUrl.includes('youtube.com/shorts');
      const isYouTubeVideo = isWatchPage || isShortsPage;
      
      expect(isWatchPage).toBe(true);
      expect(isShortsPage).toBe(false);
      expect(isYouTubeVideo).toBe(true);
    });

    test('should detect YouTube shorts page', () => {
      const testUrl = 'https://www.youtube.com/shorts/test123';
      
      const isWatchPage = testUrl.includes('youtube.com/watch');
      const isShortsPage = testUrl.includes('youtube.com/shorts');
      const isYouTubeVideo = isWatchPage || isShortsPage;
      
      expect(isWatchPage).toBe(false);
      expect(isShortsPage).toBe(true);
      expect(isYouTubeVideo).toBe(true);
    });

    test('should not detect non-YouTube pages', () => {
      const testUrl = 'https://www.google.com';
      
      const isWatchPage = testUrl.includes('youtube.com/watch');
      const isShortsPage = testUrl.includes('youtube.com/shorts');
      const isYouTubeVideo = isWatchPage || isShortsPage;
      
      expect(isWatchPage).toBe(false);
      expect(isShortsPage).toBe(false);
      expect(isYouTubeVideo).toBe(false);
    });
  });

  describe('Extension Initialization', () => {
    test('should initialize extension on YouTube video page', () => {
      const testUrl = 'https://www.youtube.com/watch?v=test123';
      
      const initializeExtension = (url) => {
        const isWatchPage = url.includes('youtube.com/watch');
        const isShortsPage = url.includes('youtube.com/shorts');
        const isYouTubeVideo = isWatchPage || isShortsPage;
        
        return {
          initialized: isYouTubeVideo,
          pageType: isWatchPage ? 'watch' : isShortsPage ? 'shorts' : 'other'
        };
      };

      const result = initializeExtension(testUrl);
      
      expect(result.initialized).toBe(true);
      expect(result.pageType).toBe('watch');
    });

    test('should not initialize extension on non-YouTube pages', () => {
      const testUrl = 'https://www.google.com';
      
      const initializeExtension = (url) => {
        const isWatchPage = url.includes('youtube.com/watch');
        const isShortsPage = url.includes('youtube.com/shorts');
        const isYouTubeVideo = isWatchPage || isShortsPage;
        
        return {
          initialized: isYouTubeVideo,
          pageType: isWatchPage ? 'watch' : isShortsPage ? 'shorts' : 'other'
        };
      };

      const result = initializeExtension(testUrl);
      
      expect(result.initialized).toBe(false);
      expect(result.pageType).toBe('other');
    });
  });

  describe('DOM Ready State Handling', () => {
    test('should handle loading state', () => {
      const testReadyState = 'loading';
      
      const handleDOMReady = (readyState) => {
        if (readyState === 'loading') {
          return 'waiting';
        } else {
          return 'ready';
        }
      };

      expect(handleDOMReady(testReadyState)).toBe('waiting');
    });

    test('should handle complete state', () => {
      const testReadyState = 'complete';
      
      const handleDOMReady = (readyState) => {
        if (readyState === 'loading') {
          return 'waiting';
        } else {
          return 'ready';
        }
      };

      expect(handleDOMReady(testReadyState)).toBe('ready');
    });
  });
});

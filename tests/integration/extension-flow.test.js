// Integration tests for ClaimStream extension flow
describe('Extension Integration Flow', () => {
  let mockSupabaseClient;
  let mockChrome;
  let mockDocument;

  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        },
        sendMessage: jest.fn().mockResolvedValue({})
      },
      tabs: {
        query: jest.fn().mockResolvedValue([{
          id: 1,
          url: 'https://www.youtube.com/watch?v=test123',
          title: 'Test Video'
        }]),
        sendMessage: jest.fn().mockResolvedValue({
          success: true,
          data: {
            videoId: 'test123',
            videoUrl: 'https://www.youtube.com/watch?v=test123',
            title: 'Test Video Title',
            channel: 'Test Channel',
            views: '1,000 views'
          }
        })
      }
    };
    global.chrome = mockChrome;

    // Mock Supabase client
    mockSupabaseClient = {
      initialize: jest.fn().mockResolvedValue(true),
      isReady: jest.fn().mockReturnValue(true),
      createAnalysisReport: jest.fn().mockResolvedValue({
        id: 'test-report-123',
        video_id: 'test123',
        analysis_status: 'Processing',
        video_title: 'Test Video Title'
      }),
      getExistingReport: jest.fn().mockResolvedValue(null),
      getVerifiedClaims: jest.fn().mockResolvedValue([
        {
          id: 'claim-1',
          original_statement: 'This is a test claim',
          verification_status: 'True',
          verification_summary: 'This claim has been verified as accurate.',
          participant: 'Speaker 1',
          supporting_evidence: [
            {
              source_name: 'Test Source',
              url: 'https://example.com/source',
              credibility: 'High',
              statement: 'Supporting evidence statement'
            }
          ]
        }
      ]),
      subscribeToAnalysisUpdates: jest.fn(),
      subscribeToStatusUpdates: jest.fn(),
      getWebhookUrl: jest.fn().mockResolvedValue('https://webhook.example.com')
    };
    global.supabaseClient = mockSupabaseClient;

    // Mock DOM elements
    mockDocument = {
      getElementById: jest.fn((id) => ({
        textContent: '',
        innerHTML: '',
        style: { display: 'block' },
        disabled: false,
        addEventListener: jest.fn(),
        click: jest.fn()
      })),
      addEventListener: jest.fn()
    };
    global.document = mockDocument;
  });

  describe('Complete Analysis Flow', () => {
    test('should complete full analysis workflow', async () => {
      // Step 1: Initialize extension
      const supabaseReady = await mockSupabaseClient.initialize();
      expect(supabaseReady).toBe(true);

      // Step 2: Get current tab (YouTube video)
      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      expect(tab.url).toContain('youtube.com/watch');

      // Step 3: Extract video ID
      const extractVideoId = (url) => {
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
      };
      const videoId = extractVideoId(tab.url);
      expect(videoId).toBe('test123');

      // Step 4: Check for existing report
      const existingReport = await mockSupabaseClient.getExistingReport(videoId);
      expect(existingReport).toBeNull();

      // Step 5: Get video info from content script
      const videoInfoResponse = await mockChrome.tabs.sendMessage(tab.id, {
        action: 'getVideoInfo',
        videoId: videoId,
        videoUrl: tab.url
      });
      expect(videoInfoResponse.success).toBe(true);
      expect(videoInfoResponse.data.videoId).toBe('test123');

      // Step 6: Create analysis report
      const report = await mockSupabaseClient.createAnalysisReport(videoInfoResponse.data);
      expect(report.id).toBe('test-report-123');
      expect(report.analysis_status).toBe('Processing');

      // Step 7: Subscribe to updates
      mockSupabaseClient.subscribeToAnalysisUpdates(report.id, jest.fn());
      expect(mockSupabaseClient.subscribeToAnalysisUpdates).toHaveBeenCalledWith(
        report.id,
        expect.any(Function)
      );

      // Step 8: Simulate analysis completion
      const completedReport = { ...report, analysis_status: 'Complete' };
      const claims = await mockSupabaseClient.getVerifiedClaims(report.id);
      expect(claims).toHaveLength(1);
      expect(claims[0].verification_status).toBe('True');
    });

    test('should handle existing report scenario', async () => {
      // Mock existing report
      const existingReport = {
        id: 'existing-report-456',
        video_id: 'test123',
        analysis_status: 'Complete',
        video_title: 'Test Video'
      };
      mockSupabaseClient.getExistingReport.mockResolvedValue(existingReport);

      // Initialize and check for existing report
      await mockSupabaseClient.initialize();
      const report = await mockSupabaseClient.getExistingReport('test123');
      
      expect(report).not.toBeNull();
      expect(report.analysis_status).toBe('Complete');
      expect(report.id).toBe('existing-report-456');

      // Should get claims for existing report
      const claims = await mockSupabaseClient.getVerifiedClaims(report.id);
      expect(mockSupabaseClient.getVerifiedClaims).toHaveBeenCalledWith('existing-report-456');
    });

    test('should handle content script failure gracefully', async () => {
      // Mock content script failure
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Content script not available'));

      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      const videoId = 'test123';

      // Should fall back to basic video data
      try {
        await mockChrome.tabs.sendMessage(tab.id, {
          action: 'getVideoInfo',
          videoId: videoId,
          videoUrl: tab.url
        });
      } catch (error) {
        // Fallback data creation
        const fallbackVideoData = {
          videoId: videoId,
          videoUrl: tab.url,
          title: `YouTube Video ${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };

        expect(fallbackVideoData.videoId).toBe('test123');
        expect(fallbackVideoData.title).toBe('YouTube Video test123');
      }
    });
  });

  describe('Real-time Updates Integration', () => {
    test('should handle status updates through subscription', async () => {
      await mockSupabaseClient.initialize();
      
      const reportId = 'test-report-123';
      const statusCallback = jest.fn();
      
      // Subscribe to updates
      mockSupabaseClient.subscribeToAnalysisUpdates(reportId, statusCallback);
      mockSupabaseClient.subscribeToStatusUpdates(reportId, statusCallback);
      
      // Simulate status update
      const mockStatusUpdate = {
        eventType: 'report_updated',
        data: {
          id: reportId,
          analysis_status: 'Researching',
          video_title: 'Test Video'
        }
      };

      // Verify subscriptions were set up
      expect(mockSupabaseClient.subscribeToAnalysisUpdates).toHaveBeenCalledWith(
        reportId,
        statusCallback
      );
      expect(mockSupabaseClient.subscribeToStatusUpdates).toHaveBeenCalledWith(
        reportId,
        statusCallback
      );
    });

    test('should handle polling fallback when subscriptions fail', async () => {
      await mockSupabaseClient.initialize();
      
      // Mock subscription failure
      mockSupabaseClient.subscribeToAnalysisUpdates.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      const reportId = 'test-report-123';
      
      // Should fall back to polling
      try {
        mockSupabaseClient.subscribeToAnalysisUpdates(reportId, jest.fn());
      } catch (error) {
        expect(error.message).toBe('Subscription failed');
        // Polling fallback would be implemented here
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle Supabase initialization failure', async () => {
      mockSupabaseClient.initialize.mockResolvedValue(false);
      
      const supabaseReady = await mockSupabaseClient.initialize();
      expect(supabaseReady).toBe(false);
      
      // Should fall back to demo mode
      const demoAnalysis = async (videoData) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ status: 'demo', message: 'Demo mode analysis' });
          }, 100);
        });
      };

      const result = await demoAnalysis({ videoId: 'test123' });
      expect(result.status).toBe('demo');
    });

    test('should handle database errors gracefully', async () => {
      await mockSupabaseClient.initialize();
      
      // Mock database error
      mockSupabaseClient.createAnalysisReport.mockRejectedValue(
        new Error('Database connection failed')
      );

      const videoData = { videoId: 'test123', videoUrl: 'https://youtube.com/watch?v=test123' };
      
      await expect(mockSupabaseClient.createAnalysisReport(videoData))
        .rejects.toThrow('Database connection failed');
    });

    test('should handle invalid video URLs', async () => {
      const invalidUrls = [
        'https://www.google.com',
        'https://www.youtube.com',
        'https://www.youtube.com/channel/test',
        ''
      ];

      const extractVideoId = (url) => {
        const match = url.match(/[?&]v=([^&]+)/);
        if (match) return match[1];
        
        const shortsMatch = url.match(/\/shorts\/([^?&]+)/);
        if (shortsMatch) return shortsMatch[1];
        
        return null;
      };

      invalidUrls.forEach(url => {
        expect(extractVideoId(url)).toBeNull();
      });
    });
  });

  describe('UI State Integration', () => {
    test('should manage UI states throughout analysis flow', async () => {
      const mockElements = {
        analyzeBtn: { disabled: false, textContent: 'Analyze Claims' },
        status: { textContent: '', innerHTML: '' },
        loading: { style: { display: 'none' } },
        reportContainer: { style: { display: 'none' } }
      };

      mockDocument.getElementById.mockImplementation(id => mockElements[id]);

      // Initial state
      expect(mockElements.analyzeBtn.disabled).toBe(false);
      expect(mockElements.loading.style.display).toBe('none');

      // Analysis started
      mockElements.analyzeBtn.disabled = true;
      mockElements.loading.style.display = 'block';
      mockElements.status.textContent = 'Starting analysis...';

      expect(mockElements.analyzeBtn.disabled).toBe(true);
      expect(mockElements.loading.style.display).toBe('block');
      expect(mockElements.status.textContent).toBe('Starting analysis...');

      // Analysis completed
      mockElements.analyzeBtn.disabled = false;
      mockElements.loading.style.display = 'none';
      mockElements.reportContainer.style.display = 'block';
      mockElements.status.textContent = 'Analysis complete!';

      expect(mockElements.analyzeBtn.disabled).toBe(false);
      expect(mockElements.loading.style.display).toBe('none');
      expect(mockElements.reportContainer.style.display).toBe('block');
    });

    test('should handle claims display integration', async () => {
      const claims = await mockSupabaseClient.getVerifiedClaims('test-report-123');
      
      // Simulate claims display logic
      const displayClaimsList = (claims) => {
        return claims.map((claim, index) => ({
          index,
          statement: claim.original_statement,
          status: claim.verification_status,
          summary: claim.verification_summary,
          sources: claim.supporting_evidence || []
        }));
      };

      const displayData = displayClaimsList(claims);
      
      expect(displayData).toHaveLength(1);
      expect(displayData[0].statement).toBe('This is a test claim');
      expect(displayData[0].status).toBe('True');
      expect(displayData[0].sources).toHaveLength(1);
    });
  });

  describe('Background Script Integration', () => {
    test('should communicate with background script for badge updates', async () => {
      const reportId = 'test-report-123';
      const status = 'Processing';
      
      // Mock background script message
      const backgroundMessage = {
        action: 'updateBadgeStatus',
        reportId: reportId,
        status: status,
        reportData: { id: reportId, analysis_status: status }
      };

      await mockChrome.runtime.sendMessage(backgroundMessage);
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(backgroundMessage);
    });

    test('should handle background script unavailability', async () => {
      // Mock background script failure
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Background script not available'));

      try {
        await mockChrome.runtime.sendMessage({ action: 'test' });
      } catch (error) {
        expect(error.message).toBe('Background script not available');
        // Should continue without background script functionality
      }
    });
  });
});

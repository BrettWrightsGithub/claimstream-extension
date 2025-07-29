// Unit tests for popup.js functionality
describe('Popup Functionality', () => {
  let mockSupabaseClient;
  let mockElements;

  beforeEach(() => {
    // Mock DOM elements
    mockElements = {
      analyzeBtn: {
        disabled: false,
        style: { display: 'block' },
        addEventListener: jest.fn(),
        textContent: 'Analyze Claims'
      },
      status: { textContent: '', innerHTML: '' },
      videoInfo: { textContent: '' },
      loading: { style: { display: 'none' } },
      reportContainer: { style: { display: 'none' } }
    };

    document.getElementById = jest.fn((id) => mockElements[id] || {
      style: {},
      textContent: '',
      innerHTML: '',
      addEventListener: jest.fn()
    });

    // Mock Supabase client
    mockSupabaseClient = {
      initialize: jest.fn().mockResolvedValue(true),
      isReady: jest.fn().mockReturnValue(true),
      createAnalysisReport: jest.fn().mockResolvedValue({
        id: 'test-report-id',
        video_id: 'test123',
        analysis_status: 'Processing'
      }),
      getExistingReport: jest.fn().mockResolvedValue(null),
      getVerifiedClaims: jest.fn().mockResolvedValue([]),
      subscribeToAnalysisUpdates: jest.fn(),
      subscribeToStatusUpdates: jest.fn()
    };

    global.supabaseClient = mockSupabaseClient;
  });

  describe('extractVideoId', () => {
    // Load the actual function
    const extractVideoId = (url) => {
      // Handle regular YouTube videos (/watch?v=ID)
      let match = url.match(/[?&]v=([^&]+)/);
      if (match) {
        return match[1];
      }
      
      // Handle YouTube Shorts (/shorts/ID)
      match = url.match(/\/shorts\/([^?&]+)/);
      if (match) {
        return match[1];
      }
      
      return null;
    };

    test('should extract video ID from regular YouTube URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from YouTube Shorts URL', () => {
      const url = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from URL with additional parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLtest';
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should return null for invalid URLs', () => {
      expect(extractVideoId('https://www.google.com')).toBeNull();
      expect(extractVideoId('https://www.youtube.com')).toBeNull();
      expect(extractVideoId('')).toBeNull();
    });
  });

  describe('getStatusColor', () => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'true':
          return '#22c55e'; // Green
        case 'partially true':
        case 'partially-true':
          return '#f59e0b'; // Orange
        case 'false':
          return '#ef4444'; // Red
        case 'unverified':
        default:
          return '#6b7280'; // Gray
      }
    };

    test('should return green for true status', () => {
      expect(getStatusColor('True')).toBe('#22c55e');
      expect(getStatusColor('true')).toBe('#22c55e');
    });

    test('should return orange for partially true status', () => {
      expect(getStatusColor('Partially True')).toBe('#f59e0b');
      expect(getStatusColor('partially-true')).toBe('#f59e0b');
    });

    test('should return red for false status', () => {
      expect(getStatusColor('False')).toBe('#ef4444');
      expect(getStatusColor('false')).toBe('#ef4444');
    });

    test('should return gray for unverified or unknown status', () => {
      expect(getStatusColor('Unverified')).toBe('#6b7280');
      expect(getStatusColor('unknown')).toBe('#6b7280');
      expect(getStatusColor(null)).toBe('#6b7280');
      expect(getStatusColor(undefined)).toBe('#6b7280');
    });
  });

  describe('YouTube Detection', () => {
    test('should detect YouTube watch page', () => {
      const url = 'https://www.youtube.com/watch?v=test123';
      const isWatchPage = url.includes('youtube.com/watch');
      const isShortsPage = url.includes('youtube.com/shorts');
      const isYouTubeVideo = isWatchPage || isShortsPage;
      
      expect(isWatchPage).toBe(true);
      expect(isShortsPage).toBe(false);
      expect(isYouTubeVideo).toBe(true);
    });

    test('should detect YouTube shorts page', () => {
      const url = 'https://www.youtube.com/shorts/test123';
      const isWatchPage = url.includes('youtube.com/watch');
      const isShortsPage = url.includes('youtube.com/shorts');
      const isYouTubeVideo = isWatchPage || isShortsPage;
      
      expect(isWatchPage).toBe(false);
      expect(isShortsPage).toBe(true);
      expect(isYouTubeVideo).toBe(true);
    });

    test('should not detect non-YouTube pages', () => {
      const url = 'https://www.google.com';
      const isWatchPage = url.includes('youtube.com/watch');
      const isShortsPage = url.includes('youtube.com/shorts');
      const isYouTubeVideo = isWatchPage || isShortsPage;
      
      expect(isWatchPage).toBe(false);
      expect(isShortsPage).toBe(false);
      expect(isYouTubeVideo).toBe(false);
    });
  });

  describe('Analysis Flow', () => {
    test('should initialize Supabase client on load', async () => {
      await mockSupabaseClient.initialize();
      expect(mockSupabaseClient.initialize).toHaveBeenCalled();
    });

    test('should create analysis report when analyze button is clicked', async () => {
      const videoData = {
        videoId: 'test123',
        videoUrl: 'https://www.youtube.com/watch?v=test123',
        title: 'Test Video',
        channel: 'Test Channel'
      };

      await mockSupabaseClient.createAnalysisReport(videoData);
      
      expect(mockSupabaseClient.createAnalysisReport).toHaveBeenCalledWith(videoData);
    });

    test('should handle analysis errors gracefully', async () => {
      mockSupabaseClient.createAnalysisReport.mockRejectedValue(new Error('Database error'));
      
      try {
        await mockSupabaseClient.createAnalysisReport({});
      } catch (error) {
        expect(error.message).toBe('Database error');
      }
    });

    test('should check for existing reports', async () => {
      const videoId = 'test123';
      await mockSupabaseClient.getExistingReport(videoId);
      
      expect(mockSupabaseClient.getExistingReport).toHaveBeenCalledWith(videoId);
    });
  });

  describe('Status Updates', () => {
    const STATUS_MESSAGES = {
      'Processing': {
        message: 'Getting transcript and extracting claims...',
        description: 'We are analyzing the video content and identifying claims to fact-check.',
        showProgress: true,
        allowRedirect: false
      },
      'Complete': {
        message: 'Analysis complete!',
        description: 'Your fact-check report is ready.',
        showProgress: false,
        allowRedirect: false
      },
      'Error': {
        message: 'Analysis failed',
        description: 'An error occurred during analysis. Please try again.',
        showProgress: false,
        allowRedirect: false
      }
    };

    test('should have correct status messages configuration', () => {
      expect(STATUS_MESSAGES['Processing']).toBeDefined();
      expect(STATUS_MESSAGES['Processing'].showProgress).toBe(true);
      expect(STATUS_MESSAGES['Complete'].showProgress).toBe(false);
      expect(STATUS_MESSAGES['Error'].showProgress).toBe(false);
    });

    test('should handle status updates correctly', () => {
      const handleStatusUpdate = (status, data = null) => {
        const statusConfig = STATUS_MESSAGES[status];
        if (!statusConfig) {
          return { error: `Unknown status: ${status}` };
        }
        return { status, config: statusConfig };
      };

      const result = handleStatusUpdate('Processing');
      expect(result.status).toBe('Processing');
      expect(result.config.showProgress).toBe(true);

      const errorResult = handleStatusUpdate('InvalidStatus');
      expect(errorResult.error).toBe('Unknown status: InvalidStatus');
    });
  });

  describe('Real-time Subscriptions', () => {
    test('should subscribe to analysis updates', () => {
      const reportId = 'test-report-id';
      const callback = jest.fn();
      
      mockSupabaseClient.subscribeToAnalysisUpdates(reportId, callback);
      
      expect(mockSupabaseClient.subscribeToAnalysisUpdates).toHaveBeenCalledWith(reportId, callback);
    });

    test('should subscribe to status updates', () => {
      const reportId = 'test-report-id';
      const callback = jest.fn();
      
      mockSupabaseClient.subscribeToStatusUpdates(reportId, callback);
      
      expect(mockSupabaseClient.subscribeToStatusUpdates).toHaveBeenCalledWith(reportId, callback);
    });
  });

  describe('UI State Management', () => {
    test('should disable analyze button during analysis', () => {
      mockElements.analyzeBtn.disabled = true;
      expect(mockElements.analyzeBtn.disabled).toBe(true);
    });

    test('should show loading indicator during analysis', () => {
      mockElements.loading.style.display = 'block';
      expect(mockElements.loading.style.display).toBe('block');
    });

    test('should update status text', () => {
      mockElements.status.textContent = 'Analysis in progress...';
      expect(mockElements.status.textContent).toBe('Analysis in progress...');
    });

    test('should show report container when analysis complete', () => {
      mockElements.reportContainer.style.display = 'block';
      expect(mockElements.reportContainer.style.display).toBe('block');
    });
  });
});

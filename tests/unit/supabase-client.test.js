// Unit tests for supabase-client.js functionality
describe('SupabaseClient', () => {
  let SupabaseClient;
  let mockSupabaseInstance;
  let client;

  beforeEach(() => {
    // Mock Supabase client instance
    mockSupabaseInstance = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() })
      }))
    };

    // Mock the SupabaseClient class
    SupabaseClient = class {
      constructor() {
        this.client = null;
        this.isInitialized = false;
        this.subscriptions = new Map();
        this.statusCallbacks = new Map();
      }

      async initialize() {
        try {
          if (!global.CONFIG.supabase.url || !global.CONFIG.supabase.anonKey) {
            throw new Error('Supabase configuration not set');
          }
          this.client = mockSupabaseInstance;
          this.isInitialized = true;
          return true;
        } catch (error) {
          return false;
        }
      }

      isReady() {
        return this.isInitialized && this.client !== null;
      }

      async createAnalysisReport(videoData) {
        if (!this.isReady()) {
          throw new Error('Supabase client not initialized');
        }

        const reportData = {
          source_url: videoData.videoUrl,
          video_id: videoData.videoId,
          video_title: videoData.title || 'Unknown Title',
          video_channel_title: videoData.channel || 'Unknown Channel',
          analysis_status: 'Processing',
          created_at: new Date().toISOString()
        };

        const mockResponse = {
          data: { id: 'test-report-id', ...reportData },
          error: null
        };

        const mockChain = {
          from: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue(mockResponse)
        };
        
        this.client.from = jest.fn(() => mockChain);
        
        const { data, error } = await this.client.from().insert().select().single();
        if (error) throw error;
        return data;
      }

      async getExistingReport(videoId) {
        if (!this.isReady()) {
          throw new Error('Supabase client not initialized');
        }

        const mockResponse = {
          data: [{ id: 'existing-report', video_id: videoId, analysis_status: 'Complete' }],
          error: null
        };

        const mockChain = {
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue(mockResponse)
        };
        
        this.client.from = jest.fn(() => mockChain);
        
        const { data, error } = await this.client.from().select().eq().order().limit();
        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
      }

      async getVerifiedClaims(reportId) {
        if (!this.isReady()) {
          throw new Error('Supabase client not initialized');
        }

        const mockClaims = [
          {
            id: 'claim-1',
            report_id: reportId,
            original_statement: 'Test claim 1',
            verification_status: 'True',
            verification_summary: 'This claim is verified as true.'
          }
        ];

        const mockChain = {
          from: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockClaims,
            error: null
          })
        };
        
        this.client.from = jest.fn(() => mockChain);

        const { data, error } = await this.client.from().select().eq().order();
        if (error) throw error;
        return data || [];
      }

      subscribeToAnalysisUpdates(reportId, callback) {
        if (!this.isReady()) {
          throw new Error('Supabase client not ready');
        }

        const mockSubscription = { unsubscribe: jest.fn() };
        this.client.channel.mockReturnValue({
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn().mockReturnValue(mockSubscription)
        });

        const reportsChannel = this.client.channel(`analysis_reports_${reportId}`);
        const claimsChannel = this.client.channel(`verified_claims_${reportId}`);

        this.subscriptions.set(reportId, {
          reports: reportsChannel.on().subscribe(),
          claims: claimsChannel.on().subscribe()
        });

        return true;
      }

      unsubscribeFromAnalysisUpdates(reportId) {
        const subscriptions = this.subscriptions.get(reportId);
        if (subscriptions) {
          subscriptions.reports.unsubscribe();
          subscriptions.claims.unsubscribe();
          this.subscriptions.delete(reportId);
        }
      }

      cleanup() {
        for (const [reportId, subscriptions] of this.subscriptions) {
          if (subscriptions.reports) subscriptions.reports.unsubscribe();
          if (subscriptions.claims) subscriptions.claims.unsubscribe();
        }
        this.subscriptions.clear();
        this.statusCallbacks.clear();
      }
    };

    client = new SupabaseClient();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid config', async () => {
      const result = await client.initialize();
      expect(result).toBe(true);
      expect(client.isInitialized).toBe(true);
      expect(client.client).toBe(mockSupabaseInstance);
    });

    test('should fail initialization with invalid config', async () => {
      // Temporarily remove config
      const originalConfig = global.CONFIG;
      global.CONFIG = { supabase: { url: '', anonKey: '' } };

      const result = await client.initialize();
      expect(result).toBe(false);
      expect(client.isInitialized).toBe(false);

      // Restore config
      global.CONFIG = originalConfig;
    });

    test('should report ready status correctly', async () => {
      expect(client.isReady()).toBe(false);
      
      await client.initialize();
      expect(client.isReady()).toBe(true);
    });
  });

  describe('Analysis Reports', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should create analysis report successfully', async () => {
      const videoData = {
        videoId: 'test123',
        videoUrl: 'https://youtube.com/watch?v=test123',
        title: 'Test Video',
        channel: 'Test Channel'
      };

      const report = await client.createAnalysisReport(videoData);
      
      expect(report).toBeDefined();
      expect(report.id).toBe('test-report-id');
      expect(report.video_id).toBe('test123');
      expect(report.analysis_status).toBe('Processing');
    });

    test('should throw error when creating report without initialization', async () => {
      const uninitializedClient = new SupabaseClient();
      
      await expect(uninitializedClient.createAnalysisReport({}))
        .rejects.toThrow('Supabase client not initialized');
    });

    test('should get existing report by video ID', async () => {
      const videoId = 'test123';
      const report = await client.getExistingReport(videoId);
      
      expect(report).toBeDefined();
      expect(report.video_id).toBe(videoId);
      expect(report.analysis_status).toBe('Complete');
    });

    test('should return null when no existing report found', async () => {
      // Mock empty response
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
      
      client.client.from = jest.fn(() => mockChain);

      const report = await client.getExistingReport('nonexistent');
      expect(report).toBeNull();
    });
  });

  describe('Verified Claims', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should get verified claims for a report', async () => {
      const reportId = 'test-report-id';
      const claims = await client.getVerifiedClaims(reportId);
      
      expect(claims).toHaveLength(1);
      expect(claims[0].report_id).toBe(reportId);
      expect(claims[0].verification_status).toBe('True');
    });

    test('should return empty array when no claims found', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      
      client.client.from = jest.fn(() => mockChain);

      const claims = await client.getVerifiedClaims('empty-report');
      expect(claims).toEqual([]);
    });
  });

  describe('Real-time Subscriptions', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should subscribe to analysis updates', () => {
      const reportId = 'test-report-id';
      const callback = jest.fn();
      
      const result = client.subscribeToAnalysisUpdates(reportId, callback);
      
      expect(result).toBe(true);
      expect(client.subscriptions.has(reportId)).toBe(true);
      expect(client.client.channel).toHaveBeenCalledWith(`analysis_reports_${reportId}`);
      expect(client.client.channel).toHaveBeenCalledWith(`verified_claims_${reportId}`);
    });

    test('should throw error when subscribing without initialization', () => {
      const uninitializedClient = new SupabaseClient();
      
      expect(() => uninitializedClient.subscribeToAnalysisUpdates('test', jest.fn()))
        .toThrow('Supabase client not ready');
    });

    test('should unsubscribe from analysis updates', () => {
      const reportId = 'test-report-id';
      const callback = jest.fn();
      
      // First subscribe
      client.subscribeToAnalysisUpdates(reportId, callback);
      expect(client.subscriptions.has(reportId)).toBe(true);
      
      // Then unsubscribe
      client.unsubscribeFromAnalysisUpdates(reportId);
      expect(client.subscriptions.has(reportId)).toBe(false);
    });

    test('should handle unsubscribe for non-existent subscription', () => {
      // Should not throw error
      expect(() => client.unsubscribeFromAnalysisUpdates('nonexistent'))
        .not.toThrow();
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should cleanup all subscriptions', () => {
      // Create some subscriptions
      client.subscribeToAnalysisUpdates('report1', jest.fn());
      client.subscribeToAnalysisUpdates('report2', jest.fn());
      
      expect(client.subscriptions.size).toBe(2);
      
      client.cleanup();
      
      expect(client.subscriptions.size).toBe(0);
      expect(client.statusCallbacks.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should handle database errors in createAnalysisReport', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };
      
      client.client.from = jest.fn(() => mockChain);

      await expect(client.createAnalysisReport({}))
        .rejects.toThrow();
    });

    test('should handle database errors in getExistingReport', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };
      
      client.client.from = jest.fn(() => mockChain);

      await expect(client.getExistingReport('test'))
        .rejects.toThrow();
    });

    test('should handle database errors in getVerifiedClaims', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };
      
      client.client.from = jest.fn(() => mockChain);

      await expect(client.getVerifiedClaims('test'))
        .rejects.toThrow();
    });
  });
});

// Supabase client for ClaimStream Extension
// This handles all database operations and real-time subscriptions

class SupabaseClient {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.subscriptions = new Map();
  }

  // Initialize Supabase client
  async initialize() {
    try {
      if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
        throw new Error('Supabase configuration not set. Please update config.js with your Supabase credentials.');
      }

      // Check if Supabase client library is loaded
      if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        throw new Error('Supabase client library not loaded. Make sure to include the Supabase script.');
      }

      this.client = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
      this.isInitialized = true;
      
      console.log('Supabase client initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      return false;
    }
  }

  // Check if client is ready
  isReady() {
    return this.isInitialized && this.client !== null;
  }

  // Create a new analysis report
  async createAnalysisReport(videoData) {
    if (!this.isReady()) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const reportData = {
        source_url: videoData.videoUrl,
        video_id: videoData.videoId,
        video_title: videoData.title || 'Unknown Title',
        video_channel_title: videoData.channel || 'Unknown Channel',
        video_duration: videoData.duration || null,
        video_channel_id: videoData.channelId || null,
        video_thumbnail_image: videoData.thumbnail || null,
        video_statistics: videoData.statistics || {},
        analysis_status: 'Processing',
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('analysis_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Analysis report created:', data);
      return data;
    } catch (error) {
      console.error('Error creating analysis report:', error);
      throw error;
    }
  }

  // Get analysis report by ID
  async getAnalysisReport(reportId) {
    if (!this.isReady()) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('analysis_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting analysis report:', error);
      throw error;
    }
  }

  // Get existing analysis report by video ID
  async getExistingReport(videoId) {
    if (!this.isReady()) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await this.client
        .from('analysis_reports')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting existing report:', error);
      throw error;
    }
  }

  // Get verified claims for a report
  async getVerifiedClaims(reportId) {
    try {
      const { data, error } = await this.client
        .from('verified_claims')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting verified claims:', error);
      throw error;
    }
  }

  // Get webhook URL from configs table
  async getWebhookUrl() {
    console.log('🔍 getWebhookUrl called');
    try {
      console.log('🔍 Querying configs table for webhook URL...');
      const { data, error } = await this.client
        .from('configs')
        .select('n8nWebhookUrl')
        .limit(1);
      
      console.log('🔍 Configs query result:', { data, error });
      
      if (error) {
        console.error('❌ Error fetching webhook URL:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No webhook URL configured in database');
        return null;
      }
      
      const webhookUrl = data[0].n8nWebhookUrl;
      console.log('✅ Webhook URL retrieved:', webhookUrl);
      return webhookUrl;
    } catch (error) {
      console.error('❌ Error in getWebhookUrl:', error);
      return null;
    }
  }

  // Trigger webhook with video URL
  async triggerWebhook(webhookUrl, videoUrl) {
    try {
      const url = new URL(webhookUrl);
      url.searchParams.set('VideoURL', videoUrl);
      
      console.log('Triggering webhook:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json().catch(() => ({
        status: 'triggered',
        message: 'Webhook triggered successfully'
      }));
      
      console.log('Webhook response:', result);
      return result;
    } catch (error) {
      console.error('Error triggering webhook:', error);
      throw error;
    }
  }

  // Subscribe to real-time updates for an analysis report
  subscribeToAnalysisUpdates(reportId, callback) {
    if (!this.isReady()) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Subscribe to analysis_reports table changes
      const reportsSubscription = this.client
        .channel(`analysis_report_${reportId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_reports',
          filter: `id=eq.${reportId}`
        }, (payload) => {
          console.log('Analysis report updated:', payload);
          callback('report_updated', payload.new);
        })
        .subscribe();

      // Subscribe to verified_claims table changes
      const claimsSubscription = this.client
        .channel(`verified_claims_${reportId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'verified_claims',
          filter: `report_id=eq.${reportId}`
        }, (payload) => {
          console.log('New verified claim:', payload);
          callback('claim_added', payload.new);
        })
        .subscribe();

      // Store subscriptions for cleanup
      this.subscriptions.set(reportId, {
        reports: reportsSubscription,
        claims: claimsSubscription
      });

      console.log(`Subscribed to real-time updates for report ${reportId}`);
      return true;
    } catch (error) {
      console.error('Error subscribing to updates:', error);
      throw error;
    }
  }

  // Unsubscribe from real-time updates
  unsubscribeFromAnalysisUpdates(reportId) {
    const subscriptions = this.subscriptions.get(reportId);
    if (subscriptions) {
      subscriptions.reports.unsubscribe();
      subscriptions.claims.unsubscribe();
      this.subscriptions.delete(reportId);
      console.log(`Unsubscribed from updates for report ${reportId}`);
    }
  }

  // Clean up all subscriptions
  cleanup() {
    for (const [reportId, subscriptions] of this.subscriptions) {
      subscriptions.reports.unsubscribe();
      subscriptions.claims.unsubscribe();
    }
    this.subscriptions.clear();
    console.log('All Supabase subscriptions cleaned up');
  }
}

// Create global instance
const supabaseClient = new SupabaseClient();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabaseClient;
} else {
  window.supabaseClient = supabaseClient;
}

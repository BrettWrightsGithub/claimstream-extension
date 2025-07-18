// Popup script for ClaimStream extension
console.log('🚀 popup.js script loaded!');
console.log('📦 ClaimStream Extension v2.2.0 - UI Phase 2 Complete');
console.log('🎨 UI Phase 2: Larger window + Light theme implemented');
console.log('🔍 Sources display with nested accordions');
console.log('🔧 CSP-compliant event handlers implemented');
console.log('⏰ Script timestamp:', new Date().toISOString());

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Supabase client
  console.log('🔧 ClaimStream popup loaded');
  console.log('🔧 CONFIG available:', typeof CONFIG !== 'undefined');
  console.log('🔧 supabaseClient available:', typeof supabaseClient !== 'undefined');
  
  if (typeof CONFIG !== 'undefined') {
    console.log('🔧 Supabase URL:', CONFIG.supabase?.url);
    console.log('🔧 Supabase key starts with:', CONFIG.supabase?.anonKey?.substring(0, 20) + '...');
  }
  
  console.log('🔧 Initializing Supabase client...');
  const supabaseReady = await supabaseClient.initialize();
  if (!supabaseReady) {
    console.warn('⚠️ Supabase client not ready - running in demo mode');
  } else {
    console.log('✅ Supabase client initialized successfully');
  }
  const analyzeBtn = document.getElementById('analyzeBtn');
  const status = document.getElementById('status');
  const videoInfo = document.getElementById('videoInfo');
  const loading = document.getElementById('loading');

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if we're on YouTube video or shorts
  const isWatchPage = tab.url.includes('youtube.com/watch');
  const isShortsPage = tab.url.includes('youtube.com/shorts');
  const isYouTubeVideo = isWatchPage || isShortsPage;
  
  if (!isYouTubeVideo) {
    status.textContent = 'Please navigate to a YouTube video or Short';
    analyzeBtn.disabled = true;
    return;
  }

  // Extract video ID from URL
  const videoId = extractVideoId(tab.url);
  if (!videoId) {
    status.textContent = 'Could not detect video ID';
    analyzeBtn.disabled = true;
    return;
  }

  // Update UI with video info
  videoInfo.textContent = `Video ID: ${videoId}`;
  
  // Store current video ID globally
  window.currentVideoId = videoId;
  
  // Check for existing report
  if (supabaseReady && supabaseClient.isReady()) {
    console.log('🔍 Checking for existing report for video:', videoId);
    await checkForExistingReport(videoId);
  } else {
    status.textContent = 'Ready to analyze claims';
  }

  // Handle analyze button click
  analyzeBtn.addEventListener('click', async () => {
    console.log('🔍 Analyze button clicked!');
    try {
      analyzeBtn.disabled = true;
      loading.style.display = 'block';
      status.textContent = 'Starting analysis...';
      console.log('🔍 Analysis started, supabaseReady:', supabaseReady);

      // Send message to content script to get video info
      console.log('🔍 Sending message to content script on tab:', tab.id);
      console.log('🔍 Message payload:', { action: 'getVideoInfo', videoId, videoUrl: tab.url });
      
      let response;
      let videoData;
      
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'getVideoInfo',
          videoId: videoId,
          videoUrl: tab.url
        });
        console.log('✅ Received response from content script:', response);
        
        if (response && response.success) {
          videoData = response.data;
        } else {
          throw new Error('Content script returned invalid response');
        }
      } catch (messageError) {
        console.error('❌ Content script failed, using fallback data:', messageError);
        // Fallback: create basic video data from what we have
        videoData = {
          videoId: videoId,
          videoUrl: tab.url,
          title: `YouTube Video ${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
        console.log('🔄 Using fallback video data:', videoData);
      }
      console.log('Video data:', videoData);

      // Try to create analysis report in Supabase
      if (supabaseReady && supabaseClient.isReady()) {
        await handleSupabaseAnalysis(videoData);
      } else {
        await handleDemoAnalysis(videoData);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      status.textContent = `Error: ${error.message}`;
      loading.style.display = 'none';
      analyzeBtn.disabled = false;
    }
  });

  // Global variables for polling and progress tracking
  let pollingInterval = null;
  let progressStage = 0;
  let analysisStartTime = null;

  // Progress stages for better user feedback
  const PROGRESS_STAGES = [
    'Initializing analysis...',
    'Processing video content...',
    'Extracting claims...',
    'Fact-checking claims...',
    'Generating verification report...',
    'Finalizing results...'
  ];

  // Handle analysis with Supabase
  async function handleSupabaseAnalysis(videoData) {
    console.log('🔍 handleSupabaseAnalysis called with:', videoData);
    analysisStartTime = Date.now();
    progressStage = 0;
    
    try {
      status.textContent = 'Getting webhook configuration...';
      console.log('🔍 Getting webhook URL from database...');
      
      // Get webhook URL from configs table
      const webhookUrl = await supabaseClient.getWebhookUrl();
      console.log('🔍 Webhook URL retrieved:', webhookUrl);
      if (!webhookUrl) {
        throw new Error('No webhook URL configured in database');
      }
      
      console.log('Webhook URL found:', webhookUrl);
      
      // Create analysis report
      updateProgressStage('Creating analysis report...');
      console.log('🔍 Creating analysis report...');
      const report = await supabaseClient.createAnalysisReport(videoData);
      console.log('🔍 Analysis report created:', report);
      
      if (!report || !report.id) {
        throw new Error('Failed to create analysis report');
      }
      
      // Store current report ID for polling
      window.currentReportId = report.id;
      
      // Subscribe to real-time updates
      console.log('🔍 Setting up real-time subscription...');
      updateProgressStage('Setting up real-time updates...');
      
      try {
        supabaseClient.subscribeToAnalysisUpdates(report.id, handleReportUpdate);
        
        // Trigger the webhook with video URL
        try {
          const webhookResult = await supabaseClient.triggerWebhook(webhookUrl, videoData.videoUrl);
          console.log('Webhook triggered successfully:', webhookResult);
          updateProgressStage('Analysis workflow started...');
          
          // Start polling as fallback
          startPollingFallback(report.id);
          
          // Show manual refresh button after 15 seconds
          setTimeout(() => {
            if (loading.style.display !== 'none') {
              showManualRefreshButton();
            }
          }, 15000);
          
          // Set progressive timeouts with better messaging
          setTimeout(() => {
            if (loading.style.display !== 'none') {
              updateProgressStage('Analysis is taking longer than expected...');
            }
          }, 30000); // 30 seconds
          
          setTimeout(() => {
            if (loading.style.display !== 'none') {
              updateProgressStage('Still processing... This may take a few minutes.');
            }
          }, 60000); // 1 minute
          
          setTimeout(() => {
            if (loading.style.display !== 'none') {
              handleAnalysisTimeout();
            }
          }, 180000); // 3 minutes
          
        } catch (webhookError) {
          console.error('Webhook trigger failed:', webhookError);
          status.textContent = `Webhook error: ${webhookError.message}`;
          loading.style.display = 'none';
          analyzeBtn.disabled = false;
          return;
        }
        
      } catch (subscriptionError) {
        console.error('Real-time subscription failed:', subscriptionError);
        updateProgressStage('Real-time updates unavailable, using polling...');
        
        // If real-time fails, rely on polling
        startPollingFallback(report.id);
      }
      
    } catch (error) {
      console.error('Supabase analysis error:', error);
      status.textContent = `Error: ${error.message}`;
      loading.style.display = 'none';
      analyzeBtn.disabled = false;
      hideManualRefreshButton();
    }
  }

  // Handle demo analysis (fallback)
  async function handleDemoAnalysis(videoData) {
    status.textContent = 'Running in demo mode...';
    
    setTimeout(() => {
      status.textContent = 'Analysis complete (demo mode)';
      loading.style.display = 'none';
      analyzeBtn.disabled = false;
    }, 3000);
  }

  // Check for existing report
  async function checkForExistingReport(videoId) {
    try {
      const existingReport = await supabaseClient.getExistingReport(videoId);
      
      if (existingReport) {
        console.log('✅ Found existing report:', existingReport);
        
        if (existingReport.analysis_status === 'Complete') {
          // Show completed report
          await displayReport(existingReport);
          analyzeBtn.textContent = 'Re-analyze Claims';
          status.textContent = 'Report ready';
        } else if (existingReport.analysis_status === 'Processing') {
          // Show processing state
          status.textContent = 'Analysis in progress...';
          loading.style.display = 'block';
          analyzeBtn.disabled = true;
          
          // Subscribe to updates for this report
          supabaseClient.subscribeToAnalysisUpdates(existingReport.id, handleReportUpdate);
        } else {
          // Failed or other status
          status.textContent = 'Previous analysis failed - ready to retry';
          analyzeBtn.textContent = 'Retry Analysis';
        }
      } else {
        console.log('⚠️ No existing report found');
        status.textContent = 'Ready to analyze claims';
      }
    } catch (error) {
      console.error('Error checking for existing report:', error);
      status.textContent = 'Ready to analyze claims';
    }
  }
  
  // Handle real-time report updates
  function handleReportUpdate(eventType, data) {
    console.log('Real-time update:', eventType, data);
    
    if (eventType === 'report_updated') {
      if (data.analysis_status === 'Complete') {
        console.log('✅ Analysis completed via real-time update');
        clearPollingInterval();
        displayReport(data);
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Re-analyze Claims';
        status.textContent = 'Analysis complete!';
        hideManualRefreshButton();
      } else if (data.analysis_status === 'Failed') {
        console.log('❌ Analysis failed via real-time update');
        clearPollingInterval();
        status.textContent = 'Analysis failed';
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Retry Analysis';
        hideManualRefreshButton();
      }
    } else if (eventType === 'claim_added') {
      updateProgressStage(`Processing claims... (${data.original_statement?.substring(0, 30)}...)`);
    }
  }

  // Polling fallback mechanism
  function startPollingFallback(reportId) {
    console.log('🔄 Starting polling fallback for report:', reportId);
    
    // Clear any existing polling
    clearPollingInterval();
    
    // Poll every 10 seconds
    pollingInterval = setInterval(async () => {
      try {
        console.log('🔄 Polling for report updates...');
        const report = await supabaseClient.getExistingReport(window.currentVideoId || reportId);
        
        if (report && report.id === reportId) {
          if (report.analysis_status === 'Complete') {
            console.log('✅ Analysis completed via polling');
            clearPollingInterval();
            displayReport(report);
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Re-analyze Claims';
            status.textContent = 'Analysis complete!';
            hideManualRefreshButton();
          } else if (report.analysis_status === 'Failed') {
            console.log('❌ Analysis failed via polling');
            clearPollingInterval();
            status.textContent = 'Analysis failed';
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Retry Analysis';
            hideManualRefreshButton();
          } else {
            // Still processing, update progress
            updateProgressStage();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling despite errors
      }
    }, 10000); // Poll every 10 seconds
  }

  // Clear polling interval
  function clearPollingInterval() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      console.log('🔄 Polling cleared');
    }
  }

  // Update progress stage with rotating messages
  function updateProgressStage(customMessage = null) {
    if (customMessage) {
      status.textContent = customMessage;
      return;
    }
    
    // Rotate through progress stages
    if (progressStage < PROGRESS_STAGES.length - 1) {
      progressStage++;
    } else {
      progressStage = 2; // Loop back to "Extracting claims..."
    }
    
    const elapsed = Math.floor((Date.now() - analysisStartTime) / 1000);
    status.textContent = `${PROGRESS_STAGES[progressStage]} (${elapsed}s)`;
  }

  // Handle analysis timeout
  function handleAnalysisTimeout() {
    console.log('⏰ Analysis timeout reached');
    clearPollingInterval();
    
    status.textContent = 'Analysis timed out. You can check status manually or retry.';
    loading.style.display = 'none';
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Retry Analysis';
    
    // Show manual refresh button
    showManualRefreshButton();
  }

  // Show manual refresh button
  function showManualRefreshButton() {
    let refreshBtn = document.getElementById('manualRefreshBtn');
    if (!refreshBtn) {
      refreshBtn = document.createElement('button');
      refreshBtn.id = 'manualRefreshBtn';
      refreshBtn.className = 'manual-refresh-btn';
      refreshBtn.textContent = 'Check Status';
      refreshBtn.onclick = checkAnalysisStatus;
      
      // Insert after analyze button
      analyzeBtn.parentNode.insertBefore(refreshBtn, analyzeBtn.nextSibling);
    }
    refreshBtn.style.display = 'block';
  }

  // Hide manual refresh button
  function hideManualRefreshButton() {
    const refreshBtn = document.getElementById('manualRefreshBtn');
    if (refreshBtn) {
      refreshBtn.style.display = 'none';
    }
  }

  // Manual status check function
  async function checkAnalysisStatus() {
    if (!window.currentReportId) {
      status.textContent = 'No active analysis to check';
      return;
    }
    
    try {
      status.textContent = 'Checking analysis status...';
      const refreshBtn = document.getElementById('manualRefreshBtn');
      if (refreshBtn) refreshBtn.disabled = true;
      
      const report = await supabaseClient.getExistingReport(window.currentVideoId || window.currentReportId);
      
      if (report && report.id === window.currentReportId) {
        if (report.analysis_status === 'Complete') {
          console.log('✅ Analysis completed via manual check');
          displayReport(report);
          loading.style.display = 'none';
          analyzeBtn.disabled = false;
          analyzeBtn.textContent = 'Re-analyze Claims';
          status.textContent = 'Analysis complete!';
          hideManualRefreshButton();
        } else if (report.analysis_status === 'Failed') {
          console.log('❌ Analysis failed via manual check');
          status.textContent = 'Analysis failed';
          loading.style.display = 'none';
          analyzeBtn.disabled = false;
          analyzeBtn.textContent = 'Retry Analysis';
          hideManualRefreshButton();
        } else {
          status.textContent = `Analysis still in progress (${report.analysis_status})`;
          // Restart polling if it was stopped
          if (!pollingInterval) {
            startPollingFallback(report.id);
          }
        }
      } else {
        status.textContent = 'Could not find analysis report';
      }
    } catch (error) {
      console.error('Manual status check error:', error);
      status.textContent = 'Error checking status';
    } finally {
      const refreshBtn = document.getElementById('manualRefreshBtn');
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  // Display verification report
  async function displayReport(report) {
    try {
      const claims = await supabaseClient.getVerifiedClaims(report.id);
      console.log('Displaying report with claims:', claims);
      
      // Hide analyze button and show report
      analyzeBtn.style.display = 'none';
      document.getElementById('reportContainer').style.display = 'block';
      
      // Update summary
      const summaryEl = document.getElementById('reportSummary');
      summaryEl.textContent = `Analysis of "${report.video_title || 'YouTube video'}" complete`;
      
      // Calculate claim statistics
      const stats = {
        total: claims.length,
        true: claims.filter(c => c.verification_status === 'True').length,
        partiallyTrue: claims.filter(c => c.verification_status === 'Partially True').length,
        false: claims.filter(c => c.verification_status === 'False').length
      };
      
      // Display summary pills
      displaySummaryPills(stats);
      
      // Display claims list
      displayClaimsList(claims);
      
    } catch (error) {
      console.error('Error displaying report:', error);
      status.textContent = 'Error loading report';
    }
  }
  
  // Display summary pills
  function displaySummaryPills(stats) {
    const pillsContainer = document.getElementById('summaryPills');
    pillsContainer.innerHTML = `
      <div class="pill total">Total: ${stats.total}</div>
      <div class="pill true">True: ${stats.true}</div>
      <div class="pill partially-true">Partial: ${stats.partiallyTrue}</div>
      <div class="pill false">False: ${stats.false}</div>
    `;
  }
  
  // Display claims list
  function displayClaimsList(claims) {
    const claimsContainer = document.getElementById('claimsList');
    
    if (claims.length === 0) {
      claimsContainer.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 20px;">No claims found in this video</div>';
      return;
    }
    
    claimsContainer.innerHTML = claims.map((claim, index) => {
      const statusColor = getStatusColor(claim.verification_status);
      const sourcesHtml = generateSourcesHtml(claim.supporting_evidence || [], index);
      
      return `
        <div class="claim-item">
          <div class="claim-header" data-claim-index="${index}">
            <div class="claim-pill" style="background-color: ${statusColor}">
              ${claim.verification_status}
            </div>
            <div class="claim-text">
              ${claim.original_statement}
            </div>
            <div class="claim-arrow">▶</div>
          </div>
          <div class="claim-details" id="claim-details-${index}">
            <div class="claim-speaker">Speaker: ${claim.participant}</div>
            <div class="claim-verification">${claim.verification_summary}</div>
            ${sourcesHtml}
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners to claim headers
    claimsContainer.querySelectorAll('.claim-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const index = header.getAttribute('data-claim-index');
        toggleClaim(index);
      });
    });
    
    // Add event listeners to sources headers
    claimsContainer.querySelectorAll('.sources-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent claim toggle
        const claimIndex = header.getAttribute('data-claim-index');
        toggleSources(claimIndex);
      });
    });
  }
  
  // Load and display analysis results (legacy function - kept for compatibility)
  async function loadAnalysisResults(reportId) {
    try {
      const report = await supabaseClient.getAnalysisReport(reportId);
      await displayReport(report);
    } catch (error) {
      console.error('Error loading results:', error);
    }
  }
});

function extractVideoId(url) {
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
}

// Function to get status color based on verification status
function getStatusColor(status) {
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
}

// Global function to toggle claim details
function toggleClaim(index) {
  const details = document.getElementById(`claim-details-${index}`);
  const arrow = document.querySelector(`[data-claim-index="${index}"] .claim-arrow`);
  
  if (details.style.display === 'none' || details.style.display === '') {
    details.style.display = 'block';
    arrow.style.transform = 'rotate(90deg)';
  } else {
    details.style.display = 'none';
    arrow.style.transform = 'rotate(0deg)';
  }
}

// Function to generate sources HTML
function generateSourcesHtml(sources, claimIndex) {
  if (!sources || sources.length === 0) {
    return '';
  }
  
  const sourcesListHtml = sources.map(source => `
    <div class="source-item">
      <div class="source-header">
        <div class="source-name">${source.source_name || 'Unknown Source'}</div>
        <div class="source-credibility">${source.credibility || 'Unknown'}</div>
      </div>
      <div class="source-statement">${source.statement || 'No statement available'}</div>
      <div class="source-url">
        <a href="${source.url}" target="_blank">${source.url}</a>
      </div>
    </div>
  `).join('');
  
  return `
    <div class="sources-section">
      <div class="sources-header" data-claim-index="${claimIndex}">
        <span>Sources (${sources.length})</span>
        <span class="sources-toggle">▶</span>
      </div>
      <div class="sources-list" id="sources-${claimIndex}">
        ${sourcesListHtml}
      </div>
    </div>
  `;
}

// Function to toggle sources display
function toggleSources(claimIndex) {
  const sourcesList = document.getElementById(`sources-${claimIndex}`);
  const toggle = document.querySelector(`[data-claim-index="${claimIndex}"] .sources-toggle`);
  
  if (sourcesList.style.display === 'none' || sourcesList.style.display === '') {
    sourcesList.style.display = 'block';
    toggle.classList.add('expanded');
  } else {
    sourcesList.style.display = 'none';
    toggle.classList.remove('expanded');
  }
}

// Make toggleClaim available globally
window.toggleClaim = toggleClaim;

// Cleanup when popup closes
window.addEventListener('beforeunload', () => {
  clearPollingInterval();
  if (window.currentReportId && supabaseClient) {
    supabaseClient.unsubscribeFromAnalysisUpdates(window.currentReportId);
  }
});

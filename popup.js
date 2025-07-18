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
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getVideoInfo',
        videoId: videoId,
        videoUrl: tab.url
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get video info');
      }

      const videoData = response.data;
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

  // Handle analysis with Supabase
  async function handleSupabaseAnalysis(videoData) {
    console.log('🔍 handleSupabaseAnalysis called with:', videoData);
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
      status.textContent = 'Creating analysis report...';
      
      // Create analysis report in Supabase
      const report = await supabaseClient.createAnalysisReport(videoData);
      console.log('Analysis report created:', report);
      
      status.textContent = 'Triggering analysis workflow...';
      
      // Set up real-time subscription for updates
      supabaseClient.subscribeToAnalysisUpdates(report.id, (eventType, data) => {
        console.log('Real-time update:', eventType, data);
        
        if (eventType === 'report_updated') {
          if (data.analysis_status === 'Complete') {
            status.textContent = 'Analysis complete!';
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
            
            // Load and display results
            loadAnalysisResults(report.id);
          } else if (data.analysis_status === 'Failed') {
            status.textContent = 'Analysis failed';
            loading.style.display = 'none';
            analyzeBtn.disabled = false;
          }
        } else if (eventType === 'claim_added') {
          status.textContent = `Processing claims... (${data.original_statement?.substring(0, 50)}...)`;
        }
      });
      
      // Trigger the webhook with video URL
      try {
        const webhookResult = await supabaseClient.triggerWebhook(webhookUrl, videoData.videoUrl);
        console.log('Webhook triggered successfully:', webhookResult);
        status.textContent = 'Analysis workflow started. Waiting for results...';
      } catch (webhookError) {
        console.error('Webhook trigger failed:', webhookError);
        status.textContent = `Webhook error: ${webhookError.message}`;
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
        return;
      }
      
      // Set a timeout in case the workflow doesn't complete
      setTimeout(() => {
        if (loading.style.display !== 'none') {
          status.textContent = 'Analysis is taking longer than expected...';
        }
      }, 30000); // 30 seconds
      
    } catch (error) {
      console.error('Supabase analysis error:', error);
      status.textContent = `Error: ${error.message}`;
      loading.style.display = 'none';
      analyzeBtn.disabled = false;
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
        displayReport(data);
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Re-analyze Claims';
        status.textContent = 'Analysis complete!';
      } else if (data.analysis_status === 'Failed') {
        status.textContent = 'Analysis failed';
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Retry Analysis';
      }
    } else if (eventType === 'claim_added') {
      status.textContent = `Processing claims... (${data.original_statement?.substring(0, 30)}...)`;
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

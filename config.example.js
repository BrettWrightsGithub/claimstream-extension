// Configuration template for ClaimStream Extension
// Copy this file to config.js and fill in your actual values

const CONFIG = {
  // Supabase configuration (public keys only)
  supabase: {
    url: 'https://your-project.supabase.co', // Your Supabase project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Your Supabase ANON key (NOT service_role)
    // IMPORTANT: Use the 'anon' key, NOT the 'service_role' key for client-side code
    // The anon key respects Row Level Security (RLS) policies
  },
  
  // Firebase configuration (public keys only)
  firebase: {
    apiKey: 'AIzaSy...', // Your Firebase API key
    authDomain: 'your-project.firebaseapp.com', // Your Firebase auth domain
    projectId: 'your-project-id', // Your Firebase project ID
  },
  
  // Extension settings
  extension: {
    version: '1.0.0',
    name: 'ClaimStream',
    analysisTimeout: 30000, // 30 seconds
    maxRetries: 3,
    debugMode: true // Set to false in production
  },
  
  // API endpoints (will be Supabase Edge Functions)
  api: {
    analyzeVideo: '/functions/v1/analyze-video',
    getAnalysisStatus: '/functions/v1/get-analysis-status',
    getUserProfile: '/functions/v1/get-user-profile'
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}

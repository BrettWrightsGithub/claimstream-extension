# ClaimStream Chrome Extension

A Chrome extension for verifying claims in YouTube videos with real-time fact-checking.

## Current Status: Phase 2 - Supabase Integration

Phase 1 (Basic Extension) is complete. Phase 2 adds Supabase database integration and real-time updates.

## Features Implemented

### Phase 1 (Complete)
- ✅ Basic Manifest V3 extension structure
- ✅ YouTube video and Shorts detection
- ✅ Popup interface with modern UI
- ✅ Content script injection on YouTube pages
- ✅ Background service worker
- ✅ Video information extraction
- ✅ Extension icons

### Phase 2 (In Progress)
- ✅ Supabase client integration
- ✅ Database schema implementation
- ✅ Real-time subscription setup
- ✅ Analysis report creation
- ✅ Verified claims storage
- ⏳ Supabase Edge Functions
- ⏳ Firebase Authentication
- ⏳ n8n workflow integration

## Testing Instructions

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this project folder
5. The ClaimStream extension should appear in your extensions list

### 2. Test on YouTube

1. Navigate to any YouTube video (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
2. You should see a green "🔍 ClaimStream Active" indicator for 3 seconds
3. Click the ClaimStream extension icon in the toolbar
4. The popup should show video information and an "Analyze Claims" button
5. Click "Analyze Claims" to test the mock analysis flow

### 3. Check Console Logs

- Open Developer Tools (F12)
- Check the Console tab for ClaimStream logs
- Background service worker logs: `chrome://extensions/` → ClaimStream → "service worker" link

## Setup Instructions

### Prerequisites
1. Chrome browser with Developer Mode enabled
2. Supabase account (for database functionality)
3. Basic knowledge of Chrome extensions

### Quick Start (Demo Mode)
1. Load the extension in Chrome (`chrome://extensions/`)
2. Test on YouTube videos - works in demo mode without Supabase

### Full Setup (With Supabase)
1. **Quick Start**: Follow `SETUP.md` for credential configuration
2. **Database Setup**: Follow `SUPABASE_SETUP.md` for database configuration
3. **Copy config**: `cp config.example.js config.js` and fill in your credentials
4. **Test**: Reload the extension and test on YouTube

## Next Steps

1. **Complete Supabase Setup**: Follow `SUPABASE_SETUP.md`
2. **Firebase Auth**: Implement user authentication
3. **Edge Functions**: Create Supabase Edge Function for secure API calls
4. **n8n Integration**: Connect to n8n workflow for claim analysis
5. **Production Polish**: Error handling, UI improvements, performance optimization

## Project Structure

```
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic and UI interactions
├── content.js             # Content script for YouTube pages
├── background.js          # Background service worker
├── config.js              # Configuration file (update with your credentials)
├── supabase-client.js     # Supabase database client
├── icons/                 # Extension icons
├── prd.md                 # Product Requirements Document
├── SUPABASE_SETUP.md      # Detailed Supabase setup guide
├── test-extension.js      # Extension validation script
└── README.md              # This file
```

## Technologies Used

### Frontend
- Chrome Extension Manifest V3
- HTML/CSS/JavaScript
- Chrome Extension APIs (tabs, storage, runtime)

### Backend & Database
- Supabase (PostgreSQL database)
- Supabase Realtime (WebSocket subscriptions)
- Supabase JavaScript Client

### Planned Integrations
- Firebase Authentication
- Supabase Edge Functions
- n8n Workflow Automation

## Patterns and Technologies

- **Architecture**: Manifest V3 with service worker background script
- **Communication**: Message passing between popup, content script, and background
- **Storage**: Chrome extension local storage for basic data
- **UI**: Modern gradient design with glassmorphism effects
- **YouTube Integration**: Content script injection and DOM manipulation

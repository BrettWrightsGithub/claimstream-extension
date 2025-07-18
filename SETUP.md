# ClaimStream Extension Setup Guide

## 🔐 Secure Configuration Setup

### Step 1: Configure Credentials

1. **Copy the example config file:**
   ```bash
   cp config.example.js config.js
   ```

2. **Edit `config.js` with your actual credentials:**
   ```javascript
   const CONFIG = {
     supabase: {
       url: 'https://your-project.supabase.co',
       anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Use ANON key, NOT service_role
     },
     firebase: {
       apiKey: 'AIzaSy...',
       authDomain: 'your-project.firebaseapp.com',
       projectId: 'your-project-id',
     }
   };
   ```

### Step 2: Important Security Notes

⚠️ **CRITICAL**: Use the **ANON** key from Supabase, NOT the service_role key!

- ✅ **Correct**: `anon` key (respects Row Level Security)
- ❌ **Wrong**: `service_role` key (bypasses all security)

To find your ANON key:
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "anon public" key (NOT the "service_role" key)

### Step 3: Database Setup

Follow the detailed instructions in `SUPABASE_SETUP.md` to:
1. Create the database tables
2. Set up Row Level Security policies
3. Configure your webhook URL in the `configs` table

### Step 4: Test the Extension

1. **Load the extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this project folder

2. **Test on YouTube:**
   - Navigate to any YouTube video or Short
   - Click the ClaimStream extension icon
   - Click "Analyze Claims"
   - Check the browser console for debug logs

## 🐛 Debugging Common Issues

### Issue: "Supabase client not ready"

**Symptoms:**
- Extension runs in demo mode
- No webhook calls are made
- Console shows "⚠️ Supabase client not ready"

**Solutions:**
1. Check that `config.js` exists and has valid credentials
2. Verify you're using the ANON key, not service_role key
3. Test your Supabase connection in the dashboard

### Issue: "No webhook URL configured"

**Symptoms:**
- Extension initializes but fails when clicking "Analyze Claims"
- Error: "No webhook URL configured in database"

**Solutions:**
1. Add your webhook URL to the `configs` table:
   ```sql
   INSERT INTO public.configs ("n8nWebhookUrl") 
   VALUES ('https://your-n8n-webhook-url');
   ```

### Issue: Webhook not triggering

**Symptoms:**
- Extension seems to work but webhook doesn't receive calls
- No network requests visible in browser dev tools

**Solutions:**
1. Check browser console for error messages
2. Verify webhook URL is correct in database
3. Test webhook URL manually in browser
4. Check network tab in dev tools for failed requests

## 🔍 Debug Console Logs

When testing, look for these console messages:

**Successful initialization:**
```
🔧 ClaimStream popup loaded
🔧 CONFIG available: true
🔧 supabaseClient available: true
🔧 Supabase URL: https://your-project.supabase.co
✅ Supabase client initialized successfully
```

**Successful analysis:**
```
🔍 Analyze button clicked!
🔍 handleSupabaseAnalysis called with: {...}
🔍 Getting webhook URL from database...
🔍 Webhook URL retrieved: https://your-webhook-url
Triggering webhook: https://your-webhook-url?VideoURL=https://youtube.com/...
```

## 📁 File Structure

```
├── config.example.js      # Template with placeholder values
├── config.js             # Your actual credentials (git-ignored)
├── .gitignore            # Protects config.js from being committed
├── SETUP.md              # This file
└── SUPABASE_SETUP.md     # Detailed database setup
```

## 🚀 Repository Safety

The `config.js` file is automatically ignored by git, so your credentials won't be committed to your repository. Always use `config.example.js` as the template for others to follow.

## 🆘 Need Help?

If you're still having issues:
1. Check all console logs for error messages
2. Verify your Supabase project is not paused
3. Test database connectivity in Supabase dashboard
4. Ensure your webhook URL is accessible

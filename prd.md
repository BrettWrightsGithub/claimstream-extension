roduct Requirements Document: ClaimStream Chrome Extension
Version: 2.0

Date: July 17, 2025

1. Introduction & Vision
1.1. Vision
To empower YouTube viewers with the ability to instantly verify claims made in videos, fostering critical thinking and media literacy directly within their viewing experience.

1.2. Problem Statement
Video content is a primary source of information but is rife with unverified claims. Viewers lack an immediate, integrated tool to fact-check the content they are consuming in real-time.

1.3. Solution
The ClaimStream Chrome Extension is a Manifest V3 browser extension that allows users to initiate a deep analysis of any YouTube video or Short. It will leverage a hybrid backend—Firebase for authentication and Supabase for data storage and server-side logic—to present a clear, interactive verification report directly inside the extension's interface.

2. Core System & User Flow
The user's journey is designed to be simple and intuitive. The system uses a secure, asynchronous architecture to process analysis requests without blocking the user interface.

Initiation (Chrome Extension): A user on a YouTube video page clicks the "Analyze Claims" button.

Secure Trigger (Supabase Edge Function): The extension does not call the n8n webhook directly. Instead, it makes a secure, authenticated request to a Supabase Edge Function, passing the VideoURL.

Orchestration (n8n Workflow): The Supabase Edge Function triggers the n8n webhook. The n8n workflow immediately returns a 200 OK response to the Edge Function, allowing the extension UI to enter the "Processing" state. The workflow then proceeds asynchronously to:

Create an initial record in the analysis_reports table with analysis_status set to 'Processing'.

Execute the multi-step AI analysis chain.

Populate the verified_claims table with results.

Update the analysis_reports record, setting analysis_status to 'Complete'.

Real-Time Update (Supabase & Chrome Extension): The extension uses a Supabase Realtime subscription to listen for changes to the analysis_reports record. When the analysis_status changes to 'Complete', the UI automatically updates to display the final report.

3. Functional Requirements & UI States
The extension popup is a multi-state interface built with React and shadcn/ui.

3.1. State 1: Ready to Analyze
Trigger: User clicks the extension icon on a youtube.com/watch?v= or youtube.com/shorts/ page where no report exists.

UI Elements:

Video Thumbnail, Title, Channel Name, and Duration (scraped from the page).

Primary Action Button: "Analyze Claims in this Video".

3.2. State 2: Authentication (Conditional)
Trigger: User clicks "Analyze Claims" but is not authenticated.

UI Elements:

Heading: "Please Log In to Continue".

Primary Action Button: "Sign In with Google". This will initiate the Firebase Authentication flow.

3.3. State 3: Analysis in Progress
Trigger: A logged-in user initiates an analysis, or the user opens the popup for a video where analysis_status is 'Processing'.

UI Elements:

A "Processing" status indicator.

A loading spinner.

Text confirming the analysis has started.

3.4. State 4: Verification Report
Trigger: The analysis_status for the report is 'Complete'. This is also the default view if a report already exists for the current video.

UI Description:

Header: "Verification Report" title and an overall summary paragraph.

Summary Pills: Color-coded badges for Total, True, Partially True, and False claims.

Claims Accordion: A list of claims, each rendered as a collapsible shadcn/ui accordion item.

Collapsed View: Displays a status color, a status pill (e.g., "True"), and the quoted claim text.

Expanded View: Reveals the speaker, a detailed verification summary, and a nested accordion for viewing sources.

4. Technical Implementation & Configuration
This section provides the core technical specifications required for development.

4.1. Technology Stack
Extension Framework: WXT (wxt.dev)    

UI Framework: React with TypeScript    

Styling: Tailwind CSS    

Component Library: shadcn/ui    

Authentication: Firebase Authentication (Google SSO)    

Database & Backend Logic: Supabase (PostgreSQL, Realtime, Edge Functions)

4.2. Firebase Authentication: Offscreen Document Pattern (Manifest V3)
Manifest V3 prohibits extensions from directly opening authentication popups. The official method is to use an Offscreen Document.   

Hosted Auth Page: Deploy a simple, public webpage (e.g., on Firebase Hosting) that contains the standard Firebase Web SDK and the signInWithPopup logic. This page is not part of the extension and is not subject to its CSP restrictions.

Offscreen Document: Create a minimal offscreen.html file within the extension. This document will load an iframe pointing to your hosted auth page.

Message Passing:

When the user signs in, the hosted page uses window.parent.postMessage() to send the Firebase idToken to the offscreen.html document.

The offscreen.html document forwards this token to the extension's background service worker using chrome.runtime.sendMessage().

Identity Bridge: The service worker sends the received Firebase idToken to a Supabase Edge Function. This function verifies the token and creates a corresponding user in Supabase, returning a Supabase JWT for the extension to use for all subsequent API calls.   

4.3. Supabase Configuration
Client Initialization: The Supabase client should be initialized in the extension's service worker.

Real-Time Subscriptions: The frontend will use Supabase's Realtime client to subscribe to changes on the analysis_reports table. This is a highly efficient method that avoids costly database polling and provides instant UI updates.

4.4. Credential Management & Security
CRITICAL: All sensitive credentials must be stored securely on the backend. Under no circumstances should secrets be bundled in the Chrome extension's client-side code.

Supabase URL & Anon Key: These are public and can be stored as environment variables accessible by the extension's build process.

N8N_WEBHOOK_URL: Store this as a secret in your Supabase project dashboard (Project Settings -> Edge Functions -> Secrets). It should only be accessed from within the Supabase Edge Function that acts as a secure proxy.

SUPABASE_SERVICE_ROLE_KEY & JWT_SECRET: These must also be stored as secrets in the Supabase dashboard and used only within Edge Functions for administrative tasks like user creation.

4.5. Chrome Extension Manifest (manifest.json)
The manifest must be configured for Manifest V3 and include the necessary permissions and a strict Content Security Policy (CSP).

JSON

{
  "manifest_version": 3,
  "name": "ClaimStream",
  "version": "1.0",
  "description": "Instantly verify claims in YouTube videos.",
  "permissions": [
    "storage",
    "scripting",
    "offscreen"
  ],
  "host_permissions": [
    "https://*.youtube.com/"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    "connect-src":
  }
}
Note: Replace <YOUR-PROJECT-REF> with your actual Supabase project reference. This CSP is essential for allowing the extension to communicate with both Firebase and Supabase services.   

5. Data Schema (Supabase PostgreSQL)
The following tables define the core data structure for the application.

5.1. analysis_reports
This table stores the main report for each analyzed video.

SQL

CREATE TABLE public.analysis_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  source_url text NULL,
  summary text NULL,
  created_at timestamp WITH TIME ZONE NULL DEFAULT now(),
  video_title text NULL,
  video_channel_title text NULL,
  video_duration integer NULL,
  video_channel_id text NULL,
  video_thumbnail_image text NULL,
  video_statistics jsonb NULL,
  analysis_status public.reportStatus NULL,
  video_id text NULL,
  CONSTRAINT analysis_reports_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;
5.2. verified_claims
This table stores each individual claim extracted and verified from a video, linked to a parent report.

SQL

CREATE TABLE public.verified_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  report_id uuid NULL,
  original_statement text NULL,
  participant text NULL,
  verification_status public.verificationStatus NULL,
  verification_summary text NULL,
  supporting_evidence jsonb NULL,
  secondary_data jsonb NULL,
  created_at timestamp WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT verified_claims_pkey PRIMARY KEY (id),
  CONSTRAINT verified_claims_report_id_fkey FOREIGN KEY (report_id) REFERENCES analysis_reports (id)
) TABLESPACE pg_default;
5.3. configs
This table is for storing system-wi ` de configurations. Note: Storing the webhook URL here is not secure for client-side access. It should be moved to Supabase Edge Function secrets.

SQL

CREATE TABLE public.configs (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp WITH TIME ZONE NOT NULL DEFAULT now(),
  "n8nWebhookUrl" text NULL,
  CONSTRAINT configs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;
6. Success Metrics
Number of daily/monthly active users.

Number of videos analyzed per day.

User retention rate (30-day).

User feedback and ratings in the Chrome Web Store.
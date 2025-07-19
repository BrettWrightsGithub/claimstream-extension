-- Complete Test Data for Logical Fallacies
-- This script creates a test report with claims containing comprehensive fallacy data

-- Create a test report first, then add claims with complete fallacy data
WITH new_report AS (
  INSERT INTO analysis_reports (
    source_url,
    video_id,
    video_title,
    video_channel_title,
    analysis_status
  ) VALUES (
    'https://youtube.com/watch?v=fallacy_test_123',
    'fallacy_test_123',
    'Test Video: Common Logical Fallacies in Arguments',
    'Critical Thinking Channel',
    'Complete'
  ) RETURNING id
)
INSERT INTO verified_claims (
  report_id,
  original_statement,
  participant,
  verification_status,
  verification_summary,
  supporting_evidence,
  secondary_data
) 
SELECT 
  new_report.id,
  'Climate scientists are just in it for the grant money, and besides, the climate has always changed naturally throughout history.',
  'Climate Skeptic',
  'false',
  'This claim contains multiple logical fallacies and misrepresents scientific consensus',
  '[
    {
      "source_name": "NASA Climate Change",
      "credibility": "High",
      "statement": "Scientific consensus on climate change is based on evidence, not funding",
      "url": "https://climate.nasa.gov/consensus/"
    },
    {
      "source_name": "IPCC Reports",
      "credibility": "High", 
      "statement": "Current climate change is primarily due to human activities",
      "url": "https://www.ipcc.ch/reports/"
    }
  ]'::jsonb,
  '{
    "schema_version": "1.0",
    "logical_fallacies": [
      {
        "id": "fallacy-ad-hominem-001",
        "type": "ad_hominem",
        "name": "Ad Hominem",
        "category": "informal",
        "description": "Attacks the character or motives of climate scientists rather than addressing their scientific evidence",
        "explanatory_snippet": "Questions scientists motives instead of evaluating their evidence",
        "evidence": "Claims scientists are motivated by grant money rather than scientific truth",
        "severity_score": 75,
        "confidence": 0.92,
        "timestamp": "00:01:15",
        "char_start": 0,
        "char_end": 65
      },
      {
        "id": "fallacy-red-herring-001", 
        "type": "red_herring",
        "name": "Red Herring",
        "category": "informal",
        "description": "Diverts attention from human-caused climate change to natural climate variations",
        "explanatory_snippet": "Shifts focus from current human impact to historical natural changes",
        "evidence": "Mentions natural climate change to avoid discussing current human influence",
        "severity_score": 65,
        "confidence": 0.88,
        "timestamp": "00:01:45",
        "char_start": 66,
        "char_end": 140
      },
      {
        "id": "fallacy-false-equivalence-001",
        "type": "false_equivalence", 
        "name": "False Equivalence",
        "category": "informal",
        "description": "Treats natural climate variations and human-caused change as equivalent",
        "explanatory_snippet": "Equates slow natural changes with rapid human-caused warming",
        "evidence": "Implies natural and human climate change are the same phenomenon",
        "severity_score": 70,
        "confidence": 0.85,
        "timestamp": "00:02:00",
        "char_start": 90,
        "char_end": 140
      }
    ],
    "fallacy_summary": [
      {
        "level": "whole_clip",
        "total_count": 3,
        "severity_histogram": {"0-33": 0, "34-66": 0, "67-100": 3},
        "top_fallacies": ["ad_hominem", "red_herring", "false_equivalence"]
      },
      {
        "level": "first_minute",
        "total_count": 1,
        "severity_histogram": {"67-100": 1},
        "top_fallacies": ["ad_hominem"]
      }
    ]
  }'::jsonb
FROM new_report

UNION ALL

SELECT 
  new_report.id,
  'Vaccines cause autism because my neighbor''s kid got vaccinated and then was diagnosed with autism.',
  'Anti-Vaccine Parent',
  'false',
  'This claim demonstrates post hoc reasoning and hasty generalization fallacies',
  '[
    {
      "source_name": "CDC Vaccine Safety",
      "credibility": "High",
      "statement": "Extensive research shows no link between vaccines and autism",
      "url": "https://www.cdc.gov/vaccinesafety/concerns/autism.html"
    },
    {
      "source_name": "Pediatrics Journal",
      "credibility": "High",
      "statement": "Large-scale studies consistently find no vaccine-autism connection", 
      "url": "https://pediatrics.aappublications.org/content/early/2019/02/28/peds.2018-2162"
    }
  ]'::jsonb,
  '{
    "schema_version": "1.0",
    "logical_fallacies": [
      {
        "id": "fallacy-post-hoc-001",
        "type": "post_hoc",
        "name": "Post Hoc Ergo Propter Hoc",
        "category": "formal",
        "description": "Assumes that because autism diagnosis came after vaccination, vaccination caused autism",
        "explanatory_snippet": "Confuses correlation with causation based on timing",
        "evidence": "Claims vaccination caused autism simply because diagnosis followed vaccination",
        "severity_score": 85,
        "confidence": 0.95,
        "timestamp": "00:00:30",
        "char_start": 25,
        "char_end": 95
      },
      {
        "id": "fallacy-hasty-gen-001",
        "type": "hasty_generalization",
        "name": "Hasty Generalization", 
        "category": "informal",
        "description": "Makes broad conclusion about all vaccines based on single anecdotal case",
        "explanatory_snippet": "Generalizes from one case to all vaccine safety",
        "evidence": "Uses single neighbor example to make claims about all vaccines",
        "severity_score": 80,
        "confidence": 0.90,
        "timestamp": "00:00:45",
        "char_start": 0,
        "char_end": 25
      },
      {
        "id": "fallacy-anecdotal-001",
        "type": "anecdotal_evidence",
        "name": "Anecdotal Evidence",
        "category": "informal", 
        "description": "Uses personal story as evidence instead of scientific research",
        "explanatory_snippet": "Relies on personal anecdote over scientific evidence",
        "evidence": "Presents neighbor story as proof rather than citing research",
        "severity_score": 70,
        "confidence": 0.87,
        "timestamp": "00:01:00",
        "char_start": 40,
        "char_end": 95
      }
    ],
    "fallacy_summary": [
      {
        "level": "whole_clip", 
        "total_count": 3,
        "severity_histogram": {"0-33": 0, "34-66": 0, "67-100": 3},
        "top_fallacies": ["post_hoc", "hasty_generalization", "anecdotal_evidence"]
      }
    ]
  }'::jsonb
FROM new_report;

-- Query to verify the data was inserted correctly
SELECT 
  ar.video_title,
  vc.original_statement,
  vc.participant,
  vc.verification_status,
  jsonb_pretty(vc.secondary_data) as fallacy_data
FROM analysis_reports ar
JOIN verified_claims vc ON ar.id = vc.report_id  
WHERE ar.video_id = 'fallacy_test_123'
ORDER BY vc.created_at;

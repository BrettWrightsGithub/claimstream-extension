

# 🧪 ClaimStream Chrome Extension – UI Redesign Brief

## ✅ What's Working
- **Clear title and section headers** (“Verification Report” is strong)
- Logical grouping of claim verdicts (True, Partially True, False)
- Good use of iconography (✔️🟡❌) to visually categorize claims

## ⚠️ Issues Identified
| Issue | Description | Suggested Fix |
|-------|-------------|----------------|
| **Font size is too small** | Especially in body text; hard to read without zooming in | Increase base font size to **at least 14px** (preferably 16px) |
| **Text block density** | Long claims in small cards lead to visual fatigue | Add line spacing (1.5x), padding, and optional expand toggles |
| **Contrast strain** | Black-on-dark-blue may strain the eye | Use a lighter panel background or white cards |
| **Visual hierarchy flatness** | Title, sections, and claims feel visually similar | Differentiate with font weights and sizes |

---

## 🎨 Styling Guidance

### 🔤 Typography

| Element          | Font             | Weight      | Size      | Notes |
|------------------|------------------|-------------|-----------|-------|
| Header           | Inter / sans-serif | Bold        | 20–22px   | Brand color text |
| Subheader        | Inter              | Semi-bold   | 16–18px   | Add spacing below |
| Claim Text       | Inter              | Regular     | 16px      | Use `line-height: 1.5`, `padding: 8px` |
| Status Label     | Inter              | Medium      | 14px      | Add color-coded icon & bold label |

---

### 📐 Layout Adjustments

| UI Element           | Current       | Recommended         |
|----------------------|---------------|----------------------|
| Panel Width          | ~300px        | 350–380px if room allows |
| Claim Box Height     | Fixed         | Flexible with max-height + scroll |
| Padding              | Tight         | 12–16px internal padding |
| Claim Spacing        | Minimal       | Margin-bottom: 12px |

---

### 🧩 Optional Enhancements
- Rounded corners on claim boxes (`border-radius: 8px`)
- Alternate card background color: `#F1F5F9`
- Add **“View Evidence”** or **“Expand”** CTA on each claim

---

## 📸 Visual Layout Suggestion

- **Top Panel:**
  - `ClaimStream` title (bold, white, 20px) on indigo background
  - “Verification Report” header with summary stats

- **Claim Cards:**
  - Light background (e.g., `#F8FAFC`)
  - Status icon + label (✔️ True / ⚠️ Partially True / ❌ False)
  - Padded claim body text
  - Optional expandable section for source material

---

## 📁 Note for Chrome Extensions
- Bundle fonts locally (avoid CDNs due to CSP)
- Minimize inline styles; prefer class-based CSS
- Keep DOM light to avoid lag on YouTube pages

---

Let me know if you'd like a Figma mockup or starter HTML/CSS version.

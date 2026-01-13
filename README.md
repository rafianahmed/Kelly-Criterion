# Kelly Criterion Calculator

A simple, deployable Kelly Criterion calculator (single binary bet) with:
- Full Kelly fraction (raw + clamped)
- Fractional Kelly slider (e.g., half-Kelly)
- Optional bankroll → recommended stake
- Step-by-step calculation breakdown

## Formula
For win probability **p**, lose probability **q = 1 - p**, and net odds **b** (profit per 1 unit staked):

**f\* = (b·p − q) / b**

If **f\* ≤ 0**, the wager has no positive edge → bet 0 (common practical rule).

## Odds conversion
- Decimal odds **D** → **b = D − 1**
- Fractional odds **A/B** → **b = A/B**

## Run locally
Just open `index.html` in your browser.

(Optional) If you want a local server:
- Python: `python -m http.server 8000`
- Then visit: `http://localhost:8000`

## Deploy to GitHub Pages (fastest)
1. Create a new repo on GitHub (e.g., `kelly-calculator`)
2. Upload these files:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
3. Go to **Settings → Pages**
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)**
5. Save. Your site will be live at:
   `https://<your-username>.github.io/kelly-calculator/`

## Disclaimer
Educational tool only. Kelly sizing can be risky and is sensitive to probability estimation errors.

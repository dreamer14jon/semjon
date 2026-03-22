# Search Marketing Simulation Game

This project implements a browser‑based simulation game for teaching the basics of search marketing.  It is designed for group‑based classroom activities where teams compete across three rounds of keyword selection, ad copy creation, budget allocation and campaign optimisation.  The application is built with only HTML, CSS and JavaScript and persists game state in the browser using `localStorage`.  No back‑end or server side technology is required.

## 📁 Project Structure

```
marketing-game/
├── index.html           # Login page for admins and groups
├── admin.html           # Admin dashboard to manage groups and rounds
├── group.html           # Group dashboard for keyword selection and ad creation
├── css/
│   └── styles.css       # Shared styles for all pages
├── js/
│   ├── common.js        # Shared utilities and simulation logic
│   ├── admin.js         # Logic for the admin dashboard
│   └── group.js         # Logic for the group dashboard
├── data/
│   ├── data.json        # Keyword, audience and landing page definitions (JSON)
│   └── keywords.xlsx    # Same data in Excel format for easy editing
└── README.md            # This file
```

### Data Files

The game reads its data from `data/data.json`.  The JSON file contains three collections:

* **keywords** – Each entry defines a keyword, its monthly search volume in Singapore, cost‑per‑click (CPC), competition level and suggested audience segment.
* **audiences** – Audience segments (“bags”) with descriptions and estimated audience sizes.
* **landingPages** – Predefined landing pages with descriptions and associated audiences.

An equivalent Excel workbook (`data/keywords.xlsx`) is provided with the same information organised into separate sheets (`keywords`, `audiences`, `landingPages`).  To modify the dataset, edit the Excel file and re‑export it to JSON using a tool of your choice or the following Python snippet:

```python
import pandas as pd, json
excel_path = 'data/keywords.xlsx'
data = {}
with pd.ExcelWriter(excel_path) as writer:
    # When updating, write each DataFrame to its sheet
    pass
# Convert back to JSON
data = {
    'keywords': pd.read_excel(excel_path, sheet_name='keywords').to_dict(orient='records'),
    'audiences': pd.read_excel(excel_path, sheet_name='audiences').to_dict(orient='records'),
    'landingPages': pd.read_excel(excel_path, sheet_name='landingPages').to_dict(orient='records'),
}
json.dump(data, open('data/data.json', 'w'), indent=2)
```

## 🧩 Game Overview

* **Rounds** – The simulation runs over three rounds.  Round 1 provides a budget of **SGD 1 200** and exposes only the first audience segment.  Round 2 increases the budget to **SGD 2 400** and adds a second audience segment.  Round 3 provides **SGD 3 600** and includes all three audience segments.
* **Admin role** – The admin can create and delete group accounts, start/reset the game, advance rounds, view group readiness and see the leaderboard.  The admin dashboard shows each group’s total spend, sales, impressions, clicks and ROI.  The admin can only advance to the next round when **all groups have marked themselves ready**, though an override is available.
* **Group role** – Groups log in with their assigned credentials, edit their display name, select keywords (with budget allocations), craft a simple headline and description, choose a landing page and submit their campaign.  After submission the group must click **READY** to lock in their choices.  Results for a round are only displayed after the admin advances to the next round.
* **Simulation logic** – The app uses a simplified model based on published marketing metrics.  CTR is calculated as clicks divided by impressions and is typically around 3–5 %【721246973352449†L238-L274】.  A baseline conversion rate of ~2 % reflects visitors who complete a purchase or goal【491005646056394†L73-L82】.  ROI is defined as (revenue – spend) ÷ spend【916191538178660†L177-L183】.  The model adjusts click‑through and conversion rates based on ad relevance (keywords in the ad text and alignment between the landing page and audience) and distributes spend according to the budget allocated to each keyword.  A constant revenue per conversion is assumed for simplicity.

## 🚀 Running Locally

Because the application uses `fetch()` to load JSON and persists state in `localStorage`, it must be served from an HTTP server rather than opened directly from disk in some browsers.  To run a simple local server with Python:

```bash
cd marketing-game
python -m http.server 8000
```

Then navigate to `http://localhost:8000/index.html` in your browser.  (Note that some browser extensions may block `localhost`; if so, try using `0.0.0.0` instead.)  The admin login defaults to username `admin` and password `password`.  Group accounts can be created via the admin dashboard.

## 🌐 Deploying on GitHub Pages

GitHub Pages can host static sites directly from a repository.  To deploy:

1. Create a new repository (e.g. `search‑marketing‑game`) and copy the contents of the `marketing-game` folder into the repository root.
2. Commit all files and push to GitHub.
3. In the repository settings under **Pages**, select the branch (`main` or `master`) and the root folder (not `/docs`) as the source.
4. Save your settings.  GitHub will build and serve your site at `https://USERNAME.github.io/REPOSITORY/`.  You can then share the `index.html` link with your students.

Since no back‑end services are required, the game will run entirely in the browser on GitHub Pages.  Note that each user’s progress is stored in their own browser via `localStorage`; if they clear their browser data the progress will reset.

## ✅ Extending the Simulation

The provided code is intentionally modular to make it easy to extend.  Potential enhancements include:

* **More nuanced simulation** – Introduce variation in revenue per conversion by product or audience, add quality score impacts on CPC, or incorporate seasonality.
* **Reporting** – Export group results to CSV or display charts for impressions, clicks and conversions over time.
* **Improved security** – The current authentication scheme is purely for simulation.  For a production environment you would implement proper user management on the server side.

Feel free to modify the data set, adjust the formulas or refine the user interface to suit your teaching objectives.
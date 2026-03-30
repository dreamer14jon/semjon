# SG Search Marketing Simulator Starter Kit

This starter kit gives you three parts:

1. **`index.html`** — the GitHub Pages frontend
2. **`google_sheets_template.xlsx`** — upload this into Google Drive and open it as Google Sheets
3. **`appsscript/Code.gs`** — the Apps Script backend that reads/writes the Google Sheet

---

## What this supports

- Group login
- Admin login
- Admin create group
- Admin delete group
- Admin reset group round to 1
- Each group can edit:
  - group name
  - class/details
  - student names (up to 6)
- 3 rounds with fixed budgets:
  - Round 1: SGD 1,200
  - Round 2: SGD 2,400
  - Round 3: SGD 3,600
- Singapore keyword database
- Includes **lower-relevance keywords**
- Results vary by about **±5%**
- Ad copy has a **bigger impact**
- Per-keyword results
- Leaderboard with **student names**

---

## Files

- `index.html`
- `google_sheets_template.xlsx`
- `appsscript/Code.gs`
- `appsscript/appsscript.json`

---

## Step 1 — Set up the Google Sheet

1. Upload `google_sheets_template.xlsx` to Google Drive
2. Open it with **Google Sheets**
3. Rename the spreadsheet if you want
4. Keep the tab names exactly as they are:
   - `Config`
   - `Keywords`
   - `LandingPages`
   - `AdCopyOptions`
   - `Groups`
   - `Leaderboard`
   - `AuditLog`
   - `Group_group1`
   - `Group_group2`
   - `Group_group3`

You can add more later through the admin panel or manually.

---

## Step 2 — Set up Apps Script

1. In the Google Sheet, go to **Extensions > Apps Script**
2. Delete the default code
3. Paste in `appsscript/Code.gs`
4. Open **Project Settings** and make sure the manifest is used if needed
5. Replace `appsscript.json` content if Apps Script asks for it

---

## Step 3 — Deploy the web app

1. In Apps Script, click **Deploy > New deployment**
2. Choose **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
   - For classroom testing this is the simplest setup
5. Deploy
6. Copy the `/exec` URL

Example:
`https://script.google.com/macros/s/XXXXXXXXXXXX/exec`

---

## Step 4 — Connect the frontend

You have 2 ways:

### Option A — quick way
Open `index.html` in the browser and paste the Apps Script URL into the setup field.

### Option B — permanent way
Open `index.html` and replace:

```js
const DEFAULT_API_URL = "";
```

with:

```js
const DEFAULT_API_URL = "YOUR_APPS_SCRIPT_EXEC_URL";
```

Then save the file.

---

## Step 5 — Upload to GitHub Pages

1. Create a GitHub repo
2. Upload `index.html`
3. In GitHub:
   - go to **Settings > Pages**
   - choose the branch
   - save
4. GitHub Pages will give you a public URL

---

## Default logins

### Admin
- Username: `admin`
- Password: `admin123`

Change these in the `Config` tab.

### Groups
- `group1 / pass123`
- `group2 / pass123`
- `group3 / pass123`

You can change them in the `Groups` tab.

---

## Important note on security

This is fine for a classroom simulator, but it is **not enterprise-grade security**.

It uses:
- a public frontend on GitHub Pages
- a lightweight Apps Script backend
- JSONP so the static frontend can call Apps Script easily

For class use, that is usually okay. For higher-security deployment, you would want a proper backend and authentication layer.

---

## How the data is structured

### `Groups`
Stores:
- login
- password
- group name
- student names
- details
- current round
- status

### `Group_<loginId>`
Each group gets one sheet tab for round submissions.

Each submission stores:
- round
- bag
- budget
- selected keywords
- selected copy
- selected landing page
- target audience notes
- results
- recommendation
- keyword breakdown JSON

### `Leaderboard`
Latest result per group.

### `AuditLog`
Tracks key admin and group actions.

---

## Suggested tweaks you can make

### 1. Increase realism further
Adjust in `Config`:
- `random_min`
- `random_max`

Current:
- `0.95`
- `1.05`

### 2. Add more keywords
Add more rows in `Keywords`

### 3. Add more ad copy options
Add more rows in `AdCopyOptions`

### 4. Add more landing pages
Add more rows in `LandingPages`

### 5. Change budgets
Edit in `Config`

---

## Recommended next improvements

- Add keyword match types
- Add negative keywords
- Add quality score display
- Add separate CPC inflation for broad keywords
- Add a “trial round” mode
- Add a timer for each round
- Add download/export result button

---

## Troubleshooting

### “Could not reach Apps Script URL”
- Make sure you deployed the web app
- Make sure the URL ends in `/exec`
- Make sure access is set to **Anyone**

### “Missing sheet”
- Check that your Google Sheet tab names match exactly

### Group cannot log in
- Check the `Groups` tab
- Confirm login ID, password, and `status = Active`

### Admin login fails
- Check the `Config` tab values for:
  - `admin_username`
  - `admin_password`

---

## Final note

This is a strong starter version, not the final polished simulator. It is designed so you can:
- upload fast
- test quickly
- edit the Google Sheet directly
- refine the teaching logic later

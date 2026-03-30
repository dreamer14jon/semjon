# SG Search Marketing Simulator Starter Kit

This version has been updated to match the latest class flow more closely.

## Included files

- `index.html` — GitHub Pages frontend
- `google_sheets_template.xlsx` — upload into Google Drive, then open as Google Sheets
- `appsscript/Code.gs` — Apps Script backend
- `appsscript/appsscript.json` — Apps Script manifest

## What is updated in this version

- Admin page requires username and password
- Apps Script URL field is shown only on the **admin login page**
- Students do **not** see the backend setup field
- Keyword database now contains **100 keywords**
- Includes **low-relevance keywords**
- Students now enter **their own ad copy per keyword row**
- Students also allocate **budget per keyword row**
- Admin can turn **trial mode ON/OFF**
- While trial mode is ON:
  - students can run trial results
  - trial does **not** advance the round
  - trial does **not** update the official leaderboard
- When trial mode is OFF:
  - students can submit the official round
  - after official submission they can click **Next Round**
- Admin can:
  - create groups
  - delete groups
  - reset a group back to Round 1
  - see leaderboard
  - see student names in each group

## Round budgets

- Round 1: SGD 1,200
- Round 2: SGD 2,400
- Round 3: SGD 3,600

## Google Sheet tabs

Keep these tab names exactly:

- `Config`
- `Keywords`
- `LandingPages`
- `AdCopyGuide`
- `Groups`
- `Leaderboard`
- `AuditLog`
- `Group_group1`
- `Group_group2`
- `Group_group3`

## Default logins

### Admin
- Username: `admin`
- Password: `admin123`

### Groups
- `group1 / pass123`
- `group2 / pass123`
- `group3 / pass123`

You can change these in the Google Sheet.

## Setup steps

### 1. Upload the spreadsheet
1. Upload `google_sheets_template.xlsx` to Google Drive
2. Open it with Google Sheets

### 2. Add the Apps Script
1. In the Google Sheet, open **Extensions > Apps Script**
2. Delete the default code
3. Paste in `appsscript/Code.gs`
4. Replace the manifest with `appsscript/appsscript.json` if needed

### 3. Deploy the Apps Script web app
1. Click **Deploy > New deployment**
2. Choose **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy
6. Copy the `/exec` URL

### 4. Connect the frontend
1. Open `index.html`
2. Go to the **Admin Login** page
3. Expand **Backend setup**
4. Paste the Apps Script `/exec` URL
5. Save it in the browser

You can also hardcode it by replacing:

```js
const DEFAULT_API_URL = "";
```

with your actual `/exec` URL.

### 5. Upload to GitHub Pages
1. Create a GitHub repo
2. Upload `index.html`
3. In GitHub, go to **Settings > Pages**
4. Publish from your selected branch

## How students use it

1. Login with group credentials
2. Save their group name and student names
3. Review the keyword database
4. Pick a landing page
5. Build keyword rows with:
   - keyword
   - budget
   - headline
   - description
6. Run trials while trial mode is ON
7. Submit official round when trial mode is OFF
8. Click Next Round after official submission

## Notes

- This is suitable for class use, not enterprise-grade security
- The frontend uses JSONP so GitHub Pages can talk to Apps Script
- Result variation remains about ±5%
- Ad copy now has a much stronger influence because each keyword row is scored separately

## Suggested next improvements

- Add match types
- Add negative keywords
- Show Quality Score per row
- Add round timer
- Add export button for admin


## Latest optimisation

- Students now see only the teaching-friendly keyword fields: keyword, theme, target audience, monthly searches, and CPC
- Bag-fit scores and low-relevance flags are hidden from students and shown only in an admin-only keyword diagnostics table
- Students now choose a landing page for each keyword row instead of one landing page for the full round
- The student dashboard now explains the 3-round structure, with one more bag added each round
- Bag descriptions are richer so students understand the scenario before planning
- An ad copy guide is shown to students as a reference before they write their own keyword-level copy

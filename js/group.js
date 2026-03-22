/*
 * Group dashboard script. Handles keyword selection, budget allocation, ad copy
 * creation, landing page choice, submission of campaigns and readiness.
 */
(function () {
  const utils = window.gameUtils;
  // Check if user is authenticated as a group
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser || currentUser.role !== 'group') {
    window.location.href = 'index.html';
    return;
  }
  const username = currentUser.username;

  // DOM elements
  const logoutBtn = document.getElementById('logoutBtn');
  const groupNameInput = document.getElementById('groupNameInput');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const roundDisplay = document.getElementById('roundDisplay');
  const budgetDisplay = document.getElementById('budgetDisplay');
  const roundTitle = document.getElementById('roundTitle');
  const keywordTableBody = document.querySelector('#keywordTable tbody');
  const landingPageSelect = document.getElementById('landingPageSelect');
  const headlineInput = document.getElementById('headlineInput');
  const descriptionInput = document.getElementById('descriptionInput');
  const submitBtn = document.getElementById('submitCampaignBtn');
  const readyBtn = document.getElementById('readyBtn');
  const budgetInfo = document.getElementById('budgetInfo');
  const previousResultsSection = document.getElementById('previousResults');
  const resultsContainer = document.getElementById('resultsContainer');
  const roundArea = document.getElementById('roundArea');

  // Elements for password change
  const changeGroupPwdBtn = document.getElementById('changeGroupPwdBtn');
  const groupChangePwdModal = document.getElementById('groupChangePwdModal');
  const closeGroupChangePwdModal = document.getElementById('closeGroupChangePwdModal');
  const confirmGroupChangePwd = document.getElementById('confirmGroupChangePwd');
  const currentGroupPwdInput = document.getElementById('currentGroupPwd');
  const newGroupPwdInput = document.getElementById('newGroupPwd');

  // Round budgets (in SGD) per round: 1 → 1200, 2 → 2400, 3 → 3600
  const roundBudgets = [1200, 2400, 3600];
  let group;
  let availableKeywords = [];
  let selectedKeywords = [];
  let currentRound;
  let bagName;

  // Load data and initialise the page
  utils.loadGameData().then(initPage);

  function initPage() {
    group = utils.findGroup(username);
    // If group is missing (e.g. deleted by admin), redirect
    if (!group) {
      alert('Your group no longer exists.');
      window.location.href = 'index.html';
      return;
    }
    currentRound = group.round;
    // Determine the main bag name for this round (index round-1)
    const audiences = utils.getAudiencesForRound(currentRound);
    bagName = audiences[currentRound - 1];
    // Populate group name field
    groupNameInput.value = group.name;
    roundDisplay.textContent = currentRound;
    // Determine budget for current round
    const budget = roundBudgets[currentRound - 1];
    budgetDisplay.textContent = budget.toFixed(2);
    // Load available keywords and landing pages
    availableKeywords = utils.getKeywordsForAudiences(audiences);
    renderKeywordTable();
    renderLandingPages(audiences);
    // Show previous results if any
    renderPreviousResults();
    // Disable editing if group already ready for this round
    if (group.ready) {
      lockInputs(true);
      readyBtn.disabled = true;
      readyBtn.textContent = 'Ready ✅';
    }
    // Update budget info display
    updateBudgetInfo();
  }

  /**
   * Render the keywords table with checkboxes and budget allocation inputs.
   */
  function renderKeywordTable() {
    keywordTableBody.innerHTML = '';
    selectedKeywords = [];
    availableKeywords.forEach((kw, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="checkbox" id="kwCheck_${idx}" data-index="${idx}"></td>
        <td>${escapeHtml(kw.keyword)}</td>
        <td>${kw.search_volume}</td>
        <td>${kw.cpc.toFixed(2)}</td>
        <td>${kw.competition}</td>
        <td>${kw.audience}</td>
        <td><input type="number" id="kwBudget_${idx}" data-index="${idx}" min="0" step="0.01" style="width:90px;" disabled></td>
      `;
      keywordTableBody.appendChild(row);
    });
    // Add listeners
    availableKeywords.forEach((kw, idx) => {
      const checkbox = document.getElementById(`kwCheck_${idx}`);
      const budgetInput = document.getElementById(`kwBudget_${idx}`);
      checkbox.addEventListener('change', function () {
        if (this.checked) {
          budgetInput.disabled = false;
          budgetInput.value = '';
        } else {
          budgetInput.disabled = true;
          budgetInput.value = '';
        }
        updateSelectedKeywords();
        updateBudgetInfo();
      });
      budgetInput.addEventListener('input', function () {
        updateSelectedKeywords();
        updateBudgetInfo();
      });
    });
  }

  /**
   * Render landing page options filtered by available audiences.
   * @param {Array<string>} audiences
   */
  function renderLandingPages(audiences) {
    const pages = utils.getLandingPages(audiences);
    landingPageSelect.innerHTML = '';
    pages.forEach(lp => {
      const opt = document.createElement('option');
      opt.value = lp.id;
      opt.textContent = `${lp.name} (${lp.audience})`;
      landingPageSelect.appendChild(opt);
    });
  }

  /**
   * Update selectedKeywords array from table inputs.
   */
  function updateSelectedKeywords() {
    selectedKeywords = [];
    availableKeywords.forEach((kw, idx) => {
      const check = document.getElementById(`kwCheck_${idx}`);
      const budgetInput = document.getElementById(`kwBudget_${idx}`);
      if (check.checked) {
        const allocation = parseFloat(budgetInput.value) || 0;
        selectedKeywords.push({ keyword: kw.keyword, budget: allocation });
      }
    });
  }

  /**
   * Compute and display the total allocated budget vs available budget.
   */
  function updateBudgetInfo() {
    const budget = roundBudgets[currentRound - 1];
    const allocated = selectedKeywords.reduce((sum, item) => sum + (item.budget || 0), 0);
    const remaining = budget - allocated;
    let msg = `Allocated: $${allocated.toFixed(2)} / $${budget.toFixed(2)}`;
    if (remaining < 0) {
      msg += ' (Over budget!)';
      budgetInfo.style.color = '#dc3545';
    } else {
      msg += ` (Remaining: $${remaining.toFixed(2)})`;
      budgetInfo.style.color = '#000';
    }
    budgetInfo.textContent = msg;
    // Enable submit button only when at least one keyword selected and not over budget
    submitBtn.disabled = !(selectedKeywords.length > 0 && remaining >= 0 && !group.ready);
  }

  /**
   * Escape HTML special characters.
   */
  function escapeHtml(str) {
    return String(str).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[s]);
  }

  /**
   * Lock or unlock all input elements based on readiness state.
   * @param {boolean} lock
   */
  function lockInputs(lock) {
    // Disable keyword checkboxes and budget inputs
    availableKeywords.forEach((kw, idx) => {
      document.getElementById(`kwCheck_${idx}`).disabled = lock;
      document.getElementById(`kwBudget_${idx}`).disabled = lock;
    });
    // Disable ad copy and landing page selectors
    headlineInput.disabled = lock;
    descriptionInput.disabled = lock;
    landingPageSelect.disabled = lock;
    submitBtn.disabled = lock;
  }

  /**
   * Render past round results.
   */
  function renderPreviousResults() {
    // Show previous results section if there are results from completed rounds
    const results = group.results || [];
    const previous = results.filter(r => r.round < group.round);
    if (previous.length === 0) {
      previousResultsSection.style.display = 'none';
      return;
    }
    previousResultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    previous.forEach(entry => {
      const div = document.createElement('div');
      div.classList.add('results');
      div.classList.add('show');
      const summary = entry.summary;
      // Generate simple recommendation: find keyword with highest ROI
      let bestKw = '';
      let bestROI = -Infinity;
      entry.summary.keywordResults.forEach(kRes => {
        const roi = kRes.spend > 0 ? (kRes.sales - kRes.spend) / kRes.spend : 0;
        if (roi > bestROI) {
          bestROI = roi;
          bestKw = kRes.keyword;
        }
      });
      const recommendation = bestKw ? `Consider allocating more budget to "${bestKw}" next time.` : '';
      div.innerHTML = `
        <h3>Round ${entry.round} Results</h3>
        <p><strong>Impressions:</strong> ${summary.totalImpressions} | <strong>Clicks:</strong> ${summary.totalClicks} | <strong>Spend:</strong> $${summary.totalSpend.toFixed(2)} | <strong>Sales:</strong> $${summary.totalSales.toFixed(2)} | <strong>ROI:</strong> ${summary.roi.toFixed(2)}%</p>
        <p><em>${escapeHtml(recommendation)}</em></p>
        <table>
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>Spend (SGD)</th>
              <th>Sales (SGD)</th>
            </tr>
          </thead>
          <tbody>
            ${entry.summary.keywordResults.map(kRes => `<tr><td>${escapeHtml(kRes.keyword)}</td><td>${kRes.impressions}</td><td>${kRes.clicks}</td><td>${kRes.spend.toFixed(2)}</td><td>${kRes.sales.toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
      `;
      resultsContainer.appendChild(div);
    });
  }

  // Save group name change
  saveNameBtn.addEventListener('click', function () {
    const newName = groupNameInput.value.trim();
    if (!newName) {
      alert('Group name cannot be empty.');
      return;
    }
    group.name = newName;
    utils.updateGroup(group);
    alert('Group name updated.');
    // update leaderboard maybe? no need here
  });

  // Submit campaign
  submitBtn.addEventListener('click', function () {
    if (group.ready) return;
    updateSelectedKeywords();
    const budget = roundBudgets[currentRound - 1];
    const totalAllocated = selectedKeywords.reduce((sum, k) => sum + (k.budget || 0), 0);
    if (selectedKeywords.length === 0) {
      alert('Please select at least one keyword and allocate budget.');
      return;
    }
    if (totalAllocated > budget) {
      alert('You have exceeded your budget. Please adjust allocations.');
      return;
    }
    // Create ad copy and landing page selection
    const headline = headlineInput.value.trim();
    const description = descriptionInput.value.trim();
    if (!headline || !description) {
      alert('Please enter both headline and description for your ad.');
      return;
    }
    const landingPageId = landingPageSelect.value;
    // Find the selected landing page from all pages
    const pages = utils.getLandingPages();
    const lp = pages.find(p => p.id === landingPageId);
    // Simulate the round
    const summary = utils.simulateRound(selectedKeywords, { headline, description }, lp, bagName);
    // Append result
    group.results = group.results || [];
    group.results.push({
      round: currentRound,
      selection: {
        keywords: selectedKeywords,
        headline,
        description,
        landingPageId
      },
      summary
    });
    // Persist results but do not mark ready yet
    utils.updateGroup(group);
    // Inform user and enable Ready button
    alert('Campaign submitted. Review your selections and click READY when you are done.');
    // Lock editing to prevent changes after submission until next round
    lockInputs(true);
    readyBtn.disabled = false;
  });

  // Ready button
  readyBtn.addEventListener('click', function () {
    if (group.ready) return;
    group.ready = true;
    utils.updateGroup(group);
    readyBtn.disabled = true;
    readyBtn.textContent = 'Ready ✅';
    alert('You are marked as ready. Please wait for the admin to start the next round.');
  });

  /**
   * Group password change functionality. Allows group users to update their own
   * password by entering the current password and a new password. Updates
   * persisted data in localStorage.
   */
  if (typeof changeGroupPwdBtn !== 'undefined' && changeGroupPwdBtn) {
    changeGroupPwdBtn.addEventListener('click', function () {
      currentGroupPwdInput.value = '';
      newGroupPwdInput.value = '';
      groupChangePwdModal.style.display = 'flex';
    });
  }
  if (typeof closeGroupChangePwdModal !== 'undefined' && closeGroupChangePwdModal) {
    closeGroupChangePwdModal.addEventListener('click', function () {
      groupChangePwdModal.style.display = 'none';
    });
  }
  if (typeof confirmGroupChangePwd !== 'undefined' && confirmGroupChangePwd) {
    confirmGroupChangePwd.addEventListener('click', function () {
      const currentPwd = currentGroupPwdInput.value;
      const newPwd = newGroupPwdInput.value;
      if (!currentPwd || !newPwd) {
        alert('Please fill in both password fields');
        return;
      }
      // Retrieve group list and find this group
      const groups = utils.getGroups();
      const grp = groups.find(g => g.username === username);
      if (!grp) {
        alert('Group not found');
        return;
      }
      if (currentPwd !== grp.password) {
        alert('Current password is incorrect');
        return;
      }
      grp.password = newPwd;
      utils.saveGroups(groups);
      alert('Password updated successfully');
      groupChangePwdModal.style.display = 'none';
    });
  }

  // Logout
  logoutBtn.addEventListener('click', function () {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  });

})();
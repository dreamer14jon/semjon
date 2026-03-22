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
  // Removed global ad copy inputs; ad copy is now per keyword
  const mockSubmitBtn = document.getElementById('mockSubmitBtn');
  const submitBtn = document.getElementById('submitCampaignBtn');
  const readyBtn = document.getElementById('readyBtn');
  const budgetInfo = document.getElementById('budgetInfo');
  const previousResultsSection = document.getElementById('previousResults');
  const resultsContainer = document.getElementById('resultsContainer');
  const roundArea = document.getElementById('roundArea');
  const audienceInfoDiv = document.getElementById('audienceInfo');

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
  let selectedKeywordsDetailed = [];
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
    // Determine audiences and bag name. For trial round (0), use first audience only.
    const audiences = utils.getAudiencesForRound(currentRound > 0 ? currentRound : 1);
    bagName = audiences[(currentRound > 0 ? currentRound : 1) - 1];
    // Populate group name field
    groupNameInput.value = group.name;
    // Display round; show 'Trial' for round 0
    if (currentRound === 0) {
      roundDisplay.textContent = 'Trial';
      roundTitle.textContent = 'Trial Round – Practice Setup';
    } else {
      roundDisplay.textContent = currentRound;
      roundTitle.textContent = `Round ${currentRound} – Campaign Setup`;
    }
    // Determine budget for current round (use first round budget for trial)
    const budget = currentRound === 0 ? roundBudgets[0] : roundBudgets[currentRound - 1];
    budgetDisplay.textContent = budget.toFixed(2);
    // Display audience info including descriptions, sizes and prices
    renderAudienceInfo(audiences);
    // Load available keywords and landing pages
    availableKeywords = utils.getKeywordsForAudiences(audiences);
    renderKeywordTable();
    renderLandingPages(audiences);
    // Show previous results if any (only for real rounds > 1)
    renderPreviousResults();
    // Ready button visibility: hide in trial
    if (currentRound === 0) {
      readyBtn.style.display = 'none';
      mockSubmitBtn.style.display = 'inline-block';
    } else {
      readyBtn.style.display = 'inline-block';
      mockSubmitBtn.style.display = 'none';
    }
    // If group is already marked ready (not applicable to trial), lock inputs
    if (group.ready && currentRound > 0) {
      lockInputs(true);
      readyBtn.disabled = false;
      readyBtn.textContent = 'Ready ✅';
    } else {
      readyBtn.disabled = false;
      readyBtn.textContent = 'Mark Ready';
    }
    // Update budget info display
    updateBudgetInfo();
  }

  /**
   * Render the keywords table with checkboxes and budget allocation inputs.
   */
  function renderKeywordTable() {
    keywordTableBody.innerHTML = '';
    selectedKeywordsDetailed = [];
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
        <td><input type="text" id="kwHeadlineA_${idx}" data-index="${idx}" maxlength="30" placeholder="Headline A" style="width:120px;" disabled></td>
        <td><input type="text" id="kwDescA_${idx}" data-index="${idx}" maxlength="90" placeholder="Description A" style="width:200px;" disabled></td>
        <td><input type="text" id="kwHeadlineB_${idx}" data-index="${idx}" maxlength="30" placeholder="Headline B" style="width:120px;" disabled></td>
        <td><input type="text" id="kwDescB_${idx}" data-index="${idx}" maxlength="90" placeholder="Description B" style="width:200px;" disabled></td>
      `;
      keywordTableBody.appendChild(row);
    });
    // Add listeners
    availableKeywords.forEach((kw, idx) => {
      const checkbox = document.getElementById(`kwCheck_${idx}`);
      const budgetInput = document.getElementById(`kwBudget_${idx}`);
      const headA = document.getElementById(`kwHeadlineA_${idx}`);
      const descA = document.getElementById(`kwDescA_${idx}`);
      const headB = document.getElementById(`kwHeadlineB_${idx}`);
      const descB = document.getElementById(`kwDescB_${idx}`);
      checkbox.addEventListener('change', function () {
        // Ensure maximum 20 keywords can be selected
        const selectedCount = document.querySelectorAll('#keywordTable tbody input[type=checkbox]:checked').length;
        if (this.checked && selectedCount > 20) {
          alert('You can select up to 20 keywords only.');
          this.checked = false;
          return;
        }
        const enable = this.checked;
        [budgetInput, headA, descA, headB, descB].forEach(inp => {
          inp.disabled = !enable;
          if (!enable) {
            inp.value = '';
          }
        });
        updateSelectedKeywords();
        updateBudgetInfo();
      });
      // Update selected details on any input change
      [budgetInput, headA, descA, headB, descB].forEach(inp => {
        inp.addEventListener('input', function () {
          updateSelectedKeywords();
          updateBudgetInfo();
        });
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
    selectedKeywordsDetailed = [];
    availableKeywords.forEach((kw, idx) => {
      const check = document.getElementById(`kwCheck_${idx}`);
      const budgetInput = document.getElementById(`kwBudget_${idx}`);
      const headA = document.getElementById(`kwHeadlineA_${idx}`);
      const descA = document.getElementById(`kwDescA_${idx}`);
      const headB = document.getElementById(`kwHeadlineB_${idx}`);
      const descB = document.getElementById(`kwDescB_${idx}`);
      if (check && check.checked) {
        const allocation = parseFloat(budgetInput.value) || 0;
        selectedKeywordsDetailed.push({
          keyword: kw.keyword,
          budget: allocation,
          headline: (headA ? headA.value.trim() : ''),
          description: (descA ? descA.value.trim() : ''),
          headlineB: (headB ? headB.value.trim() : ''),
          descriptionB: (descB ? descB.value.trim() : '')
        });
      }
    });
  }

  /**
   * Compute and display the total allocated budget vs available budget.
   */
  function updateBudgetInfo() {
    const budget = currentRound === 0 ? roundBudgets[0] : roundBudgets[currentRound - 1];
    const allocated = selectedKeywordsDetailed.reduce((sum, item) => sum + (item.budget || 0), 0);
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
    // Conditions for enabling submit: at least one keyword, not over budget, not ready, and all selected have Headline and Description A filled
    let allFilled = true;
    selectedKeywordsDetailed.forEach(item => {
      if (!item.headline || !item.description) {
        allFilled = false;
      }
    });
    // For trial round, ready state does not matter
    if (currentRound === 0) {
      submitBtn.disabled = !(selectedKeywordsDetailed.length > 0 && remaining >= 0 && allFilled);
    } else {
      submitBtn.disabled = !(selectedKeywordsDetailed.length > 0 && remaining >= 0 && allFilled && !group.ready);
    }
  }

  /**
   * Render audience (bag) information including description, size and price.
   * This uses game data audiences array. Called during initPage when
   * audiences array for the current round is known.
   * @param {Array<string>} audiences
   */
  function renderAudienceInfo(audiences) {
    // Load full game data to access audience descriptions and prices
    utils.loadGameData().then(data => {
      const allAudiences = data.audiences || [];
      let html = '';
      audiences.forEach(name => {
        const info = allAudiences.find(a => a.name === name);
        if (!info) return;
        html += `<div style="margin-bottom:10px;"><strong>${escapeHtml(info.name)}</strong> – ${escapeHtml(info.description)} (Size: ${info.size.toLocaleString()})`; 
        if (typeof info.price === 'number' && info.price > 0) {
          html += `, Bag Price: $${info.price.toFixed(2)}`;
        }
        html += `</div>`;
      });
      audienceInfoDiv.innerHTML = html;
    });
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
    // Disable/enable keyword checkboxes and all associated inputs
    availableKeywords.forEach((kw, idx) => {
      const chk = document.getElementById(`kwCheck_${idx}`);
      const budget = document.getElementById(`kwBudget_${idx}`);
      const headA = document.getElementById(`kwHeadlineA_${idx}`);
      const descA = document.getElementById(`kwDescA_${idx}`);
      const headB = document.getElementById(`kwHeadlineB_${idx}`);
      const descB = document.getElementById(`kwDescB_${idx}`);
      if (chk) chk.disabled = lock;
      [budget, headA, descA, headB, descB].forEach(inp => {
        if (inp) inp.disabled = lock;
      });
    });
    // Disable/enable landing page selector and submit button
    if (landingPageSelect) landingPageSelect.disabled = lock;
    submitBtn.disabled = lock;
    // For trial, also disable mockSubmit button
    if (mockSubmitBtn) mockSubmitBtn.disabled = lock;
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
      // Compose recommendations from summary
      const recommendations = summary.recommendations || [];
      div.innerHTML = `
        <h3>${entry.round === 0 ? 'Trial' : 'Round ' + entry.round} Results</h3>
        <p><strong>Impressions:</strong> ${summary.totalImpressions} | <strong>Clicks:</strong> ${summary.totalClicks} | <strong>Spend:</strong> $${summary.totalSpend.toFixed(2)} | <strong>Sales:</strong> $${summary.totalSales.toFixed(2)} | <strong>ROI:</strong> ${summary.roi.toFixed(2)}%</p>
        ${recommendations.map(rec => `<p><em>${escapeHtml(rec)}</em></p>`).join('')}
        <table>
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>Spend (SGD)</th>
              <th>Sales (SGD)</th>
              <th>ROI (%)</th>
            </tr>
          </thead>
          <tbody>
            ${entry.summary.keywordResults.map(kRes => `<tr><td>${escapeHtml(kRes.keyword)}</td><td>${kRes.impressions}</td><td>${kRes.clicks}</td><td>${kRes.spend.toFixed(2)}</td><td>${kRes.sales.toFixed(2)}</td><td>${kRes.roi.toFixed(2)}</td></tr>`).join('')}
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

  // Submit campaign or trial submission
  submitBtn.addEventListener('click', function () {
    updateSelectedKeywords();
    // Determine budget
    const budget = currentRound === 0 ? roundBudgets[0] : roundBudgets[currentRound - 1];
    const totalAllocated = selectedKeywordsDetailed.reduce((sum, k) => sum + (k.budget || 0), 0);
    if (selectedKeywordsDetailed.length === 0) {
      alert('Please select at least one keyword, fill in the required ad copy and allocate budget.');
      return;
    }
    if (totalAllocated > budget) {
      alert('You have exceeded your budget. Please adjust allocations.');
      return;
    }
    // Ensure all selected keywords have headline and description A filled
    for (const item of selectedKeywordsDetailed) {
      if (!item.headline || !item.description) {
        alert('Please fill in headline and description (A) for all selected keywords.');
        return;
      }
    }
    // Determine landing page
    const landingPageId = landingPageSelect.value;
    const pages = utils.getLandingPages();
    const lp = pages.find(p => p.id === landingPageId);
    // Simulate the round
    const summary = utils.simulateRound(selectedKeywordsDetailed, lp, bagName, { round: currentRound });
    if (currentRound === 0) {
      // Trial round: just show results and do not save
      let msg = `Trial Results\nImpressions: ${summary.totalImpressions}\nClicks: ${summary.totalClicks}\nSpend: $${summary.totalSpend.toFixed(2)}\nSales: $${summary.totalSales.toFixed(2)}\nROI: ${summary.roi.toFixed(2)}%`;
      if (summary.recommendations && summary.recommendations.length > 0) {
        msg += `\nRecommendations:\n- ${summary.recommendations.join('\n- ')}`;
      }
      alert(msg);
      return;
    }
    // Real round: store results; replace any existing result for this round
    group.results = group.results || [];
    // Remove existing result for current round if any
    group.results = group.results.filter(r => r.round !== currentRound);
    group.results.push({
      round: currentRound,
      selection: {
        keywords: selectedKeywordsDetailed,
        landingPageId
      },
      summary
    });
    utils.updateGroup(group);
    // Show a summary message to user and allow further edits
    let msg = `Campaign submitted.\nImpressions: ${summary.totalImpressions}\nClicks: ${summary.totalClicks}\nSpend: $${summary.totalSpend.toFixed(2)}\nSales: $${summary.totalSales.toFixed(2)}\nROI: ${summary.roi.toFixed(2)}%`;
    if (summary.recommendations && summary.recommendations.length > 0) {
      msg += `\nRecommendations:\n- ${summary.recommendations.join('\n- ')}`;
    }
    alert(msg);
    // Refresh previous results display for real rounds
    renderPreviousResults();
    // Keep inputs editable until ready is clicked
    updateBudgetInfo();
  });

  // Trial mock submit button
  if (mockSubmitBtn) {
    mockSubmitBtn.addEventListener('click', function () {
      // call the same logic as submit but ensure not saved
      updateSelectedKeywords();
      const budget = roundBudgets[0];
      const totalAllocated = selectedKeywordsDetailed.reduce((sum, k) => sum + (k.budget || 0), 0);
      if (selectedKeywordsDetailed.length === 0) {
        alert('Please select at least one keyword, fill in the required ad copy and allocate budget.');
        return;
      }
      if (totalAllocated > budget) {
        alert('You have exceeded your budget. Please adjust allocations.');
        return;
      }
      for (const item of selectedKeywordsDetailed) {
        if (!item.headline || !item.description) {
          alert('Please fill in headline and description (A) for all selected keywords.');
          return;
        }
      }
      const landingPageId = landingPageSelect.value;
      const pages = utils.getLandingPages();
      const lp = pages.find(p => p.id === landingPageId);
      const summary = utils.simulateRound(selectedKeywordsDetailed, lp, bagName, { round: 0 });
      let msg = `Trial Results\nImpressions: ${summary.totalImpressions}\nClicks: ${summary.totalClicks}\nSpend: $${summary.totalSpend.toFixed(2)}\nSales: $${summary.totalSales.toFixed(2)}\nROI: ${summary.roi.toFixed(2)}%`;
      if (summary.recommendations && summary.recommendations.length > 0) {
        msg += `\nRecommendations:\n- ${summary.recommendations.join('\n- ')}`;
      }
      alert(msg);
    });
  }

  // Ready button toggling (not used in trial)
  readyBtn.addEventListener('click', function () {
    if (currentRound === 0) return;
    if (!group.ready) {
      // Mark ready
      group.ready = true;
      utils.updateGroup(group);
      readyBtn.textContent = 'Ready ✅';
      // Lock editing
      lockInputs(true);
      alert('You are marked as ready. Please wait for the admin to start the next round.');
    } else {
      // Unready – allow editing
      group.ready = false;
      utils.updateGroup(group);
      readyBtn.textContent = 'Mark Ready';
      // Unlock inputs
      lockInputs(false);
      alert('You are no longer marked as ready. You can continue editing your campaign.');
    }
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
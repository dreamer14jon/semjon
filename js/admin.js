/*
 * Admin dashboard script. Handles creating and managing groups, controlling
 * round progression, resetting progress and displaying summary statistics.
 */
(function () {
  // Ensure only admin can access this page
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  const utils = window.gameUtils;
  const createModal = document.getElementById('createGroupModal');
  const newUsernameInput = document.getElementById('newUsername');
  const newPasswordInput = document.getElementById('newPassword');

  // Elements
  const groupsTableBody = document.querySelector('#groupsTable tbody');
  const leaderboardTableBody = document.querySelector('#leaderboardTable tbody');
  const currentRoundDisplay = document.getElementById('currentRoundDisplay');
  const startRoundBtn = document.getElementById('startRoundBtn');
  const nextRoundBtn = document.getElementById('nextRoundBtn');
  const overrideBtn = document.getElementById('overrideBtn');
  const createGroupBtn = document.getElementById('createGroupBtn');
  const createGroupSubmit = document.getElementById('createGroupSubmit');
  const closeModalBtn = document.getElementById('closeModal');
  const logoutBtn = document.getElementById('logoutBtn');
  // Additional admin elements
  const changeAdminPwdBtn = document.getElementById('changeAdminPwdBtn');
  const changeAdminPwdModal = document.getElementById('changeAdminPwdModal');
  const closeChangeAdminPwdModal = document.getElementById('closeChangeAdminPwdModal');
  const confirmAdminPwdBtn = document.getElementById('confirmAdminPwdBtn');
  const currentAdminPwdInput = document.getElementById('currentAdminPwd');
  const newAdminPwdInput = document.getElementById('newAdminPwd');
  const changeGroupPwdModal = document.getElementById('changeGroupPwdModal');
  const closeChangeGroupPwdModal = document.getElementById('closeChangeGroupPwdModal');
  const confirmGroupPwdBtn = document.getElementById('confirmGroupPwdBtn');
  const groupNewPasswordInput = document.getElementById('groupNewPassword');
  const changeGroupUserLabel = document.getElementById('changeGroupUserLabel');
  const logTableBody = document.querySelector('#logTable tbody');

  // Track which group password is currently being changed
  let groupUserToChange = null;

  // Load data once
  utils.loadGameData().then(() => {
    refreshTables();
  });

  /**
   * Refresh groups and leaderboard tables. Also update current round display
   * and enable/disable the next round button based on readiness.
   */
  function refreshTables() {
    const groups = utils.getGroups();
    const currentRound = utils.getCurrentRound();
    currentRoundDisplay.textContent = currentRound;
    // Render group table
    groupsTableBody.innerHTML = '';
    groups.forEach(group => {
      const row = document.createElement('tr');
      // Compute totals for this group
      const totals = aggregateGroup(group);
      const readyStatus = group.ready ? 'Ready' : 'Not Ready';
      row.innerHTML = `
        <td>${escapeHtml(group.name)}</td>
        <td>${group.round}</td>
        <td class="${group.ready ? 'status-ready' : 'status-pending'}">${readyStatus}</td>
        <td>${totals.spend.toFixed(2)}</td>
        <td>${totals.sales.toFixed(2)}</td>
        <td>${totals.impressions}</td>
        <td>${totals.clicks}</td>
        <td>${totals.roi.toFixed(2)}</td>
        <td>
          <button class="button-primary" data-action="reset" data-user="${group.username}">Reset</button>
          <button class="button-primary" data-action="changePwd" data-user="${group.username}">Change&nbsp;Pwd</button>
        </td>
      `;
      groupsTableBody.appendChild(row);
    });
    // Attach action handlers for group actions
    groupsTableBody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', function () {
        const action = this.getAttribute('data-action');
        const uname = this.getAttribute('data-user');
        if (action === 'reset') {
          if (confirm('Reset this group\'s progress?')) {
            utils.resetGroup(uname, 1);
            refreshTables();
          }
        } else if (action === 'changePwd') {
          groupUserToChange = uname;
          changeGroupUserLabel.textContent = `Group: ${uname}`;
          groupNewPasswordInput.value = '';
          changeGroupPwdModal.style.display = 'flex';
        }
      });
    });
    // Render leaderboard
    leaderboardTableBody.innerHTML = '';
    groups.forEach(group => {
      const totals = aggregateGroup(group);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(group.name)}</td>
        <td>${totals.spend.toFixed(2)}</td>
        <td>${totals.sales.toFixed(2)}</td>
        <td>${totals.impressions}</td>
        <td>${totals.clicks}</td>
        <td>${totals.roi.toFixed(2)}</td>
      `;
      leaderboardTableBody.appendChild(row);
    });
    // Enable next round button only if all groups are ready and there is at least one group
    const allReady = groups.length > 0 && groups.every(g => g.ready === true);
    nextRoundBtn.disabled = !allReady;

    // Refresh login logs display
    renderLogs();
  }

  /**
   * Aggregate total spend, sales, impressions and clicks across all
   * completed rounds for a group. Returns totals with ROI.
   * @param {Object} group
   */
  function aggregateGroup(group) {
    let totalSpend = 0;
    let totalSales = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    (group.results || []).forEach(r => {
      totalSpend += r.summary.totalSpend;
      totalSales += r.summary.totalSales;
      totalImpressions += r.summary.totalImpressions;
      totalClicks += r.summary.totalClicks;
    });
    const roi = totalSpend > 0 ? (totalSales - totalSpend) / totalSpend * 100 : 0;
    return {
      spend: totalSpend,
      sales: totalSales,
      impressions: totalImpressions,
      clicks: totalClicks,
      roi: roi
    };
  }

  /**
   * Escape HTML to prevent XSS in table rendering.
   */
  function escapeHtml(str) {
    return String(str).replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[s]);
  }

  /**
   * Render login logs stored in localStorage. Logs are sorted by timestamp (newest first)
   * and displayed in the log table. If no logs exist the table is cleared.
   */
  function renderLogs() {
    if (!logTableBody) return;
    const logs = JSON.parse(localStorage.getItem('loginLogs') || '[]');
    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    logTableBody.innerHTML = '';
    logs.forEach(log => {
      const row = document.createElement('tr');
      const dateStr = new Date(log.timestamp).toLocaleString();
      row.innerHTML = `
        <td>${escapeHtml(log.username)}</td>
        <td>${escapeHtml(log.role)}</td>
        <td>${escapeHtml(dateStr)}</td>
      `;
      logTableBody.appendChild(row);
    });
  }

  // Event: Open create group modal
  createGroupBtn.addEventListener('click', function () {
    newUsernameInput.value = '';
    newPasswordInput.value = '';
    createModal.style.display = 'flex';
  });
  // Close modal
  closeModalBtn.addEventListener('click', function () {
    createModal.style.display = 'none';
  });
  // Create group submit
  createGroupSubmit.addEventListener('click', function () {
    const u = newUsernameInput.value.trim();
    const p = newPasswordInput.value;
    if (!u || !p) {
      alert('Please enter username and password');
      return;
    }
    const ok = utils.createGroup(u, p);
    if (!ok) {
      alert('Group username already exists');
      return;
    }
    createModal.style.display = 'none';
    refreshTables();
  });

  // Start game / round
  startRoundBtn.addEventListener('click', function () {
    const groups = utils.getGroups();
    if (groups.length === 0) {
      alert('Create at least one group before starting the game.');
      return;
    }
    if (confirm('Start the game? This will reset all groups to round 1.')) {
      utils.setCurrentRound(1);
      // Reset all groups
      groups.forEach(g => {
        g.results = [];
        g.round = 1;
        g.ready = false;
      });
      utils.saveGroups(groups);
      refreshTables();
      alert('Game started. All groups are now on round 1.');
    }
  });

  // Next round button
  nextRoundBtn.addEventListener('click', function () {
    const groups = utils.getGroups();
    if (groups.length === 0) {
      alert('No groups to progress.');
      return;
    }
    if (!groups.every(g => g.ready)) {
      alert('Not all groups have marked themselves ready.');
      return;
    }
    proceedToNextRound();
  });

  // Override next round button: force progression regardless of readiness
  overrideBtn.addEventListener('click', function () {
    const groups = utils.getGroups();
    if (groups.length === 0) {
      alert('No groups to progress.');
      return;
    }
    if (confirm('Override readiness and proceed to the next round?')) {
      proceedToNextRound();
    }
  });

  /**
   * Increment round and reset readiness for all groups. When advancing
   * past round 3, the game ends and no further rounds are available.
   */
  function proceedToNextRound() {
    let round = utils.getCurrentRound();
    if (round >= 3) {
      alert('All rounds completed! The game has ended.');
      return;
    }
    round += 1;
    utils.setCurrentRound(round);
    // Update each group: advance round, reset readiness
    const groups = utils.getGroups();
    groups.forEach(g => {
      g.round = round;
      g.ready = false;
    });
    utils.saveGroups(groups);
    refreshTables();
    alert(`Advanced to round ${round}.`);
  }

  // Logout
  logoutBtn.addEventListener('click', function () {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  });

  // ===== Admin Password Change Handling =====
  if (changeAdminPwdBtn) {
    // Open admin password modal
    changeAdminPwdBtn.addEventListener('click', function () {
      currentAdminPwdInput.value = '';
      newAdminPwdInput.value = '';
      changeAdminPwdModal.style.display = 'flex';
    });
  }
  if (closeChangeAdminPwdModal) {
    closeChangeAdminPwdModal.addEventListener('click', function () {
      changeAdminPwdModal.style.display = 'none';
    });
  }
  if (confirmAdminPwdBtn) {
    confirmAdminPwdBtn.addEventListener('click', function () {
      const currentPwd = currentAdminPwdInput.value;
      const newPwd = newAdminPwdInput.value;
      if (!currentPwd || !newPwd) {
        alert('Please fill in both password fields');
        return;
      }
      const creds = JSON.parse(localStorage.getItem('adminCredentials'));
      if (currentPwd !== creds.password) {
        alert('Current password is incorrect');
        return;
      }
      creds.password = newPwd;
      localStorage.setItem('adminCredentials', JSON.stringify(creds));
      alert('Admin password updated successfully');
      changeAdminPwdModal.style.display = 'none';
    });
  }

  // ===== Group Password Change Handling =====
  if (closeChangeGroupPwdModal) {
    closeChangeGroupPwdModal.addEventListener('click', function () {
      changeGroupPwdModal.style.display = 'none';
    });
  }
  if (confirmGroupPwdBtn) {
    confirmGroupPwdBtn.addEventListener('click', function () {
      const newPwd = groupNewPasswordInput.value;
      if (!newPwd) {
        alert('Enter new password');
        return;
      }
      if (!groupUserToChange) {
        alert('No group selected');
        return;
      }
      const groups = utils.getGroups();
      const grp = groups.find(g => g.username === groupUserToChange);
      if (grp) {
        grp.password = newPwd;
        utils.saveGroups(groups);
        alert(`Password updated for group ${groupUserToChange}`);
      }
      changeGroupPwdModal.style.display = 'none';
      refreshTables();
    });
  }

})();
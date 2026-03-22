/*
 * Common helper functions and simulation logic for the Search Marketing game.
 * Data is loaded from data/data.json and stored in the global `gameData` variable.
 * This file also defines functions to manage groups, rounds and perform
 * performance simulations based on chosen keywords, ad copy and landing pages.
 */

let gameData = null;

/**
 * Load the game data (keywords, audiences, landing pages) from data.json. The
 * returned promise resolves to the parsed data object. Data is stored in the
 * global `gameData` for re‑use.
 */
function loadGameData() {
  if (gameData) {
    return Promise.resolve(gameData);
  }
  return fetch('data/data.json')
    .then(response => response.json())
    .then(data => {
      gameData = data;
      return data;
    });
}

/**
 * Get the current round number from localStorage. Defaults to 1 if not set.
 */
function getCurrentRound() {
  const r = localStorage.getItem('currentRound');
  return r ? parseInt(r, 10) : 1;
}

/**
 * Set the current round number in localStorage.
 * @param {number} round The new round number.
 */
function setCurrentRound(round) {
  localStorage.setItem('currentRound', String(round));
}

/**
 * Retrieve all groups from localStorage. Returns an array of group objects.
 */
function getGroups() {
  return JSON.parse(localStorage.getItem('groups') || '[]');
}

/**
 * Persist the list of groups to localStorage.
 * @param {Array} groups The updated array of group objects.
 */
function saveGroups(groups) {
  localStorage.setItem('groups', JSON.stringify(groups));
}

/**
 * Find a group by username. Returns the group object or undefined.
 * @param {string} username Group username
 */
function findGroup(username) {
  return getGroups().find(g => g.username === username);
}

/**
 * Update an existing group in localStorage.
 * @param {Object} updatedGroup The group object with updated fields.
 */
function updateGroup(updatedGroup) {
  const groups = getGroups().map(g => g.username === updatedGroup.username ? updatedGroup : g);
  saveGroups(groups);
}

/**
 * Create a new group with given credentials. Returns true if created,
 * false if username already exists.
 * @param {string} username
 * @param {string} password
 */
function createGroup(username, password) {
  const groups = getGroups();
  if (groups.some(g => g.username === username)) {
    return false;
  }
  const newGroup = {
    username: username,
    password: password,
    name: username,
    results: [], // array of result objects per round
    ready: false,
    round: 1 // current round of this group
  };
  groups.push(newGroup);
  saveGroups(groups);
  return true;
}

/**
 * Remove a group by username from localStorage.
 * @param {string} username
 */
function deleteGroup(username) {
  const groups = getGroups().filter(g => g.username !== username);
  saveGroups(groups);
}

/**
 * Reset a group's progress to a given round (or completely). If round is 1
 * the group will start over. Otherwise resets only results beyond the given
 * round.
 * @param {string} username
 * @param {number} round
 */
function resetGroup(username, round = 1) {
  const group = findGroup(username);
  if (!group) return;
  if (round <= 1) {
    group.results = [];
    group.round = 1;
    group.ready = false;
  } else {
    // Remove results for rounds >= round
    group.results = group.results.filter(r => r.round < round);
    group.round = round;
    group.ready = false;
  }
  updateGroup(group);
}

/**
 * Simulation logic for a campaign. It accepts selected keywords with their
 * allocated budget, the ad copy, landing page and target audience. It
 * generates impressions, clicks, spend, conversions and sales for each
 * keyword and aggregates totals. The formulas are based on public
 * marketing metrics: CTR is calculated as clicks divided by impressions and
 * typically ranges around 3–5%【721246973352449†L238-L274】. Conversion rate is
 * the number of conversions divided by total visitors, roughly 2–5%
 * depending on context【491005646056394†L73-L82】. ROI is calculated as
 * (revenue minus cost) divided by cost【916191538178660†L177-L183】.
 *
 * @param {Array} selectedKeywords Array of objects { keyword: string, budget: number }
 * @param {Object} adCopy { headline: string, description: string }
 * @param {Object} landingPage Landing page object with audience attribute
 * @param {string} bag Target audience name
 * @returns {Object} result summary with totals and per‑keyword results
 */
function simulateRound(selectedKeywords, adCopy, landingPage, bag) {
  if (!gameData) {
    throw new Error('Game data is not loaded');
  }
  const resultPerKeyword = [];
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  let totalSales = 0;
  // Baseline rates drawn from industry averages
  const baseCTR = 0.03; // 3% click‑through rate【721246973352449†L238-L274】
  const baseConversionRate = 0.02; // 2% conversion rate【491005646056394†L73-L82】
  const revenuePerConversion = 120; // assign constant revenue per conversion for simplicity
  /**
   * Compute relevance factor for a keyword given the ad copy, landing page and
   * target audience. The score starts at 1.0 and increases when keywords
   * appear in the ad copy or when the landing page aligns with the audience.
   *
   * @param {string} keyword
   * @returns {number}
   */
  function computeRelevance(keyword) {
    let score = 1.0;
    const kwLower = keyword.toLowerCase();
    if (adCopy.headline.toLowerCase().includes(kwLower)) score += 0.2;
    if (adCopy.description.toLowerCase().includes(kwLower)) score += 0.1;
    if (landingPage && landingPage.audience === bag) score += 0.3;
    return score;
  }
  for (const item of selectedKeywords) {
    const kwData = gameData.keywords.find(k => k.keyword === item.keyword);
    if (!kwData) continue;
    const allocation = item.budget;
    const maxClicksByBudget = kwData.cpc > 0 ? allocation / kwData.cpc : 0;
    const relevance = computeRelevance(kwData.keyword);
    const ctr = baseCTR * relevance;
    // potential clicks based on search volume and CTR
    const potentialClicks = kwData.search_volume * ctr;
    const clicks = Math.min(potentialClicks, maxClicksByBudget);
    const impressions = ctr > 0 ? clicks / ctr : 0;
    const spend = clicks * kwData.cpc;
    const conversionRate = baseConversionRate * relevance;
    const conversions = clicks * conversionRate;
    const sales = conversions * revenuePerConversion;
    resultPerKeyword.push({
      keyword: kwData.keyword,
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      spend: parseFloat(spend.toFixed(2)),
      conversions: Math.round(conversions),
      sales: parseFloat(sales.toFixed(2))
    });
    totalImpressions += impressions;
    totalClicks += clicks;
    totalSpend += spend;
    totalSales += sales;
  }
  const roi = totalSpend > 0 ? ((totalSales - totalSpend) / totalSpend) : 0;
  return {
    keywordResults: resultPerKeyword,
    totalImpressions: Math.round(totalImpressions),
    totalClicks: Math.round(totalClicks),
    totalSpend: parseFloat(totalSpend.toFixed(2)),
    totalSales: parseFloat(totalSales.toFixed(2)),
    roi: parseFloat((roi * 100).toFixed(2))
  };
}

/**
 * Retrieve the list of audiences available for a given round. Each round
 * progressively adds new audience segments. Round 1 includes only the
 * first audience, Round 2 adds the second and Round 3 includes all three.
 * @param {number} round
 * @returns {Array<string>} Array of audience names
 */
function getAudiencesForRound(round) {
  const audiences = gameData ? gameData.audiences.map(a => a.name) : [];
  if (round <= 1) return audiences.slice(0, 1);
  if (round === 2) return audiences.slice(0, 2);
  return audiences;
}

/**
 * Retrieve keywords relevant to the provided list of audiences.
 * @param {Array<string>} audienceNames
 * @returns {Array<Object>} Array of keyword objects
 */
function getKeywordsForAudiences(audienceNames) {
  if (!gameData) return [];
  return gameData.keywords.filter(k => audienceNames.includes(k.audience));
}

/**
 * Retrieve landing pages. Optionally filter by audience names.
 * @param {Array<string>} [audienceNames]
 */
function getLandingPages(audienceNames) {
  if (!gameData) return [];
  if (!audienceNames) return gameData.landingPages;
  return gameData.landingPages.filter(lp => audienceNames.includes(lp.audience));
}

// Export functions to global scope for use in other scripts
window.gameUtils = {
  loadGameData,
  getCurrentRound,
  setCurrentRound,
  getGroups,
  saveGroups,
  findGroup,
  updateGroup,
  createGroup,
  deleteGroup,
  resetGroup,
  simulateRound,
  getAudiencesForRound,
  getKeywordsForAudiences,
  getLandingPages
};
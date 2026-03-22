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
    round: 0 // start with trial round (0)
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
/**
 * Simulation logic for a campaign. This updated version accepts selected
 * keywords with optional per‑keyword ad copy (and optional A/B variants),
 * the chosen landing page, the target audience (bag) and an options
 * object. It generates impressions, clicks, spend, conversions and sales
 * for each keyword and aggregates totals. Enhancements include market
 * variability, competitor dynamics, optional A/B testing and deeper
 * analytics (top/bottom keywords and recommendations). If no options are
 * provided, sensible defaults are applied. If individual keyword objects
 * do not include ad copy the relevance calculation falls back to empty
 * strings.
 *
 * @param {Array<Object>} selectedKeywords Array of objects { keyword: string, budget: number, headline?: string, description?: string, headlineB?: string, descriptionB?: string }
 * @param {Object|null} landingPage Landing page object with audience attribute
 * @param {string} bag Target audience name
 * @param {Object} [options] Additional options: { marketFactor?: number, round?: number }
 * @returns {Object} result summary with totals, per‑keyword results and analytics
 */
function simulateRound(selectedKeywords, landingPage, bag, options = {}) {
  if (!gameData) {
    throw new Error('Game data is not loaded');
  }
  // Determine market variability factor (e.g. seasonality) – random 0.9–1.1 if not provided
  const marketFactor = typeof options.marketFactor === 'number' ? options.marketFactor : (0.9 + Math.random() * 0.2);
  // Prepare totals
  const resultPerKeyword = [];
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  let totalSales = 0;
  // Baseline rates drawn from industry averages
  const baseCTR = 0.03; // 3% click‑through rate【721246973352449†L238-L274】
  const baseConversionRate = 0.02; // 2% conversion rate【491005646056394†L73-L82】
  const revenuePerConversion = 120;
  /**
   * Compute relevance factor for a keyword given specific ad copy and
   * landing page. The score starts at 1.0 and increases when the keyword
   * appears in the headline/description or when the landing page aligns
   * with the audience.
   *
   * @param {string} keyword
   * @param {string} headline
   * @param {string} description
   * @returns {number}
   */
  function computeRelevance(keyword, headline, description) {
    let score = 1.0;
    const kwLower = keyword.toLowerCase();
    const h = (headline || '').toLowerCase();
    const d = (description || '').toLowerCase();
    if (h.includes(kwLower)) score += 0.2;
    if (d.includes(kwLower)) score += 0.1;
    if (landingPage && landingPage.audience === bag) score += 0.3;
    return score;
  }
  /**
   * Determine competitor factor for CPC based on competition level.
   * High competition inflates CPC, low competition discounts CPC.
   *
   * @param {string} competition
   * @returns {number}
   */
  function competitorFactor(competition) {
    switch ((competition || '').toLowerCase()) {
      case 'high':
        return 1.2;
      case 'medium':
        return 1.0;
      case 'low':
        return 0.8;
      default:
        return 1.0;
    }
  }
  // Determine if any keyword has variant B (A/B testing) – influences budget split
  let useAB = false;
  for (const kw of selectedKeywords) {
    if (kw.headlineB && kw.descriptionB) {
      useAB = true;
      break;
    }
  }
  for (const item of selectedKeywords) {
    const kwData = gameData.keywords.find(k => k.keyword === item.keyword);
    if (!kwData) continue;
    // Adjust search volume based on market factor
    const adjustedVolume = kwData.search_volume * marketFactor;
    // Adjust CPC based on competitor dynamics
    const adjustedCpc = kwData.cpc * competitorFactor(kwData.competition);
    // Determine number of variants for this keyword
    const variants = [];
    // Variant A
    variants.push({ headline: item.headline || '', description: item.description || '' });
    // Variant B (optional)
    if (item.headlineB && item.descriptionB) {
      variants.push({ headline: item.headlineB, description: item.descriptionB });
    }
    const numVariants = variants.length;
    let keywordImpressions = 0;
    let keywordClicks = 0;
    let keywordSpend = 0;
    let keywordSales = 0;
    // Loop through each variant, splitting budget equally
    const allocationPerVariant = numVariants > 0 ? (item.budget / numVariants) : 0;
    variants.forEach(variant => {
      const relevance = computeRelevance(kwData.keyword, variant.headline, variant.description);
      const ctr = baseCTR * relevance;
      const potentialClicks = adjustedVolume * ctr;
      const maxClicksByBudget = adjustedCpc > 0 ? allocationPerVariant / adjustedCpc : 0;
      const clicks = Math.min(potentialClicks, maxClicksByBudget);
      const impressions = ctr > 0 ? clicks / ctr : 0;
      const spend = clicks * adjustedCpc;
      const conversionRate = baseConversionRate * relevance;
      const conversions = clicks * conversionRate;
      const sales = conversions * revenuePerConversion;
      keywordImpressions += impressions;
      keywordClicks += clicks;
      keywordSpend += spend;
      keywordSales += sales;
    });
    resultPerKeyword.push({
      keyword: kwData.keyword,
      impressions: Math.round(keywordImpressions),
      clicks: Math.round(keywordClicks),
      spend: parseFloat(keywordSpend.toFixed(2)),
      sales: parseFloat(keywordSales.toFixed(2))
    });
    totalImpressions += keywordImpressions;
    totalClicks += keywordClicks;
    totalSpend += keywordSpend;
    totalSales += keywordSales;
  }
  const roi = totalSpend > 0 ? ((totalSales - totalSpend) / totalSpend) : 0;
  // Compute per‑keyword ROI for analytics
  const analytics = {};
  resultPerKeyword.forEach(res => {
    const kwRoi = res.spend > 0 ? ((res.sales - res.spend) / res.spend) * 100 : 0;
    res.roi = parseFloat(kwRoi.toFixed(2));
  });
  // Determine top and bottom performers by ROI
  const sortedByROI = [...resultPerKeyword].sort((a, b) => b.roi - a.roi);
  const topKeywords = sortedByROI.slice(0, 3).map(r => r.keyword);
  const bottomKeywords = sortedByROI.slice(-3).map(r => r.keyword);
  // Generate simple recommendations
  const recommendations = [];
  if (topKeywords.length > 0) {
    recommendations.push(`Focus on high‑ROI keywords like ${topKeywords.join(', ')}.`);
  }
  const lowRoiKeywords = sortedByROI.filter(r => r.roi < 0);
  if (lowRoiKeywords.length > 0) {
    const names = lowRoiKeywords.map(r => r.keyword);
    recommendations.push(`Reduce spend on low‑performing keywords such as ${names.join(', ')}.`);
  }
  return {
    keywordResults: resultPerKeyword,
    totalImpressions: Math.round(totalImpressions),
    totalClicks: Math.round(totalClicks),
    totalSpend: parseFloat(totalSpend.toFixed(2)),
    totalSales: parseFloat(totalSales.toFixed(2)),
    roi: parseFloat((roi * 100).toFixed(2)),
    topKeywords,
    bottomKeywords,
    recommendations
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
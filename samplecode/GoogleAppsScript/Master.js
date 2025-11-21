/**
 * @OnlyCurrentDoc
 *
 * The above comment directs App Script to limit the scope of execution to the
 * current spreadsheet only. This enhances security.
 */

// --- CONFIGURATION & GLOBAL CONSTANTS ---

// BEST PRACTICE: Store your sensitive credentials using Script Properties.
// In the Apps Script Editor, go to Project Settings > Script Properties.
// 1. Add a property named 'PLAID_CLIENT_ID'.
// 2. Add a property named 'PLAID_SECRET'.
const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const PLAID_CLIENT_ID = SCRIPT_PROPERTIES.getProperty('PLAID_CLIENT_ID') || '6464b754ba5b0b0015d53cb9'; // Fallback for testing
const PLAID_SECRET = SCRIPT_PROPERTIES.getProperty('PLAID_SECRET') || 'a68ff51e26a4545b2a1e98b2563513'; // Fallback for testing


// Set the Plaid environment. Change to 'https://sandbox.plaid.com' for testing.
const PLAID_ENV_URL = "https://production.plaid.com";

// Names of the sheets used in this script.
const ACCESS_TOKEN_SHEET = "Access Token";
const LIABILITIES_SHEET = "Liabilities";
const TRANSACTIONS_SHEET = "Transactions";
const CATEGORY_LOOKUP_SHEET = "Category Lookup";
const VENDORS_SHEET = "Vendors";


// --- SPREADSHEET UI & MENU ---

/**
 * Creates a custom menu in the spreadsheet when the file is opened.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Plaid Menu')
    .addItem('Link New Bank Account', 'startPlaidLinkFlow')
    .addItem('Update Existing Bank Account', 'startPlaidUpdateFlow')
    .addSeparator()
    .addItem('Get Balances', 'getBalances')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Transactions')
      // 1) Clear Data
      .addItem('Clear Transactions Data', 'clearTransactionsData')
      // 2) Get Historical Data (Resumable 24 Months)
      .addItem('Get Historical Data (Resumable 24 Months)', 'startBackfill24mResumable')
      // 3) Set Cursors
      .addSubMenu(SpreadsheetApp.getUi().createMenu('Set Cursors')
        .addItem('Set Sync Cursor (NOW) for All Tokens', 'setCursorNowForAllTokens')
        .addItem('Reset Sync Cursors (All Tokens)', 'resetAllPlaidCursors')
        .addSeparator()
        .addItem('Set Sync Cursor (NOW) for Selected Token(s)', 'setCursorNowForSelectedTokens')
        .addItem('Reset Cursor for Selected Token(s)', 'resetCursorForSelectedTokens')
      )
      // 4) Sync New (Incremental)
      .addItem('Sync New (Incremental)', 'syncTransactions')
      // 5) Flagging
      .addItem('Flag Transactions', 'flagTransactions')
    )
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Admin')
      .addItem('Show Backfill State', 'showBackfillState')
      .addItem('Reset Backfill State', 'resetBackfillState')
      .addItem('Create Support Snapshot (Credits Only)', 'createSupportSnapshotCreditsOnly')
      .addItem('Create Card Benefits', 'createCardBenefitsSheet')
      .addItem('Build Benefits Summary', 'buildBenefitsSummary')
      .addItem('Enrich Card Identifiers (Mask/IDs)', 'enrichCardIdentifiers')
      .addItem('Preview Accounts (Official vs Name)', 'createAccountsPreview')
      .addItem('Import Card Benefits (AI)', 'importCardBenefitsAI')
    )
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Cards')
      .addItem('Build/Update Card Universe (AI)', 'buildCardCatalogAI_Open')
      .addItem('Apply Card Universe Updates', 'applyCardUniverseUpdates')
      .addSeparator()
      .addItem('Refresh Card Catalog (AI)', 'updateCardUniverseAI_Open')
      .addItem('Apply Selected Card Universe Rows', 'applySelectedCardUniverseRows')
      .addSeparator()
      .addItem('Build/Update Card Benefits from Universe (AI)', 'buildBenefitsFromUniverseAI_Open')
      .addItem('Apply Benefit Updates', 'applyBenefitUpdates')
    )
    .addItem('Improve Categories (20 at a time)', 'improveCategoriesBatch')
    .addItem('Reset Category Cursor', 'resetImproveCategoryCursor')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Vendors')
      .addItem('Rebuild Vendors from Transactions', 'rebuildVendorsFromTransactions')
      .addItem('Build Vendor Spend (24 months)', 'buildVendorSpend')
      .addItem('Improve Vendors (20 at a time)', 'improveVendorsBatch')
      .addItem('Apply Vendor Categories to Transactions', 'applyVendorCategoriesToTransactions')
      .addItem('Reset Vendor Cursor', 'resetVendorCursor')
    )
    .addSeparator()
    .addItem('Check All Item Statuses', 'checkItemStatus')
    .addItem('Remove Plaid Item...', 'decommissionItem')
    .addToUi();
}

// =========================
// Build Card Catalog (AI) - first-time load, writes directly to Card Benefits
// =========================
function buildCardCatalogAI_Open() {
  const html = HtmlService.createHtmlOutputFromFile('IssuerPickerBuild').setWidth(420).setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, 'Build Card Catalog (AI)');
}

function buildCardCatalogAI_Run(singleIssuer) {
  const ui = SpreadsheetApp.getUi();
  const issuerName = String(singleIssuer || '').trim();
  if (!issuerName) { ui.alert('No issuer selected.'); return; }
  const issuerAllow = new Set([issuerName.toLowerCase()]);
  Logger.log(`[buildCardCatalogAI_Run] start issuer=${issuerName}`);

  const urls = [
    'https://frequentmiler.com/best-credit-card-offers/',
    'https://www.cardratings.com/best-rewards-credit-cards.html'
  ];

  const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
  if (!apiKey) { ui.alert("Missing Script Property 'GEMINI_KEY'."); return; }
  const model = SCRIPT_PROPERTIES.getProperty('GEMINI_MODEL') || 'gemini-flash-lite-latest';
  Logger.log(`[buildCardCatalogAI_Run] model=${model}`);

  // Fetch both sites, combine into a single prompt, and do ONE AI call
  let urlsProcessed = 0;
  const sources = [];
  urls.forEach(u => {
    try {
      const res = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
      const status = res.getResponseCode();
      Logger.log(`[buildCardCatalogAI] fetch ${u} -> ${status}`);
      if (status === 200) {
        urlsProcessed++;
        const html = res.getContentText();
        const text = htmlToText_(html);
        const slice = text.substring(0, 12000);
        sources.push(`URL: ${u}\nTEXT:\n${slice}`);
      }
    } catch (e) {
      Logger.log(`[buildCardCatalogAI] fetch error for ${u}: ${e.message}`);
    }
  });

  if (!sources.length) { Logger.log('[buildCardCatalogAI_Run] no sources'); ui.alert('Failed to fetch content from known sites.'); return; }

  const schema = `JSON array of objects: [{\n  issuer: string,\n  product_name: string,\n  signup_bonus: string\n}]`;
  const prompt = [
    'You are an expert in credit card products, services and offers. Extract credit card product info into STRICT JSON. Output ONLY valid JSON. No prose.',
    `Limit results to issuer: ${issuerName}.`,
    'Return all distinct products for this issuer found in the sources. If signup bonus is unknown, return an empty string.',
    'Schema:', schema,
    'Normalization rules:',
    '- product_name: official product name where possible.',
    '- signup_bonus: concise (e.g., "60k points after $4k/3mo") or empty if unknown.',
    'Sources:',
    sources.join('\n\n---\n\n')
  ].join('\n');

  Logger.log(`[buildCardCatalogAI_Run] sources=${sources.length} promptChars=${prompt.length}`);

  let collected = [];
  let jsonText = geminiGenerateText_(model, apiKey, prompt);
  if (!jsonText) { Logger.log('[buildCardCatalogAI_Run] empty AI response'); ui.alert('AI call failed or returned empty.'); return; }
  Logger.log(`[buildCardCatalogAI_Run] aiChars=${jsonText.length} aiPreview=${jsonText.slice(0, 400)}`);
  try {
    const arr = JSON.parse(jsonText);
    if (Array.isArray(arr)) collected = arr; else throw new Error('not array');
  } catch (_) {
    const strictPrompt = prompt + '\n\nReturn ONLY a JSON array. No prose. No code fences. No explanations.';
    const retryText = geminiGenerateText_(model, apiKey, strictPrompt);
    try { const arr2 = retryText ? JSON.parse(retryText) : null; if (Array.isArray(arr2)) collected = arr2; } catch (_) { collected = parseJsonLenient_(retryText || ''); }
  }

  if (!collected || !Array.isArray(collected)) {
    Logger.log('[buildCardCatalogAI_Run] parse failed, raw preview: ' + (jsonText || '').slice(0, 800));
    ui.alert('AI output not parseable as JSON. See execution logs.');
    return;
  }
  if (!collected.length) { Logger.log('[buildCardCatalogAI_Run] collected=0, raw preview: ' + (jsonText || '').slice(0, 800)); ui.alert('No data extracted from known sites. Check logs.'); return; }

  // Normalize & default issuer
  const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const sel = norm(issuerName);
  collected = collected
    .map(p => ({
      issuer: String(p.issuer || '').trim(),
      product_name: String(p.product_name || '').trim(),
      signup_bonus: String(p.signup_bonus || '').trim(),
    }))
    .filter(p => !!p.product_name)
    .map(p => {
      const i = norm(p.issuer);
      if (!i || !(i.includes(sel) || sel.includes(i))) {
        // default to selected issuer when missing or mismatched
        p.issuer = issuerName;
      }
      return p;
    });
  Logger.log(`[buildCardCatalogAI_Run] normalized items=${collected.length} sample=` + JSON.stringify(collected.slice(0,3)));

  // Upsert into Card Universe (MINIMAL schema: Issuer, Product Name, Signup Bonus, Card Type)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uni = ensureCardUniverseMinimal_();
  Logger.log(`[buildCardCatalogAI_Run] targetSpreadsheetId=${ss.getId()} sheet='Card Universe'`);
  const headers = ['Issuer','Product Name','Signup Bonus','Card Type'];
  const allHdr = uni.getRange(1,1,1,headers.length).getValues()[0].map(h=>String(h||'').trim());
  const idx = (label) => allHdr.findIndex(h => h.toLowerCase() === label.toLowerCase());
  const iIssuer = idx('Issuer');
  const iProduct = idx('Product Name');
  const iSignup = idx('Signup Bonus');
  const iCardType = idx('Card Type');

  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const lastRow = uni.getLastRow();
  const lastCol = headers.length;
  Logger.log(`[buildCardCatalogAI_Run] beforeRead lastRow=${lastRow} lastCol=${lastCol}`);
  let rows = lastRow > 1 ? uni.getRange(2,1,lastRow-1,lastCol).getValues() : [];
  Logger.log(`[buildCardCatalogAI_Run] existingRows=${rows.length}`);
  // Compact: drop rows for selected issuer and fully blank rows (issuer+product+signup empty)
  const isBlankRow = (r) => !String(r[iIssuer]||'').trim() && !String(r[iProduct]||'').trim() && !String(r[iSignup]||'').trim();
  const toKeep = rows.filter(r => {
    const iss = String(r[iIssuer]||'').trim().toLowerCase();
    if (iss === issuerName.toLowerCase()) return false; // remove selected issuer rows
    if (isBlankRow(r)) return false; // drop fully blank
    return true;
  });
  Logger.log(`[buildCardCatalogAI_Run] compaction keep=${toKeep.length} removed=${rows.length - toKeep.length}`);
  if (rows.length) {
    if (toKeep.length) {
      uni.getRange(2,1,toKeep.length,lastCol).setValues(toKeep);
    }
    if (rows.length > toKeep.length) {
      const clearStart = 2 + toKeep.length;
      const clearCount = rows.length - toKeep.length;
      Logger.log(`[buildCardCatalogAI_Run] clearing range A${clearStart}:${String.fromCharCode(64+lastCol)}${clearStart + clearCount - 1}`);
      uni.getRange(clearStart,1,clearCount,lastCol).clearContent();
    }
  }
  // Re-read compacted rows and rebuild index
  const lastRowAfterCompact = uni.getLastRow();
  rows = lastRowAfterCompact > 1 ? uni.getRange(2,1,lastRowAfterCompact-1,lastCol).getValues() : [];
  Logger.log(`[buildCardCatalogAI_Run] afterCompact existingRows=${rows.length}`);
  const keyIndex = new Map(); // issuer|product -> row index
  for (let r=0;r<rows.length;r++) {
    const k = `${String(rows[r][iIssuer]||'').trim().toLowerCase()}|${String(rows[r][iProduct]||'').trim().toLowerCase()}`;
    if (!keyIndex.has(k)) keyIndex.set(k, r);
  }

  const toAppend = [];
  let updatesStaged = 0;
  const products = new Map(); // track latest signup bonus per product
  // Relaxed issuer matching: treat missing or alias issuers as the selected issuer
  const isIssuerMatch = (iss) => {
    const i = norm(iss);
    if (!i) return true; // allow if missing, we'll set issuer later
    if (i.includes(sel) || sel.includes(i)) return true;
    // common aliases
    const aliases = new Map([
      ['american express','amex'],
      ['citi','citibank'],
      ['barclays','barclaycard'],
      ['wells fargo','wellsfargo'],
    ]);
    for (const [a,b] of aliases) {
      if ((i.includes(a) && sel.includes(a)) || (i.includes(b) && sel.includes(a)) || (i.includes(a) && sel.includes(b)) || (i.includes(b) && sel.includes(b))) return true;
    }
    return false;
  };

  let kept = 0;
  collected.forEach(p => {
    const issuer = String(p.issuer || '').trim();
    if (!isIssuerMatch(issuer)) return;
    const product = String(p.product_name || '').trim();
    const signup = String(p.signup_bonus || '').trim();
    if (!product) return;
    const key = `${issuer.toLowerCase()}|${product.toLowerCase()}`;
    if (products.has(key)) return; // avoid duplicates from multiple chunks
    products.set(key, signup);
    kept++;
    if (keyIndex.has(key)) {
      const r = keyIndex.get(key);
      const curSignup = String(rows[r][iSignup]||'').trim();
      const curType = String(rows[r][iCardType]||'').trim();
      // Update live if signup bonus changed or empty type can be filled
      if (signup && signup !== curSignup) rows[r][iSignup] = signup;
      const cardType = deriveCardType_(product);
      if (!curType && cardType) rows[r][iCardType] = cardType;
    } else {
      const newRow = new Array(lastCol).fill('');
      newRow[iIssuer] = issuer;
      newRow[iProduct] = product;
      newRow[iSignup] = signup;
      newRow[iCardType] = deriveCardType_(product);
      toAppend.push(newRow);
    }
  });

  // Write back
  if (rows.length) {
    Logger.log(`[buildCardCatalogAI_Run] writing existing back rows=${rows.length} range=A2:${String.fromCharCode(64+lastCol)}${rows.length+1}`);
    uni.getRange(2,1,rows.length,lastCol).setValues(rows);
  }
  if (toAppend.length) {
    const startRow = uni.getLastRow()+1;
    const endRow = startRow + toAppend.length - 1;
    Logger.log(`[buildCardCatalogAI_Run] appending rows=${toAppend.length} range=A${startRow}:${String.fromCharCode(64+lastCol)}${endRow}`);
    Logger.log(`[buildCardCatalogAI_Run] firstAppendRow=` + JSON.stringify(toAppend[0]));
    uni.getRange(startRow,1,toAppend.length,lastCol).setValues(toAppend);
  }
  uni.autoResizeColumns(1, lastCol);
  const afterLastRow = uni.getLastRow();
  Logger.log(`[buildCardCatalogAI_Run] afterWrite lastRow=${afterLastRow}`);
  Logger.log(`[buildCardCatalogAI_Run] done new=${toAppend.length} urls=${urlsProcessed} parsed=${collected.length} kept=${kept}`);
  ui.alert(`Universe build for ${issuerName} complete. New products: ${toAppend.length}. URLs: ${urlsProcessed}. Parsed items: ${collected.length}.`);
}

// Ensure Card Universe minimal schema (Issuer, Product Name, Signup Bonus, Card Type).
// If an older wide schema exists with data, back it up to 'Card Universe (backup yyyy-mm-dd)'.
function ensureCardUniverseMinimal_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Card Universe';
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const minimal = ['Issuer','Product Name','Signup Bonus','Card Type'];
  const hasHeader = sheet.getLastRow() >= 1 && sheet.getRange(1,1,1, Math.max(1, sheet.getLastColumn())).getValues()[0].some(Boolean);
  if (hasHeader) {
    const currentLastCol = sheet.getLastColumn();
    if (currentLastCol > minimal.length) {
      // Backup once per day
      const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const backupName = `Card Universe (backup ${stamp})`;
      if (!ss.getSheetByName(backupName)) {
        const backup = sheet.copyTo(ss).setName(backupName);
      }
      // Reset to minimal schema
      sheet.clearContents();
    }
  }
  sheet.getRange(1,1,1,minimal.length).setValues([minimal]).setFontWeight('bold');
  return sheet;
}

// Derive card type based on product name heuristics
function deriveCardType_(productName) {
  const p = String(productName||'').toLowerCase();
  const cobrandKeywords = ['jetblue','united','delta','hilton','marriott','lufthansa','hawaiian','ihg','southwest','aa','aadvantage','miles & more','miles and more','hyatt','british airways','qqq'];
  for (const k of cobrandKeywords) {
    if (p.includes(k)) return 'Co-brand';
  }
  return 'Points';
}

// Apply staged Signup Bonus updates in Card Universe
function applyCardUniverseUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uni = ss.getSheetByName('Card Universe');
  const upd = ss.getSheetByName('Universe Updates');
  if (!uni) { SpreadsheetApp.getUi().alert("Sheet 'Card Universe' not found."); return; }
  if (!upd) { SpreadsheetApp.getUi().alert("Sheet 'Universe Updates' not found."); return; }
  Logger.log('[applyCardUniverseUpdates] start (Universe Updates)');
  const uLastCol = uni.getLastColumn();
  const uHdr = uni.getRange(1,1,1,uLastCol).getValues()[0].map(h=>String(h||'').trim());
  const uIdx = (n) => uHdr.findIndex(h => h.toLowerCase() === n.toLowerCase());
  const uiIssuer = uIdx('Issuer');
  const uiProduct = uIdx('Product Name');
  const uiSignup = uIdx('Signup Bonus');
  const updLastCol = upd.getLastColumn();
  const h = upd.getRange(1,1,1,updLastCol).getValues()[0].map(x=>String(x||'').trim());
  const iIssuer = h.indexOf('Issuer');
  const iProduct = h.indexOf('Product Name');
  const iExist = h.indexOf('Existing Signup Bonus');
  const iProp = h.indexOf('Proposed Signup Bonus');
  const iApply = h.indexOf('Apply?');
  const iApplied = h.indexOf('Applied?');
  const iLastUpd = h.indexOf('Last Updated');
  const rows = upd.getLastRow() > 1 ? upd.getRange(2,1,upd.getLastRow()-1, updLastCol).getValues() : [];
  if (!rows.length) { SpreadsheetApp.getUi().alert('No updates to apply.'); return; }
  const uniRows = uni.getLastRow() > 1 ? uni.getRange(2,1,uni.getLastRow()-1,uLastCol).getValues() : [];
  const index = new Map();
  for (let r=0;r<uniRows.length;r++) {
    const k = `${String(uniRows[r][uiIssuer]||'').trim().toLowerCase()}|${String(uniRows[r][uiProduct]||'').trim().toLowerCase()}`;
    if (!index.has(k)) index.set(k, r);
  }
  let applied = 0;
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  for (let r=0;r<rows.length;r++) {
    const doApply = rows[r][iApply] === true;
    const already = rows[r][iApplied] === true;
    const proposed = String(rows[r][iProp]||'').trim();
    const issuer = String(rows[r][iIssuer]||'').trim();
    const product = String(rows[r][iProduct]||'').trim();
    if (!doApply || already || !proposed || !product) continue;
    const k = `${issuer.toLowerCase()}|${product.toLowerCase()}`;
    if (!index.has(k)) continue;
    const ur = index.get(k);
    uniRows[ur][uiSignup] = proposed;
    rows[r][iApplied] = true;
    rows[r][iApply] = false;
    rows[r][iLastUpd] = nowStr;
    applied++;
  }
  if (uniRows.length) uni.getRange(2,1,uniRows.length,uLastCol).setValues(uniRows);
  if (rows.length) upd.getRange(2,1,rows.length,updLastCol).setValues(rows);
  Logger.log(`[applyCardUniverseUpdates] applied=${applied}`);
  SpreadsheetApp.getUi().alert(`Applied ${applied} Card Universe update(s).`);
}

// =========================
// Build/Update Card Benefits from Universe (AI) with staging of updates
// =========================
function buildBenefitsFromUniverseAI_Open() {
  const html = HtmlService.createHtmlOutputFromFile('IssuerPickerBuild').setWidth(420).setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'Build/Update Card Benefits from Universe (AI)');
}

function buildBenefitsFromUniverseAI_Run(singleIssuer) {
  const ui = SpreadsheetApp.getUi();
  const issuerName = String(singleIssuer || '').trim();
  if (!issuerName) { ui.alert('No issuer selected.'); return; }
  Logger.log(`[buildBenefitsFromUniverseAI_Run] start issuer=${issuerName}`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uni = ss.getSheetByName('Card Universe');
  if (!uni) { ui.alert("'Card Universe' sheet not found."); return; }
  const lastRow = uni.getLastRow();
  const lastCol = uni.getLastColumn();
  if (lastRow <= 1) { ui.alert('Card Universe is empty.'); return; }
  const uh = uni.getRange(1,1,1,lastCol).getValues()[0].map(h=>String(h||'').trim());
  const uIdx = (n)=> uh.findIndex(h => h.toLowerCase() === n.toLowerCase());
  const uIssuer = uIdx('Issuer');
  const uProduct = uIdx('Product Name');
  if (uIssuer === -1 || uProduct === -1) { ui.alert('Card Universe headers missing Issuer/Product Name.'); return; }
  const uRows = uni.getRange(2,1,lastRow-1,lastCol).getValues();
  const products = Array.from(new Set(uRows.filter(r=>String(r[uIssuer]||'').trim().toLowerCase()===issuerName.toLowerCase()).map(r=>String(r[uProduct]||'').trim()).filter(Boolean)));
  if (!products.length) { Logger.log('[buildBenefitsFromUniverseAI_Run] products=0'); ui.alert(`No products found in Card Universe for ${issuerName}.`); return; }
  Logger.log(`[buildBenefitsFromUniverseAI_Run] products=${products.length}`);

  const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
  if (!apiKey) { ui.alert("Missing Script Property 'GEMINI_KEY'."); return; }
  const model = SCRIPT_PROPERTIES.getProperty('GEMINI_MODEL') || 'gemini-flash-lite-latest';

  // Prepare Card Benefits and Benefit Updates sheets
  let cb = ss.getSheetByName('Card Benefits');
  if (!cb) cb = ss.insertSheet('Card Benefits');
  const cbHeaders = ['Issuer','Product Name','Benefit','Timing','Max Amount','Keywords','Active?'];
  if (cb.getLastRow() === 0 || cb.getLastColumn() === 0) cb.getRange(1,1,1,cbHeaders.length).setValues([cbHeaders]).setFontWeight('bold');
  const cbLastCol = Math.max(cb.getLastColumn(), cbHeaders.length);
  const cbHdr = cb.getRange(1,1,1,cbLastCol).getValues()[0].map(h=>String(h||'').trim());
  const cIdx = (n)=> cbHdr.findIndex(h => h.toLowerCase() === n.toLowerCase());
  const ciIssuer = cIdx('Issuer');
  const ciProduct = cIdx('Product Name');
  const ciBenefit = cIdx('Benefit');
  const ciTiming = cIdx('Timing');
  const ciMax = cIdx('Max Amount');
  const ciKeywords = cIdx('Keywords');
  const ciActive = cIdx('Active?');
  const cbRows = cb.getLastRow() > 1 ? cb.getRange(2,1,cb.getLastRow()-1,cbLastCol).getValues() : [];
  const cbKeyIndex = new Map(); // issuer|product|benefit -> idx
  for (let i=0;i<cbRows.length;i++) {
    const k = `${String(cbRows[i][ciIssuer]||'').trim().toLowerCase()}|${String(cbRows[i][ciProduct]||'').trim().toLowerCase()}|${String(cbRows[i][ciBenefit]||'').trim().toLowerCase()}`;
    if (!cbKeyIndex.has(k)) cbKeyIndex.set(k, i);
  }

  let bu = ss.getSheetByName('Benefit Updates');
  const buHeaders = ['Issuer','Product Name','Benefit','Existing Timing','Proposed Timing','Existing Max','Proposed Max','Existing Keywords','Proposed Keywords','Change Type','Apply?','Applied?','Last Updated'];
  if (!bu) {
    bu = ss.insertSheet('Benefit Updates');
    bu.getRange(1,1,1,buHeaders.length).setValues([buHeaders]).setFontWeight('bold');
  } else {
    const buLastCol = Math.max(bu.getLastColumn(), buHeaders.length);
    const cur = bu.getRange(1,1,1,buLastCol).getValues()[0];
    bu.getRange(1,1,1,buHeaders.length).setValues([buHeaders]).setFontWeight('bold');
  }
  const buLastCol = Math.max(bu.getLastColumn(), buHeaders.length);
  const buHdr = bu.getRange(1,1,1,buLastCol).getValues()[0].map(h=>String(h||'').trim());
  const bIdx = (n)=> buHdr.findIndex(h => h.toLowerCase() === n.toLowerCase());
  const biApply = bIdx('Apply?');
  const biApplied = bIdx('Applied?');
  // checkbox validation
  const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  bu.getRange(2, biApply+1, Math.max(bu.getMaxRows()-1,1), 1).setDataValidation(rule);
  bu.getRange(2, biApplied+1, Math.max(bu.getMaxRows()-1,1), 1).setDataValidation(rule);

  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const newBenefitRows = [];
  const stagedUpdates = [];

  // For each product, extract benefits
  products.forEach(productName => {
    const schema = `JSON array of objects: [{\n  benefit: string,\n  timing: string,\n  max_amount: number|null,\n  keywords: string[]\n}]`;
    const prompt = [
      'You are an expert in credit card products, services and offers. Extract cash benefits for the following card into STRICT JSON. Output ONLY valid JSON. No prose.',
      'Issuer: ' + issuerName,
      'Product: ' + productName,
      'Schema:', schema,
      'Normalization rules:',
      '- timing: Monthly|Quarterly|SemiAnnually|Annually or empty if unknown.',
      '- max_amount: numeric (no currency symbol) or null.',
      "- keywords: 2-6 concise lowercase detection terms likely to appear in transaction text.",
    ].join('\n');
    const jsonText = geminiGenerateText_(model, apiKey, prompt);
    if (!jsonText) return;
    let arr = null;
    try { arr = JSON.parse(jsonText); } catch (_) { arr = parseJsonLenient_(jsonText); }
    if (!Array.isArray(arr)) return;
    arr.forEach(b => {
      const benefitName = String(b.benefit || '').trim();
      if (!benefitName) return;
      const timing = String(b.timing || '').trim();
      const maxNum = (b.max_amount === null || b.max_amount === undefined || b.max_amount === '') ? '' : Number(b.max_amount) || '';
      const kws = Array.isArray(b.keywords) ? b.keywords.map(s=>String(s||'').trim().toLowerCase()).filter(Boolean).join(', ') : '';
      const k = `${issuerName.toLowerCase()}|${productName.toLowerCase()}|${benefitName.toLowerCase()}`;
      if (cbKeyIndex.has(k)) {
        const ri = cbKeyIndex.get(k);
        const row = cbRows[ri];
        const existTiming = String(row[ciTiming]||'').trim();
        const existMax = row[ciMax];
        const existKw = String(row[ciKeywords]||'').trim();
        const anyChange = (timing && timing !== existTiming) || (maxNum !== '' && maxNum !== existMax) || (kws && kws !== existKw);
        if (anyChange) stagedUpdates.push([issuerName, productName, benefitName, existTiming, timing, existMax, maxNum, existKw, kws, 'Update', false, false, nowStr]);
      } else {
        newBenefitRows.push([issuerName, productName, benefitName, timing, maxNum, kws, 'Y']);
      }
    });
  });

  if (newBenefitRows.length) cb.getRange(cb.getLastRow()+1,1,newBenefitRows.length, cbHeaders.length).setValues(newBenefitRows);
  if (stagedUpdates.length) bu.getRange(bu.getLastRow()+1,1,stagedUpdates.length, buHeaders.length).setValues(stagedUpdates);
  cb.autoResizeColumns(1, cbHeaders.length);
  bu.autoResizeColumns(1, buHeaders.length);
  Logger.log(`[buildBenefitsFromUniverseAI_Run] done new=${newBenefitRows.length} staged=${stagedUpdates.length}`);
  ui.alert(`Benefits build for ${issuerName}. New benefits: ${newBenefitRows.length}. Updates staged: ${stagedUpdates.length}.`);
}

function applyBenefitUpdates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bu = ss.getSheetByName('Benefit Updates');
  if (!bu) { SpreadsheetApp.getUi().alert("'Benefit Updates' not found."); return; }
  Logger.log('[applyBenefitUpdates] start');
  const lastRow = bu.getLastRow();
  const lastCol = bu.getLastColumn();
  if (lastRow <= 1) { SpreadsheetApp.getUi().alert('No updates to apply.'); return; }
  const hdr = bu.getRange(1,1,1,lastCol).getValues()[0].map(h=>String(h||'').trim());
  const idx = (n)=> hdr.findIndex(h => h.toLowerCase() === n.toLowerCase());
  const iIssuer = idx('Issuer');
  const iProduct = idx('Product Name');
  const iBenefit = idx('Benefit');
  const iET = idx('Existing Timing');
  const iPT = idx('Proposed Timing');
  const iEM = idx('Existing Max');
  const iPM = idx('Proposed Max');
  const iEK = idx('Existing Keywords');
  const iPK = idx('Proposed Keywords');
  const iApply = idx('Apply?');
  const iApplied = idx('Applied?');
  const iLastUpd = idx('Last Updated');
  const rows = bu.getRange(2,1,lastRow-1,lastCol).getValues();

  let cb = ss.getSheetByName('Card Benefits');
  if (!cb) cb = ss.insertSheet('Card Benefits');
  const cbLastCol = cb.getLastColumn();
  const cbHdr = cb.getRange(1,1,1,cbLastCol).getValues()[0].map(h=>String(h||'').trim());
  const cIdx = (n)=> cbHdr.findIndex(h => h.toLowerCase() === n.toLowerCase());
  const ciIssuer = cIdx('Issuer');
  const ciProduct = cIdx('Product Name');
  const ciBenefit = cIdx('Benefit');
  const ciTiming = cIdx('Timing');
  const ciMax = cIdx('Max Amount');
  const ciKeywords = cIdx('Keywords');
  const ciActive = cIdx('Active?');
  const cbRows = cb.getLastRow() > 1 ? cb.getRange(2,1,cb.getLastRow()-1,cbLastCol).getValues() : [];
  const index = new Map();
  for (let i=0;i<cbRows.length;i++) {
    const k = `${String(cbRows[i][ciIssuer]||'').trim().toLowerCase()}|${String(cbRows[i][ciProduct]||'').trim().toLowerCase()}|${String(cbRows[i][ciBenefit]||'').trim().toLowerCase()}`;
    if (!index.has(k)) index.set(k, i);
  }
  let applied = 0;
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  for (let r=0;r<rows.length;r++) {
    const doApply = rows[r][iApply] === true;
    const already = rows[r][iApplied] === true;
    if (!doApply || already) continue;
    const issuer = String(rows[r][iIssuer]||'').trim();
    const product = String(rows[r][iProduct]||'').trim();
    const benefit = String(rows[r][iBenefit]||'').trim();
    const newT = String(rows[r][iPT]||'').trim();
    const newM = rows[r][iPM];
    const newK = String(rows[r][iPK]||'').trim();
    const k = `${issuer.toLowerCase()}|${product.toLowerCase()}|${benefit.toLowerCase()}`;
    if (index.has(k)) {
      const irow = index.get(k);
      const row = cbRows[irow];
      if (newT) row[ciTiming] = newT;
      if (newM !== '') row[ciMax] = newM;
      if (newK) row[ciKeywords] = newK;
      if (!row[ciActive]) row[ciActive] = 'Y';
      cbRows[irow] = row;
    } else {
      // If missing entirely, insert
      cbRows.push([issuer, product, benefit, newT, newM, newK, 'Y']);
    }
    rows[r][iApplied] = true;
    rows[r][iApply] = false;
    rows[r][iLastUpd] = nowStr;
    applied++;
  }
  if (cbRows.length) cb.getRange(2,1,cbRows.length,cbLastCol).setValues(cbRows);
  bu.getRange(2,1,rows.length,lastCol).setValues(rows);
  cb.autoResizeColumns(1, cb.getLastColumn());
  Logger.log(`[applyBenefitUpdates] applied=${applied}`);
  SpreadsheetApp.getUi().alert(`Applied ${applied} benefit update(s).`);
}

// =========================
// Helpers: HTML to text
// =========================
function htmlToText_(html) {
  if (!html) return '';
  // Remove scripts/styles
  let s = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // Replace breaks and paragraphs with newlines
  s = s.replace(/<(br|p|div|li|h\d)[^>]*>/gi, '\n');
  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, ' ');
  // Decode a few common entities
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// =========================
// Update Card Universe from known URLs via AI
// =========================
function updateCardUniverseFromKnownSitesAI() {
  const ui = SpreadsheetApp.getUi();
  // Optional issuer filter
  const issuerResp = ui.prompt('Known Sites Import (AI)', 'Enter issuers to include (optional, comma-separated). Leave blank for all.', ui.ButtonSet.OK_CANCEL);
  if (issuerResp.getSelectedButton() !== ui.Button.OK) return;
  const issuersInput = (issuerResp.getResponseText() || '').trim();
  const issuerAllow = new Set(issuersInput ? issuersInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []);

  const urls = [
    'https://frequentmiler.com/best-credit-card-offers/',
    'https://www.cardratings.com/best-rewards-credit-cards.html'
  ];

  const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
  if (!apiKey) { ui.alert("Missing Script Property 'GEMINI_KEY'."); return; }
  const model = SCRIPT_PROPERTIES.getProperty('GEMINI_MODEL') || 'gemini-flash-lite-latest';

  // Fetch and concatenate text
  const parts = [];
  urls.forEach(u => {
    try {
      const res = UrlFetchApp.fetch(u, { muteHttpExceptions: true });
      const status = res.getResponseCode();
      if (status === 200) {
        const html = res.getContentText();
        const text = htmlToText_(html);
        parts.push(`URL: ${u}\nTEXT:\n${text}`);
      } else {
        Logger.log(`[updateCardUniverseFromKnownSitesAI] fetch ${u} -> ${status}`);
      }
    } catch (e) {
      Logger.log(`[updateCardUniverseFromKnownSitesAI] fetch error for ${u}: ${e.message}`);
    }
  });
  if (!parts.length) { ui.alert('Failed to fetch content from known sites.'); return; }

  const schema = `JSON array of objects: [{\n  issuer: string,\n  product_name: string,\n  signup_bonus: string,\n  benefits: [{ benefit: string, timing: string, max_amount: number|null, keywords: string[] }]\n}]`;
  const prompt = [
    'You are an expert data normalizer. Extract credit card product info into STRICT JSON. Output ONLY valid JSON. No prose.',
    'Schema:', schema,
    'Normalization rules:',
    '- timing: Monthly|Quarterly|SemiAnnually|Annually or empty if unknown.',
    '- max_amount: numeric (no currency symbol) or null.',
    "- keywords: 2-6 concise lowercase detection terms likely to appear in transaction text.",
    '- signup_bonus: concise text (e.g., "60k points after $4k/3mo").',
    'Source documents below (multiple URLs provided):',
    parts.join('\n\n---\n\n')
  ].join('\n');

  const jsonText = geminiGenerateText_(model, apiKey, prompt);
  if (!jsonText) { ui.alert('AI call failed or returned empty. Check Logs.'); return; }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) throw new Error('Top-level is not an array');
  } catch (e) {
    Logger.log(`[updateCardUniverseFromKnownSitesAI] JSON parse error: ${e.message}`);
    Logger.log(`[updateCardUniverseFromKnownSitesAI] raw: ${jsonText.slice(0, 1000)}`);
    ui.alert('AI output was not valid JSON. See logs.');
    return;
  }

  const sheet = ensureCardUniverseSheet_();
  const headers = ['Issuer','Product Name','Signup Bonus','Benefit','Timing','Max Amount','Keywords','Active?','Apply?','Applied?','Last Updated'];
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const rows = [];
  parsed.forEach(p => {
    const issuer = String(p.issuer || '').trim();
    if (issuerAllow.size && !issuerAllow.has(issuer.toLowerCase())) return;
    const product = String(p.product_name || '').trim();
    const signup = String(p.signup_bonus || '').trim();
    const benefits = Array.isArray(p.benefits) ? p.benefits : [];
    if (!product || benefits.length === 0) return;
    benefits.forEach(b => {
      const benefit = String(b.benefit || '').trim();
      const timing = String(b.timing || '').trim();
      const maxNum = (b.max_amount === null || b.max_amount === undefined || b.max_amount === '') ? '' : Number(b.max_amount) || '';
      const kws = Array.isArray(b.keywords) ? b.keywords.map(s=>String(s||'').trim().toLowerCase()).filter(Boolean).join(', ') : '';
      if (!benefit) return;
      rows.push([issuer, product, signup, benefit, timing, maxNum, kws, 'Y', false, false, nowStr]);
    });
  });
  if (!rows.length) { ui.alert('No rows extracted from known sites with current filters.'); return; }
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
  ui.alert(`Card Universe updated from known sites: added ${rows.length} candidate row(s). Check Apply? to commit.`);
}

// =========================
// Card Universe (staging catalog with row-level Apply)
// =========================
function ensureCardUniverseSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Card Universe';
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const headers = ['Issuer','Product Name','Signup Bonus','Benefit','Timing','Max Amount','Keywords','Active?','Apply?','Applied?','Last Updated'];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  } else {
    const lastCol = Math.max(sheet.getLastColumn(), headers.length);
    const current = sheet.getRange(1,1,1,lastCol).getValues()[0];
    // Rewrite header row to our schema for consistency
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  }
  // Add checkbox data validation for Apply? and Applied?
  const lastRow = Math.max(2, sheet.getMaxRows());
  const iApply = headers.indexOf('Apply?') + 1;
  const iApplied = headers.indexOf('Applied?') + 1;
  const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, iApply, sheet.getMaxRows()-1, 1).setDataValidation(rule);
  sheet.getRange(2, iApplied, sheet.getMaxRows()-1, 1).setDataValidation(rule);
  return sheet;
}

function updateCardUniverseAI_Open() {
  const html = HtmlService.createHtmlOutputFromFile('IssuerPicker').setWidth(420).setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, 'Update Card Universe (AI)');
}

function updateCardUniverseAI_Run(singleIssuer) {
  const ui = SpreadsheetApp.getUi();
  const issuerName = String(singleIssuer || '').trim();
  if (!issuerName) { ui.alert('No issuer selected.'); return; }
  const issuerAllow = new Set([issuerName.toLowerCase()]);
  Logger.log(`[updateCardUniverseAI_Run] start issuer=${issuerName}`);

  const urls = [
    'https://frequentmiler.com/best-credit-card-offers/',
    'https://www.cardratings.com/best-rewards-credit-cards.html'
  ];

  const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
  if (!apiKey) { ui.alert("Missing Script Property 'GEMINI_KEY'."); return; }
  const model = SCRIPT_PROPERTIES.getProperty('GEMINI_MODEL') || 'gemini-2.5-pro';
  Logger.log(`[updateCardUniverseAI_Run] model=${model}`);

  // Fetch, chunk, and process per chunk
  let urlsProcessed = 0;
  let chunksProcessed = 0;
  let itemsParsed = 0;
  const collected = [];
  urls.forEach(u => {
    try {
      const res = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
      const status = res.getResponseCode();
      Logger.log(`[updateCardUniverseAI] fetch ${u} -> ${status}`);
      if (status === 200) {
        urlsProcessed++;
        const html = res.getContentText();
        const text = htmlToText_(html);
        const chunks = chunkText_(text, 15000);
        Logger.log(`[updateCardUniverseAI] ${u} split into ${chunks.length} chunk(s)`);
        chunks.forEach((chunkText, idx) => {
          const schema = `JSON array of objects: [{\n  issuer: string,\n  product_name: string,\n  signup_bonus: string,\n  cash benefits: [{ benefit: string, timing: string, max_amount: number|null, keywords: string[] }]\n}]`;
          const issuerPhrase = (issuerAllow.size ? Array.from(issuerAllow).join(', ') : 'American Express, Chase, Citi, Barclays, Wells Fargo');
          const prompt = [
            'You are an expert in credit card products, services and offers: Your instruction are to find ' + issuerPhrase + ' credit cards and extract credit card product info into STRICT JSON. Output ONLY valid JSON. No prose.',
            'Schema:', schema,
            'Normalization rules:',
            '- timing: Monthly|Quarterly|SemiAnnually|Annually or empty if unknown.',
            '- max_amount: numeric (no currency symbol) or null.',
            "- keywords: 2-6 concise lowercase detection terms likely to appear in transaction text.",
            '- signup_bonus: concise text (e.g., "60k points after $4k/3mo").',
            `Source document (chunk ${idx+1}/${chunks.length}) for URL: ${u}:\n`,
            chunkText
          ].join('\n');

          const jsonText = geminiGenerateText_(model, apiKey, prompt);
          if (!jsonText) { Logger.log(`[updateCardUniverseAI] empty AI response for ${u} chunk ${idx+1}`); return; }
          let parsed = null;
          try { parsed = JSON.parse(jsonText); } catch (_) { parsed = parseJsonLenient_(jsonText); }
          if (!parsed || !Array.isArray(parsed)) {
            const strictPrompt = prompt + '\n\nReturn ONLY a JSON array. No prose. No code fences. No explanations.';
            const retryText = geminiGenerateText_(model, apiKey, strictPrompt);
            try { parsed = retryText ? JSON.parse(retryText) : null; } catch (_) { parsed = parseJsonLenient_(retryText || ''); }
          }
          if (parsed && Array.isArray(parsed)) {
            itemsParsed += parsed.length;
            collected.push(...parsed);
          } else {
            Logger.log(`[updateCardUniverseAI] failed to parse chunk ${idx+1} for ${u}`);
          }
          chunksProcessed++;
        });
      }
    } catch (e) {
      Logger.log(`[updateCardUniverseAI] fetch error for ${u}: ${e.message}`);
    }
  });

  if (!collected.length) { ui.alert('No data extracted from known sites. Check logs.'); return; }

  const sheet = ensureCardUniverseSheet_();
  const headers = ['Issuer','Product Name','Signup Bonus','Benefit','Timing','Max Amount','Keywords','Active?','Apply?','Applied?','Last Updated'];
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const rows = [];
  collected.forEach(p => {
    const issuer = String(p.issuer || '').trim();
    if (issuerAllow.size && !issuerAllow.has(issuer.toLowerCase())) return;
    const product = String(p.product_name || '').trim();
    const signup = String(p.signup_bonus || '').trim();
    const benefits = Array.isArray(p['cash benefits']) ? p['cash benefits'] : (Array.isArray(p.benefits) ? p.benefits : []);
    if (!product || benefits.length === 0) return;
    benefits.forEach(b => {
      const benefit = String(b.benefit || '').trim();
      const timing = String(b.timing || '').trim();
      const maxNum = (b.max_amount === null || b.max_amount === undefined || b.max_amount === '') ? '' : Number(b.max_amount) || '';
      const kws = Array.isArray(b.keywords) ? b.keywords.map(s=>String(s||'').trim().toLowerCase()).filter(Boolean).join(', ') : '';
      if (!benefit) return;
      rows.push([issuer, product, signup, benefit, timing, maxNum, kws, 'Y', false, false, nowStr]);
    });
  });
  if (!rows.length) { ui.alert('No eligible rows after filtering by issuer.'); return; }
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
  Logger.log(`[updateCardUniverseAI_Run] done urls=${urlsProcessed} chunks=${chunksProcessed} items=${itemsParsed} rows=${rows.length}`);
  ui.alert(`Card Universe updated. URLs processed: ${urlsProcessed}. Chunks: ${chunksProcessed}. Items parsed: ${itemsParsed}. Rows added: ${rows.length}. Check Apply? to commit.`);
}

// Split large text into chunks (approximate by characters)
function chunkText_(text, maxLen) {
  const t = String(text || '');
  const chunks = [];
  for (let i = 0; i < t.length; i += maxLen) {
    chunks.push(t.substring(i, i + maxLen));
  }
  return chunks;
}

function applySelectedCardUniverseRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Card Universe');
  if (!sheet) { SpreadsheetApp.getUi().alert("Sheet 'Card Universe' not found."); return; }
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) { SpreadsheetApp.getUi().alert('No rows to apply.'); return; }
  const headers = sheet.getRange(1,1,1,lastCol).getValues()[0].map(h=>String(h||'').trim());
  const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iIssuer = idx('Issuer');
  const iProduct = idx('Product Name');
  const iSignup = idx('Signup Bonus');
  const iBenefit = idx('Benefit');
  const iTiming = idx('Timing');
  const iMax = idx('Max Amount');
  const iKeywords = idx('Keywords');
  const iApply = idx('Apply?');
  const iApplied = idx('Applied?');
  if ([iIssuer,iProduct,iBenefit,iTiming,iMax,iKeywords,iApply,iApplied].some(v=>v===-1)) { SpreadsheetApp.getUi().alert('Card Universe headers incomplete.'); return; }
  const rows = sheet.getRange(2,1,lastRow-1,lastCol).getValues();

  // Ensure Card Benefits target exists
  const name = 'Card Benefits';
  let cb = ss.getSheetByName(name);
  if (!cb) cb = ss.insertSheet(name);
  const cbHeaders = ['Issuer','Product Name','Benefit','Timing','Max Amount','Keywords','Active?'];
  if (cb.getLastRow() === 0 || cb.getLastColumn() === 0) cb.getRange(1,1,1,cbHeaders.length).setValues([cbHeaders]).setFontWeight('bold');
  const cbLastCol = Math.max(cb.getLastColumn(), cbHeaders.length);
  const cbHdr = cb.getRange(1,1,1,cbLastCol).getValues()[0].map(h=>String(h||'').trim());
  const cbIdx = (name) => cbHdr.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const ciIssuer = cbIdx('Issuer');
  const ciProduct = cbIdx('Product Name');
  const ciBenefit = cbIdx('Benefit');
  const ciTiming = cbIdx('Timing');
  const ciMax = cbIdx('Max Amount');
  const ciKeywords = cbIdx('Keywords');
  const ciActive = cbIdx('Active?');
  const cbLastRow = cb.getLastRow();
  const existing = cbLastRow > 1 ? cb.getRange(2,1,cbLastRow-1,cbLastCol).getValues() : [];
  const keyIndex = new Map(); // issuer|product|benefit -> index
  for (let r=0;r<existing.length;r++) {
    const k = `${String(existing[r][ciIssuer]||'').trim().toLowerCase()}|${String(existing[r][ciProduct]||'').trim().toLowerCase()}|${String(existing[r][ciBenefit]||'').trim().toLowerCase()}`;
    if (!keyIndex.has(k)) keyIndex.set(k, r);
  }

  const toAppend = [];
  const toUpdateUniverse = [];
  for (let r=0;r<rows.length;r++) {
    const apply = rows[r][iApply] === true;
    const applied = rows[r][iApplied] === true;
    if (!apply || applied) continue;
    const issuer = String(rows[r][iIssuer]||'').trim();
    const product = String(rows[r][iProduct]||'').trim();
    const benefit = String(rows[r][iBenefit]||'').trim();
    const timing = String(rows[r][iTiming]||'').trim();
    const maxVal = rows[r][iMax];
    const keywords = String(rows[r][iKeywords]||'').trim();
    if (!issuer || !product || !benefit) continue;
    const key = `${issuer.toLowerCase()}|${product.toLowerCase()}|${benefit.toLowerCase()}`;
    if (keyIndex.has(key)) {
      const idxExisting = keyIndex.get(key);
      const row = existing[idxExisting];
      if (!row[ciTiming]) row[ciTiming] = timing;
      if (!row[ciMax]) row[ciMax] = maxVal;
      if (!row[ciKeywords] && keywords) row[ciKeywords] = keywords;
      if (!row[ciActive]) row[ciActive] = 'Y';
      existing[idxExisting] = row;
    } else {
      toAppend.push([issuer, product, benefit, timing, maxVal, keywords, 'Y']);
    }
    // mark universe row as applied, clear Apply?
    rows[r][iApplied] = true;
    rows[r][iApply] = false;
  }

  // Write back
  if (existing.length) cb.getRange(2,1,existing.length,cbLastCol).setValues(existing);
  if (toAppend.length) cb.getRange(cb.getLastRow()+1,1,toAppend.length,cbHeaders.length).setValues(toAppend);
  if (rows.length) sheet.getRange(2,1,rows.length,lastCol).setValues(rows);
  cb.autoResizeColumns(1, cbHeaders.length);
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  SpreadsheetApp.getUi().alert(`Applied ${toAppend.length + [...keyIndex.values()].length} card benefit row(s) to Card Benefits.`);
}

// =========================
// Gemini helper (generic text generation)
// =========================
function geminiGenerateText_(model, apiKey, prompt) {
  try {
    const attempts = [
      { ver: 'v1beta', model },
      { ver: 'v1', model }
    ];
    const payload = {
      contents: [{ parts: [{ text: prompt }]}],
      generationConfig: {
        temperature: 0,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        response_mime_type: 'application/json'
      }
    };
    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      const url = `https://generativelanguage.googleapis.com/${a.ver}/models/${encodeURIComponent(a.model)}:generateContent`;
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      const status = res.getResponseCode();
      if (status === 200) {
        const body = JSON.parse(res.getContentText());
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return (text || '').trim();
      } else {
        Logger.log(`[geminiGenerateText_] ${a.ver} ${a.model} -> ${status} body=${res.getContentText().slice(0,500)}`);
      }
    }
    return '';
  } catch (e) {
    Logger.log(`[geminiGenerateText_] error: ${e.message}`);
    return '';
  }
}

// Lenient JSON parser: strips code fences and extracts first JSON array
function parseJsonLenient_(text) {
  try {
    if (!text) return null;
    let t = String(text).trim();
    // remove markdown fences if present
    t = t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
    t = t.replace(/```\s*$/i, '');
    // Try direct parse
    try {
      return JSON.parse(t);
    } catch (_) {}
    // Extract the first array substring
    const start = t.indexOf('[');
    const end = t.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const arr = t.substring(start, end + 1);
      return JSON.parse(arr);
    }
    return null;
  } catch (e) {
    Logger.log(`[parseJsonLenient_] error: ${e.message}`);
    return null;
  }
}

// =========================
// Import Card Benefits via Gemini (AI)
// =========================
function importCardBenefitsAI() {
  const ui = SpreadsheetApp.getUi();
  const issuersResp = ui.prompt('Import Card Benefits (AI)', 'Enter issuers to include (comma-separated). Example: American Express, Chase, Citi', ui.ButtonSet.OK_CANCEL);
  if (issuersResp.getSelectedButton() !== ui.Button.OK) return;
  const issuersInput = (issuersResp.getResponseText() || '').trim();
  if (!issuersInput) { ui.alert('No issuers provided.'); return; }
  const issuerAllow = new Set(issuersInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

  const textResp = ui.prompt('Paste source text', 'Paste benefits/product text from issuer pages. Large texts may need to be split across multiple runs.', ui.ButtonSet.OK_CANCEL);
  if (textResp.getSelectedButton() !== ui.Button.OK) return;
  const sourceText = (textResp.getResponseText() || '').trim();
  if (!sourceText) { ui.alert('No source text pasted.'); return; }

  const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
  if (!apiKey) { ui.alert("Missing Script Property 'GEMINI_KEY'."); return; }
  const model = SCRIPT_PROPERTIES.getProperty('GEMINI_MODEL') || 'gemini-flash-lite-latest';

  const schema = `JSON array of objects: [{\n  issuer: string,\n  product_name: string,\n  benefits: [{ benefit: string, timing: string, max_amount: number|null, keywords: string[] }]\n}]`;
  const prompt = [
    'You are an expert data normalizer. Extract credit card product benefits into STRICT JSON. Output ONLY valid JSON. No prose.',
    'Schema:', schema,
    'Normalization rules:',
    '- timing: map to Monthly|Quarterly|SemiAnnually|Annually or empty if unknown.',
    '- max_amount: numeric without currency symbol; null if none stated.',
    "- keywords: 2-6 concise lowercase detection terms a transaction might contain (e.g., 'resy', 'saks').",
    '- ignore temporary promo offers that are not ongoing benefits.',
    'Source text:\n<<<\n' + sourceText + '\n>>>'
  ].join('\n');

  const jsonText = geminiGenerateText_(model, apiKey, prompt);
  if (!jsonText) { ui.alert('AI call failed or returned empty. Check Logs.'); return; }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) throw new Error('Top-level is not an array');
  } catch (e) {
    Logger.log(`[importCardBenefitsAI] JSON parse error: ${e.message}`);
    Logger.log(`[importCardBenefitsAI] raw: ${jsonText.slice(0, 1000)}`);
    ui.alert('AI output was not valid JSON. See logs.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Card Benefits';
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  // Ensure headers
  const headers = ['Issuer','Product Name','Benefit','Timing','Max Amount','Keywords','Active?'];
  const hasHeader = sheet.getLastRow() >= 1 && sheet.getRange(1,1,1, Math.max(1, sheet.getLastColumn())).getValues()[0].some(Boolean);
  if (!hasHeader) sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');

  const lastCol = sheet.getLastColumn() || headers.length;
  const currentHeaders = sheet.getRange(1,1,1,lastCol).getValues()[0].map(h=>String(h||'').trim());
  const idx = (name) => currentHeaders.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iIssuer = idx('Issuer');
  const iProduct = idx('Product Name');
  const iBenefit = idx('Benefit');
  const iTiming = idx('Timing');
  const iMax = idx('Max Amount');
  const iKeywords = idx('Keywords');
  const iActive = idx('Active?');

  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2,1,lastRow-1,lastCol).getValues() : [];
  const keyIndex = new Map(); // key: issuer|product|benefit -> row index in existing
  for (let r = 0; r < existing.length; r++) {
    const issuer = String(existing[r][iIssuer]||'').trim().toLowerCase();
    const product = String(existing[r][iProduct]||'').trim().toLowerCase();
    const benefit = String(existing[r][iBenefit]||'').trim().toLowerCase();
    const key = `${issuer}|${product}|${benefit}`;
    if (!keyIndex.has(key)) keyIndex.set(key, r);
  }

  const toUpsert = [];
  parsed.forEach(prod => {
    const issuer = String(prod.issuer || '').trim();
    if (!issuerAllow.has(issuer.toLowerCase())) return; // filter issuers
    const product = String(prod.product_name || '').trim();
    if (!product) return;
    const benefits = Array.isArray(prod.benefits) ? prod.benefits : [];
    benefits.forEach(b => {
      const benefitName = String(b.benefit || '').trim();
      if (!benefitName) return;
      const timing = String(b.timing || '').trim();
      const maxNum = (b.max_amount === null || b.max_amount === undefined || b.max_amount === '') ? '' : Number(b.max_amount) || '';
      const kws = Array.isArray(b.keywords) ? b.keywords.map(s=>String(s||'').trim().toLowerCase()).filter(Boolean) : [];
      const key = `${issuer.toLowerCase()}|${product.toLowerCase()}|${benefitName.toLowerCase()}\n`;
      // Upsert logic: if exists, update blank fields only; else insert new
      if (keyIndex.has(key)) {
        const r = keyIndex.get(key);
        const row = existing[r];
        if (!row[iTiming]) row[iTiming] = timing;
        if (!row[iMax]) row[iMax] = maxNum;
        if (!row[iKeywords] && kws.length) row[iKeywords] = kws.join(', ');
        if (!row[iActive]) row[iActive] = 'Y';
        existing[r] = row;
      } else {
        toUpsert.push([issuer, product, benefitName, timing, maxNum, (kws.length?kws.join(', '):''), 'Y']);
      }
    });
  });

  // Write updates
  if (existing.length) sheet.getRange(2,1,existing.length,lastCol).setValues(existing);
  if (toUpsert.length) sheet.getRange(sheet.getLastRow()+1,1,toUpsert.length, headers.length).setValues(toUpsert);
  sheet.autoResizeColumns(1, headers.length);
  ui.alert(`Imported ${toUpsert.length} new row(s). Updated existing where blank.`);
}

// =========================
// Card Benefits sheet (single-source catalog + rules)
// =========================
function createCardBenefitsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Card Benefits';
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();

  const headers = ['Issuer','Product Name','Benefit','Timing','Max Amount','Keywords','Active?'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');

  const starters = [
    // Issuer, Product, Benefit, Timing, Max, Keywords, Active?
    ['American Express','Business Platinum Card®','Airline Fee Reimbursement','Annually','', 'airline fee, incidental', 'Y'],
    ['American Express','Platinum Card®','Airline Fee Reimbursement','Annually','200', 'airline fee, incidental', 'Y'],
    ['American Express','Platinum Card®','Resy Credit','Quarterly','100', 'resy', 'Y'],
    ['American Express','Platinum Card®','Lululemon Credit','Quarterly','75', 'lululemon', 'Y'],
    ['American Express','Platinum Card®','Shop Saks','SemiAnnually','50', 'saks', 'Y'],
    ['American Express','Business Gold Card','Flexible Business Credit','Monthly','20', 'business credit', 'Y'],
    // Barclays placeholders (set Active? to N until benefits/keywords are defined)
    ['Barclays','Wyndham Rewards Earner® Plus','','','','','N'],
    ['Barclays','JetBlue Plus Card','','','','','N'],
    ['Barclays','AAdvantage® Aviator® Red World elite Mastercard®','','','','','N'],
    // Wells Fargo placeholders (set Active? to N until benefits/keywords are defined)
    ['Wells Fargo','Wells Fargo Autograph℠ Card','','','','','N'],
    ['Wells Fargo','Wells Fargo Autograph Journey℠ Card','','','','','N']
  ];
  sheet.getRange(2,1,starters.length, headers.length).setValues(starters);
  sheet.autoResizeColumns(1, headers.length);
  SpreadsheetApp.getUi().alert(`'${name}' sheet is ready. Review and edit if needed.`);
}

// =========================
// Accounts Preview (non-destructive)
// =========================
function createAccountsPreview() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Accounts Preview';
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();

  const headers = ['Account Group','Institution','Item Key','Account ID','Official Name','Name','Mask'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');

  const tokens = getAccessTokens_();
  if (!tokens.length) { SpreadsheetApp.getUi().alert('No access tokens found.'); return; }

  const rows = [];
  tokens.forEach(([accessToken, group]) => {
    const itemKey = tokenHashKey_(accessToken);
    const resp = makePlaidRequest_('/accounts/get', { access_token: accessToken });
    if (!resp.success) {
      Logger.log(`[createAccountsPreview] accounts/get failed for group ${group}: ${resp.error}`);
      return;
    }
    const institutionName = getInstitutionNameById_(resp.data.item?.institution_id);
    (resp.data.accounts || []).forEach(a => {
      rows.push([
        group || '',
        institutionName || '',
        itemKey,
        a.account_id || '',
        a.official_name || '',
        a.name || '',
        a.mask || ''
      ]);
    });
  });

  if (rows.length) {
    sheet.getRange(2,1,rows.length, headers.length).setValues(rows);
  }
  sheet.autoResizeColumns(1, headers.length);
  SpreadsheetApp.getUi().alert(`Accounts Preview built with ${rows.length} row(s).`);
}

// =========================
// Enrich Card Identifiers for historical rows
// =========================
function enrichCardIdentifiers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) { SpreadsheetApp.getUi().alert(`Sheet '${TRANSACTIONS_SHEET}' not found.`); return; }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) { SpreadsheetApp.getUi().alert('No transactions to enrich.'); return; }

  // Ensure columns exist
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const ensureCol = (label) => {
    let i = idx(label);
    if (i === -1) {
      sheet.insertColumnAfter(headers.length);
      headers.push(label);
      sheet.getRange(1, headers.length).setValue(label).setFontWeight('bold');
      i = headers.length - 1;
    }
    return i;
  };

  const iGroup = idx('Group');
  const iAccount = idx('Account');
  const iMask = ensureCol('Account Mask');
  const iAcctId = ensureCol('Plaid Account ID');
  const iItemKey = ensureCol('Item Key');

  if (iGroup === -1 || iAccount === -1) {
    SpreadsheetApp.getUi().alert("Transactions missing required columns 'Group' and/or 'Account'.");
    return;
  }

  // Build lookup from Plaid accounts by token (group)
  const tokens = getAccessTokens_();
  if (!tokens.length) { SpreadsheetApp.getUi().alert('No access tokens found.'); return; }

  // Map: key = group||official_name -> {mask, account_id, item_key}
  const map = new Map();
  tokens.forEach(([accessToken, group]) => {
    const itemKey = tokenHashKey_(accessToken);
    const resp = makePlaidRequest_('/accounts/get', { access_token: accessToken });
    if (!resp.success) {
      Logger.log(`[enrichCardIdentifiers] accounts/get failed for group ${group}: ${resp.error}`);
      return;
    }
    const accounts = resp.data.accounts || [];
    accounts.forEach(a => {
      const official = a.official_name || '';
      const displayName = a.name || '';
      const mask = a.mask || '';
      const entry = { mask, account_id: a.account_id, item_key: itemKey };
      // Index by official_name if present
      if (official) {
        const keyOfficial = `${group}||${official}`.trim();
        if (!map.has(keyOfficial)) map.set(keyOfficial, entry);
      }
      // Also index by name to cover institutions that omit official_name (e.g., some Chase accounts)
      if (displayName) {
        const keyName = `${group}||${displayName}`.trim();
        if (!map.has(keyName)) map.set(keyName, entry);
      }
    });
  });

  // Enrich rows with missing values
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  let updated = 0;
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const group = String(row[iGroup] || '').trim();
    const account = String(row[iAccount] || '').trim();
    const hasMask = String(row[iMask] || '').trim() !== '';
    const hasAcctId = String(row[iAcctId] || '').trim() !== '';
    const hasItemKey = String(row[iItemKey] || '').trim() !== '';
    if (hasMask && hasAcctId && hasItemKey) continue;

    const key = `${group}||${account}`;
    let entry = map.get(key);
    // If not found and account ends with mask pattern like "...1234", try stripping mask part
    if (!entry) {
      const noMask = account.replace(/\s*\(\d{2,4}\)$/, '').trim();
      if (noMask && noMask !== account) entry = map.get(`${group}||${noMask}`);
    }
    if (entry) {
      row[iMask] = row[iMask] || entry.mask || '';
      row[iAcctId] = row[iAcctId] || entry.account_id || '';
      row[iItemKey] = row[iItemKey] || entry.item_key || '';
      updated++;
    }
    data[r] = row;
  }

  if (updated > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  }
  SpreadsheetApp.getUi().alert(`Enrichment complete. Updated ${updated} row(s).`);
}

// =========================
// Benefits Summary (per rule, current period)
// =========================
function buildBenefitsSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!tx) { SpreadsheetApp.getUi().alert(`Sheet '${TRANSACTIONS_SHEET}' not found.`); return; }

  // Read Transactions headers and rows
  const lastRow = tx.getLastRow();
  const lastCol = tx.getLastColumn();
  if (lastRow <= 1) { SpreadsheetApp.getUi().alert('No transactions found.'); return; }
  const headers = tx.getRange(1,1,1,lastCol).getValues()[0].map(h=>String(h||'').trim());
  const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iGroup = idx('Group');
  const iAccount = idx('Account');
  const iVendor = idx('Vendor');
  const iName = idx('Name');
  const iAmount = idx('Amount');
  const iDate = idx('Date');
  const iMask = idx('Account Mask');
  const iPlaidAccountId = idx('Plaid Account ID');
  const iItemKey = idx('Item Key');
  if (iAccount===-1 || iAmount===-1 || iDate===-1) { SpreadsheetApp.getUi().alert('Transactions missing Account/Amount/Date columns.'); return; }

  const rows = tx.getRange(2,1,lastRow-1,lastCol).getValues();

  // Read rules
  const rules = readCardBenefits_();
  if (!rules.length) { SpreadsheetApp.getUi().alert("No rules found in 'Card Benefits'."); return; }

  // Build summary rows
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const paymentRegex = /(payment|bill\s*pay|thank\s*you|electronic\s*payment|payment\s*received|payment\s*recv'?d)/i;

  const summary = [];
  rules.forEach(rule => {
    const period = computeCurrentPeriodWindow_(rule.timing, now, tz);
    const start = period.start; const end = period.end;
    // Aggregate used per unique card instance: Card Name + Item Key + Plaid Account ID
    const instanceMap = new Map(); // key -> {used, mask, group}
    for (let r=0; r<rows.length; r++) {
      const group = iGroup !== -1 ? String(rows[r][iGroup]||'').trim() : '';
      const account = String(rows[r][iAccount]||'').trim();
      if (account !== rule.card) continue;
      const vendor = String(rows[r][iVendor]||'').trim();
      const name = String(rows[r][iName]||'').trim();
      const amt = Number(rows[r][iAmount]);
      const dateVal = rows[r][iDate];
      const mask = iMask !== -1 ? String(rows[r][iMask]||'').trim() : '';
      const acctId = iPlaidAccountId !== -1 ? String(rows[r][iPlaidAccountId]||'').trim() : '';
      const itemKey = iItemKey !== -1 ? String(rows[r][iItemKey]||'').trim() : '';
      const text = `${vendor} ${name}`;
      if (isNaN(amt) || amt >= 0) continue; // only credits
      if (paymentRegex.test(text)) continue; // skip payments

      const d = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
      if (!(d >= start && d <= end)) continue; // in window
      if (!rule.keywordLower || !text.toLowerCase().includes(rule.keywordLower)) continue; // keyword

      const key = `${rule.card}||${itemKey}||${acctId}`;
      const rec = instanceMap.get(key) || { used: 0, mask, group };
      rec.used += Math.abs(amt);
      if (!rec.mask && mask) rec.mask = mask;
      if (!rec.group && group) rec.group = group;
      instanceMap.set(key, rec);
    }

    const max = rule.maxAmount != null ? rule.maxAmount : null;
    if (instanceMap.size === 0) {
      summary.push([
        '', // Account Group
        rule.card,
        '', // Mask
        (rule.benefit || (rule.keywords && rule.keywords.join(', ')) || ''),
        rule.timing || '',
        Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
        Utilities.formatDate(end, tz, 'yyyy-MM-dd'),
        max != null ? max : '', 0, max != null ? max : ''
      ]);
    } else {
      for (const [key, rec] of instanceMap.entries()) {
        const remaining = max != null ? Math.max(0, max - rec.used) : '';
        summary.push([
          rec.group || '',
          rule.card,
          rec.mask || '',
          (rule.benefit || (rule.keywords && rule.keywords.join(', ')) || ''),
          rule.timing || '',
          Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
          Utilities.formatDate(end, tz, 'yyyy-MM-dd'),
          max != null ? max : '',
          rec.used,
          remaining
        ]);
      }
    }
  });

  // Write to Benefits Summary sheet
  const name = 'Benefits Summary';
  let out = ss.getSheetByName(name);
  if (!out) out = ss.insertSheet(name);
  out.clearContents();
  const outHeaders = ['Account Group','Card Name','Account Mask','Benefit','Timing','Period Start','Period End','Max Amount','Used Amount','Remaining Amount'];
  out.getRange(1,1,1,outHeaders.length).setValues([outHeaders]).setFontWeight('bold');
  if (summary.length) out.getRange(2,1,summary.length,outHeaders.length).setValues(summary);
  out.autoResizeColumns(1, outHeaders.length);
  SpreadsheetApp.getUi().alert(`Benefits Summary built for ${summary.length} rule(s).`);
}

function computeCurrentPeriodWindow_(timing, now, tz) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
  const lower = (timing||'').toLowerCase();
  if (lower === 'monthly') {
    return { start: startOfMonth, end: endOfMonth };
  }
  if (lower === 'quarterly') {
    const q = Math.floor(month/3); // 0,1,2,3
    const qStartMonth = q*3;
    const start = new Date(year, qStartMonth, 1);
    const end = new Date(year, qStartMonth + 3, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (lower === 'semiannually' || lower === 'semi-annually' || lower === 'semi annual' || lower === 'semi annualy') {
    const h = (month < 6) ? 0 : 6;
    const start = new Date(year, h, 1);
    const end = new Date(year, h + 6, 0, 23, 59, 59, 999);
    return { start, end };
  }
  if (lower === 'annually' || lower === 'annual' || lower === 'yearly') {
    return { start: startOfYear, end: endOfYear };
  }
  // Default to monthly if unspecified
  return { start: startOfMonth, end: endOfMonth };
}

// =========================
// Card Promo Rules sheet (starter data)
// =========================
function createCardPromoRulesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Card Promo Rules';
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const headers = ['Card Name','Keyword','Max Amount','Timing'];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  // If empty or header row missing, initialize
  if (lastRow === 0 || (lastRow === 1 && (sheet.getRange(1,1,1, lastCol || headers.length).getValues()[0].join('') === ''))) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  } else {
    // Ensure headers exist in row 1
    sheet.clearContents();
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  }

  // Only seed starter rows if there is no data beyond header
  const starters = [
    // Business Platinum Card®
    ['Business Platinum Card®','Airline Fee Reimbursement','', 'Annually'],
    ['Business Platinum Card®','Wireless Credit','10','Monthly'],
    // Platinum Card®
    ['Platinum Card®','Airline Fee Reimbursement','200','Annually'],
    ['Platinum Card®','Resy Credit','100','Quarterly'],
    ['Platinum Card®','Lululemon Credit','75','Quarterly'],
    ['Platinum Card®','Shop Saks','50','SemiAnnually'],
    // Business Gold Card
    ['Business Gold Card','Flexible Business Credit','20','Monthly']
  ];
  sheet.getRange(2,1,starters.length, headers.length).setValues(starters);
  sheet.autoResizeColumns(1, headers.length);
  SpreadsheetApp.getUi().alert(`'${name}' sheet is ready. Review and edit if needed.`);
}

// =========================
// Support Snapshot (Credits Only)
// =========================
function createSupportSnapshotCreditsOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Support Snapshot';
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  // Clear previous contents
  sheet.clearContents();

  const tx = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!tx) { SpreadsheetApp.getUi().alert(`Sheet '${TRANSACTIONS_SHEET}' not found.`); return; }
  const lastRow = tx.getLastRow();
  const lastCol = tx.getLastColumn();
  if (lastRow < 1 || lastCol < 1) { SpreadsheetApp.getUi().alert('Transactions sheet is empty.'); return; }

  // Read headers to find Amount column
  const headers = tx.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const amountIdx = headers.findIndex(h => h.toLowerCase() === 'amount');
  if (amountIdx === -1) { SpreadsheetApp.getUi().alert("Couldn't find 'Amount' column in Transactions."); return; }

  // Read all data rows
  const rows = lastRow > 1 ? tx.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

  // Filter credits: Amount < 0
  const credits = rows.filter(r => {
    const val = Number(r[amountIdx]);
    return !isNaN(val) && val < 0;
  });

  // Write snapshot: header + filtered rows
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (credits.length) {
    sheet.getRange(2, 1, credits.length, headers.length).setValues(credits);
  }
  sheet.autoResizeColumns(1, headers.length);
  SpreadsheetApp.getUi().alert(`Support Snapshot created with ${credits.length} credit transaction(s).`);
}

// =========================
// Transaction Flagging (Credit Card Promo)
// =========================
function flagTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tx = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!tx) { SpreadsheetApp.getUi().alert(`Sheet '${TRANSACTIONS_SHEET}' not found.`); return; }

  // Ensure columns
  const { headers, iAccount, iVendor, iName, iAmount, iPromo, iNotes } = ensurePromoFlagColumns_(tx);
  if (iAccount === -1 || iAmount === -1) { SpreadsheetApp.getUi().alert('Missing required columns (Account/Amount).'); return; }

  // Load rules
  const rules = readCardBenefits_();
  // Group rules by exact card name
  const byCard = new Map();
  rules.forEach(r => {
    const key = (r.card || '').trim();
    if (!key) return;
    if (!byCard.has(key)) byCard.set(key, []);
    byCard.get(key).push(r);
  });

  const lastRow = tx.getLastRow();
  const lastCol = tx.getLastColumn();
  if (lastRow <= 1) { SpreadsheetApp.getUi().alert('No transactions to flag.'); return; }
  const range = tx.getRange(2, 1, lastRow - 1, lastCol);
  const rows = range.getValues();

  const setPromoCol = iPromo + 1;
  const setNotesCol = iNotes + 1;

  // Compile payment-skip regex
  const paymentRegex = /(payment|bill\s*pay|thank\s*you|electronic\s*payment|payment\s*received|payment\s*recv'?d)/i;

  // Iterate and flag
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const account = String(row[iAccount] || '').trim();
    const vendor = String(row[iVendor] || '').trim();
    const name = String(row[iName] || '').trim();
    const amountNum = Number(row[iAmount]);
    const absAmt = Math.abs(amountNum);

    let isPromo = false;
    let note = '';

    // Only consider credits
    if (!isNaN(amountNum) && amountNum < 0) {
      const text = `${vendor} ${name}`;
      // Skip obvious payments
      if (!paymentRegex.test(text)) {
        const cardRules = byCard.get(account) || [];
        outerRule: for (let i = 0; i < cardRules.length; i++) {
          const rule = cardRules[i];
          // Match any keyword from the list (already lowercase)
          const kws = rule.keywordsLower && rule.keywordsLower.length ? rule.keywordsLower : (rule.keywordLower?[rule.keywordLower]:[]);
          for (let k = 0; k < kws.length; k++) {
            if (kws[k] && text.toLowerCase().includes(kws[k])) {
              if (rule.maxAmount == null || absAmt <= rule.maxAmount + 1e-6) {
                isPromo = true;
                const kwShown = rule.keywords && rule.keywords.length ? rule.keywords.join(', ') : (rule.keyword||'');
                note = `Promo: ${rule.card} | ${rule.benefit || kwShown}${rule.maxAmount!=null?` <= ${rule.maxAmount}`:''}${rule.timing?` | ${rule.timing}`:''}`;
                break outerRule;
              }
            }
          }
        }
      }
    }

    tx.getRange(r + 2, setPromoCol).setValue(isPromo);
    tx.getRange(r + 2, setNotesCol).setValue(note);
  }

  SpreadsheetApp.getUi().alert('Flagging complete.');
}

function readCardBenefits_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Prefer new 'Card Benefits' sheet
  let sheet = ss.getSheetByName('Card Benefits');
  if (sheet) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol < 1) return [];
    const headers = sheet.getRange(1,1,1,lastCol).getValues()[0].map(h=>String(h||'').trim().toLowerCase());
    const idx = (name) => headers.indexOf(name.toLowerCase());
    const iIssuer = idx('issuer');
    const iProduct = idx('product name');
    const iBenefit = idx('benefit');
    const iTiming = idx('timing');
    const iMax = idx('max amount');
    const iKeywords = idx('keywords');
    const iActive = idx('active?');
    const data = sheet.getRange(2,1,lastRow-1,lastCol).getValues();
    const out = [];
    data.forEach(r => {
      const active = (String(r[iActive]||'').trim().toLowerCase() !== 'n');
      if (!active) return;
      const card = String(r[iProduct]||'').trim();
      const benefit = String(r[iBenefit]||'').trim();
      const timing = String(r[iTiming]||'').trim();
      const maxAmountStr = String(r[iMax]||'').trim();
      const maxAmount = maxAmountStr ? Number(maxAmountStr) : null;
      const kws = String(r[iKeywords]||'').split(',').map(s=>s.trim()).filter(Boolean);
      if (card && (benefit || kws.length)) {
        out.push({
          card,
          benefit,
          timing,
          maxAmount,
          keywords: kws,
          keywordsLower: kws.map(k=>k.toLowerCase())
        });
      }
    });
    return out;
  }
  // Fallback: old 'Card Promo Rules' sheet
  sheet = ss.getSheetByName('Card Promo Rules');
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, Math.max(4, lastCol)).getValues();
  const out = [];
  data.forEach(r => {
    const card = String(r[0] || '').trim();
    const keyword = String(r[1] || '').trim();
    const maxAmountStr = String(r[2] || '').trim();
    const timing = String(r[3] || '').trim();
    const maxAmount = maxAmountStr ? Number(maxAmountStr) : null;
    if (card && keyword) {
      out.push({ card, benefit: keyword, timing, maxAmount, keywords: [keyword], keywordsLower: [keyword.toLowerCase()], keyword, keywordLower: keyword.toLowerCase() });
    }
  });
  return out;
}

function ensurePromoFlagColumns_(sheet) {
  const lastCol = sheet.getLastColumn() || 1;
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const need = ['Group','Date','Vendor','Amount','Account','Credit Card Promo?','Flag Notes','Name'];
  // Ensure required base columns exist in headers; we won’t reorder but we need indices
  function idx(name) { return headers.findIndex(h => h.toLowerCase() === name.toLowerCase()); }
  let iAccount = idx('Account');
  let iVendor = idx('Vendor');
  let iName = idx('Name');
  let iAmount = idx('Amount');
  let iPromo = idx('Credit Card Promo?');
  let iNotes = idx('Flag Notes');

  // Add missing flag columns at the end
  if (iPromo === -1) {
    sheet.insertColumnAfter(headers.length);
    headers.push('Credit Card Promo?');
    sheet.getRange(1, headers.length).setValue('Credit Card Promo?').setFontWeight('bold');
    iPromo = headers.length - 1;
  }
  if (iNotes === -1) {
    sheet.insertColumnAfter(headers.length);
    headers.push('Flag Notes');
    sheet.getRange(1, headers.length).setValue('Flag Notes').setFontWeight('bold');
    iNotes = headers.length - 1;
  }

  return { headers, iAccount, iVendor, iName, iAmount, iPromo, iNotes };
}

// =========================
// Backfill Watchdog & Heartbeat
// =========================
function heartbeatBackfill_() {
  SCRIPT_PROPERTIES.setProperty('backfill_last_heartbeat', String(Date.now()));
  updateBackfillHeaderStatus_();
}

function ensureBackfillWatchdog_() {
  // Create a 5-min watchdog that restarts resumeBackfill24m if heartbeat stale
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction && t.getHandlerFunction() === 'backfillWatchdogTick_');
  if (!exists) {
    ScriptApp.newTrigger('backfillWatchdogTick_').timeBased().everyMinutes(5).create();
  }
}

function backfillWatchdogTick_() {
  const ti = SCRIPT_PROPERTIES.getProperty('backfill_token_index');
  const mi = SCRIPT_PROPERTIES.getProperty('backfill_month_index');
  if (ti == null || mi == null) return; // nothing to do
  const last = parseInt(SCRIPT_PROPERTIES.getProperty('backfill_last_heartbeat') || '0', 10);
  const ageMs = Date.now() - last;
  // If older than 10 minutes, restart resumeBackfill24m
  if (ageMs > 10 * 60 * 1000) {
    updateBackfillStatus_('Watchdog: heartbeat stale, rescheduling backfill.');
    clearExistingTriggers_('resumeBackfill24m');
    scheduleOnce_('resumeBackfill24m', 0);
  }
}

function updateBackfillHeaderStatus_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const name = 'Backfill Status';
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    const ti = parseInt(SCRIPT_PROPERTIES.getProperty('backfill_token_index') || '-1', 10);
    const mi = parseInt(SCRIPT_PROPERTIES.getProperty('backfill_month_index') || '-1', 10);
    const total = SCRIPT_PROPERTIES.getProperty('backfill_total_tokens') || '0';
    const last = SCRIPT_PROPERTIES.getProperty('backfill_last_heartbeat') || '';
    const status = (ti >= 0 && mi >= 0) ? `Running: token ${ti + 1}/${total}, month m-${mi}` : 'Idle';
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1,1,1,3).setValues([["Status","Last Heartbeat","Note"]]).setFontWeight('bold');
    }
    sheet.getRange(2,1).setValue(status);
    sheet.getRange(2,2).setValue(last ? new Date(parseInt(last,10)) : '');
  } catch (e) {
    Logger.log(`[updateBackfillHeaderStatus_] error: ${e.message}`);
  }
}

function showBackfillState() {
  const ti = SCRIPT_PROPERTIES.getProperty('backfill_token_index');
  const mi = SCRIPT_PROPERTIES.getProperty('backfill_month_index');
  const total = SCRIPT_PROPERTIES.getProperty('backfill_total_tokens');
  const last = SCRIPT_PROPERTIES.getProperty('backfill_last_heartbeat');
  SpreadsheetApp.getUi().alert(`token_index=${ti}, month_index=${mi}, total_tokens=${total}, last_heartbeat=${last ? new Date(parseInt(last,10)).toISOString() : 'n/a'}`);
}

function resetBackfillState() {
  ['backfill_token_index','backfill_month_index','backfill_total_tokens','backfill_last_heartbeat'].forEach(k => SCRIPT_PROPERTIES.deleteProperty(k));
  clearExistingTriggers_('resumeBackfill24m');
  clearExistingTriggers_('backfillWatchdogTick_');
  updateBackfillStatus_('Backfill state reset.');
}

// =========================
// Backfill Status Utilities
// =========================
function updateBackfillStatus_(message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const name = 'Backfill Status';
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1,1,1,2).setValues([["Timestamp","Message"]]).setFontWeight('bold');
    }
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([ts, String(message)]);
  } catch (e) {
    Logger.log(`[updateBackfillStatus_] error: ${e.message}`);
  }
}

function clearBackfillStatus_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const name = 'Backfill Status';
    let sheet = ss.getSheetByName(name);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn() || 2;
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      }
      // Ensure header exists
      if (lastRow === 0) {
        sheet.getRange(1,1,1,2).setValues([["Timestamp","Message"]]).setFontWeight('bold');
      }
    }
  } catch (e) {
    Logger.log(`[clearBackfillStatus_] error: ${e.message}`);
  }
}

function setCursorNowForAllTokens() {
  const tokens = getAccessTokens_();
  if (!tokens.length) { SpreadsheetApp.getUi().alert('No access tokens found.'); return; }
  let setCount = 0;
  let failed = 0;
  tokens.forEach(([tok]) => {
    const payload = { access_token: tok, cursor: 'now', count: 1 };
    const resp = makePlaidRequest_('/transactions/sync', payload);
    if (resp.success && resp.data && resp.data.next_cursor) {
      const tokenKey = tokenHashKey_(tok);
      setCursorForToken_(tokenKey, resp.data.next_cursor);
      setCount++;
    } else {
      failed++;
      Logger.log(`[setCursorNowForAllTokens] failed for token ending ...${String(tok).slice(-4)}: ${resp.error || 'unknown error'}`);
    }
  });
  SpreadsheetApp.getUi().alert(`Set NOW cursor for ${setCount} token(s). Failures: ${failed}.`);
}

/**
 * Clears the Transactions sheet data rows while keeping the header row.
 */
function clearTransactionsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet '${TRANSACTIONS_SHEET}' not found.`);
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('No data rows to clear.');
    return;
  }
  // Clear everything below the header
  sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  Logger.log(`[clearTransactionsData] Cleared ${lastRow - 1} data row(s).`);
  SpreadsheetApp.getUi().alert(`Cleared ${lastRow - 1} data row(s) on '${TRANSACTIONS_SHEET}'.`);
}

// =========================
// Per-Item Cursor Controls (Selection-based)
// =========================

function getSelectedAccessTokens_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (!sheet || sheet.getName() !== ACCESS_TOKEN_SHEET) {
    SpreadsheetApp.getUi().alert(`Select row(s) on the '${ACCESS_TOKEN_SHEET}' sheet first.`);
    return [];
  }
  const sel = sheet.getActiveRange();
  if (!sel) return [];
  const startRow = sel.getRow();
  const numRows = sel.getNumRows();
  const tokens = [];
  for (let r = 0; r < numRows; r++) {
    const rowIndex = startRow + r;
    if (rowIndex === 1) continue; // skip header
    const token = sheet.getRange(rowIndex, 1).getValue();
    if (token) tokens.push(String(token));
  }
  return tokens;
}

function resetCursorForSelectedTokens() {
  const tokens = getSelectedAccessTokens_();
  if (!tokens.length) return;
  let count = 0;
  tokens.forEach(tok => {
    const key = `plaid_cursor_${tokenHashKey_(tok)}`;
    if (SCRIPT_PROPERTIES.getProperty(key)) {
      SCRIPT_PROPERTIES.deleteProperty(key);
      count++;
    }
  });
  Logger.log(`[resetCursorForSelectedTokens] deleted ${count} cursor(s) out of ${tokens.length} selected`);
  SpreadsheetApp.getUi().alert(`Deleted ${count} cursor(s) for ${tokens.length} selected token(s).`);
}

function setCursorNowForSelectedTokens() {
  const tokens = getSelectedAccessTokens_();
  if (!tokens.length) return;
  let setCount = 0;
  let failed = 0;
  tokens.forEach(tok => {
    const payload = { access_token: tok, cursor: 'now', count: 1 };
    const resp = makePlaidRequest_('/transactions/sync', payload);
    if (resp.success && resp.data && resp.data.next_cursor) {
      const tokenKey = tokenHashKey_(tok);
      setCursorForToken_(tokenKey, resp.data.next_cursor);
      setCount++;
    } else {
      failed++;
      Logger.log(`[setCursorNowForSelectedTokens] failed for token ending ...${tok.slice(-4)}: ${resp.error || 'unknown error'}`);
    }
  });
  SpreadsheetApp.getUi().alert(`Set NOW cursor for ${setCount} token(s). Failures: ${failed}.`);
}

/**
 * Clears all Plaid transactions sync cursors so the next sync re-initializes.
 */
function resetAllPlaidCursors() {
  const props = SCRIPT_PROPERTIES.getProperties() || {};
  const keys = Object.keys(props);
  let count = 0;
  keys.forEach(k => {
    if (k.indexOf('plaid_cursor_') === 0) {
      SCRIPT_PROPERTIES.deleteProperty(k);
      count++;
    }
  });
  Logger.log(`[resetAllPlaidCursors] existing keys: ${JSON.stringify(keys)}`);
  Logger.log(`[resetAllPlaidCursors] deleted ${count} cursor(s)`);
  SpreadsheetApp.getUi().alert(`Reset ${count} Plaid sync cursor(s). Next sync will reinitialize.`);
}

// =========================
// Vendors Sheet Workflow
// =========================

function getOrCreateVendorsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(VENDORS_SHEET);
  if (!sheet) sheet = ss.insertSheet(VENDORS_SHEET);

  const months = 24;
  const headers = ['Vendor', 'Normalized Vendor', 'Vendor Category'];
  for (let i = 0; i < months; i++) headers.push(i === 0 ? 'M0' : `M-${i}`);
  headers.push('T3M', 'T12M', 'All-Time', 'Last Updated', 'Notes');

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  if (currentHeaders.join('') === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  } else {
    // Ensure required headers exist; if not, reset sheet to standard headers.
    // Simple approach: if first 3 headers mismatch, clear and rewrite.
    const first3 = currentHeaders.slice(0, 3).map(h => String(h || '').trim());
    if (first3[0] !== 'Vendor' || first3[1] !== 'Normalized Vendor' || first3[2] !== 'Vendor Category') {
      sheet.clearContents();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    } else {
      // Add any missing month columns
      const existing = currentHeaders.map(h => String(h || '').trim());
      let lastCol = existing.length;
      for (let i = 0; i < months; i++) {
        const label = i === 0 ? 'M0' : `M-${i}`;
        if (!existing.includes(label)) {
          sheet.insertColumnAfter(lastCol);
          lastCol++;
          sheet.getRange(1, lastCol).setValue(label).setFontWeight('bold');
        }
      }
      const trailing = ['T3M','T12M','All-Time','Last Updated','Notes'];
      trailing.forEach(lbl => {
        if (!existing.includes(lbl)) {
          sheet.insertColumnAfter(lastCol);
          lastCol++;
          sheet.getRange(1, lastCol).setValue(lbl).setFontWeight('bold');
        }
      });
    }
  }
  return sheet;
}

function normalizeVendor_(name) {
  if (!name) return '';
  let s = String(name).toLowerCase();
  s = s.replace(/[\u{1F300}-\u{1FAFF}]/gu, ''); // remove emojis
  s = s.replace(/[^a-z0-9\-\s]/g, ''); // keep alnum, dash, space
  s = s.replace(/\b(llc|inc|co|corp|ltd|llp|plc)\b/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function rebuildVendorsFromTransactions() {
  const vSheet = getOrCreateVendorsSheet_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tSheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!tSheet) return;

  const lastRow = tSheet.getLastRow();
  if (lastRow < 2) return;
  const vendorCol = 3; // Vendor column in Transactions
  const vendors = tSheet.getRange(2, vendorCol, lastRow - 1, 1).getValues().map(r => r[0]).filter(Boolean);
  const uniqueNormalized = new Set(vendors.map(v => normalizeVendor_(v)).filter(Boolean));

  // Build existing normalized set from Vendors
  const vLast = vSheet.getLastRow();
  const existing = new Set();
  if (vLast >= 2) {
    const normCol = 2;
    const current = vSheet.getRange(2, normCol, vLast - 1, 1).getValues();
    current.forEach(r => { if (r[0]) existing.add(String(r[0]).trim()); });
  }

  const toAppend = [];
  uniqueNormalized.forEach(nv => {
    if (!existing.has(nv)) {
      // Store original vendor example for visibility (first occurrence)
      const orig = vendors.find(v => normalizeVendor_(v) === nv) || nv;
      toAppend.push([orig, nv, '']);
    }
  });

  if (toAppend.length) {
    vSheet.getRange(vSheet.getLastRow() + 1, 1, toAppend.length, 3).setValues(toAppend);
  }
}

function buildVendorSpend() {
  updateVendorSpends_(24);
}

function updateVendorSpends_(months) {
  const vSheet = getOrCreateVendorsSheet_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tSheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!tSheet) return;

  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build a map: normalizedVendor -> { monthIndex -> sum, allTime }
  const lastRow = tSheet.getLastRow();
  if (lastRow < 2) return;
  const rng = tSheet.getRange(2, 1, lastRow - 1, tSheet.getLastColumn()).getValues();
  // Transactions cols per earlier: [Group, Date, Vendor, Amount, Category, Improved Category, Account, Payment Channel, Is Recurring?]
  const COL_DATE = 2, COL_VENDOR = 3, COL_AMOUNT = 4;
  const accum = new Map();
  for (const row of rng) {
    const date = row[COL_DATE - 1];
    const vendor = row[COL_VENDOR - 1];
    const amount = Number(row[COL_AMOUNT - 1]) || 0;
    if (!vendor || !date) continue;
    const nv = normalizeVendor_(vendor);
    if (!nv) continue;
    const d = new Date(date);
    const idx = monthDiff_(startOfMonth, new Date(d.getFullYear(), d.getMonth(), 1)); // negative/backward
    const monthIdx = -idx; // M0 = 0, M-1 = 1 ...
    if (monthIdx < 0 || monthIdx >= months) continue;
    if (!accum.has(nv)) accum.set(nv, { buckets: Array(months).fill(0), all: 0 });
    const a = accum.get(nv);
    a.buckets[monthIdx] += amount; // net spend
    a.all += amount;
  }

  // Write into Vendors rows
  const vLast = vSheet.getLastRow();
  if (vLast < 2) return;
  const rows = vSheet.getRange(2, 1, vLast - 1, vSheet.getLastColumn()).getValues();
  // Locate columns
  const headers = vSheet.getRange(1, 1, 1, vSheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim());
  const idxOf = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const colNorm = idxOf('Normalized Vendor');
  const colT3M = idxOf('T3M');
  const colT12M = idxOf('T12M');
  const colAll = idxOf('All-Time');
  const colLastUpdated = idxOf('Last Updated');
  // Month columns positions
  const monthCols = [];
  for (let i = 0; i < months; i++) {
    const label = i === 0 ? 'M0' : `M-${i}`;
    monthCols.push(idxOf(label));
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const nv = String(row[colNorm]).trim();
    const a = accum.get(nv);
    if (!a) {
      // Clear months to 0 if desired; we leave as-is to retain prior values if no data in window.
      continue;
    }
    for (let i = 0; i < months; i++) {
      const c = monthCols[i];
      if (c >= 0) row[c] = a.buckets[i] || 0;
    }
    // trailing totals
    const t3 = a.buckets.slice(0, 3).reduce((s, v) => s + v, 0);
    const t12 = a.buckets.slice(0, 12).reduce((s, v) => s + v, 0);
    if (colT3M >= 0) row[colT3M] = t3;
    if (colT12M >= 0) row[colT12M] = t12;
    if (colAll >= 0) row[colAll] = a.all;
    if (colLastUpdated >= 0) row[colLastUpdated] = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
    rows[r] = row;
  }

  vSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  // Sort by M0 desc if present (data rows only)
  const colM0 = idxOf('M0');
  const dataRowCount = vSheet.getLastRow() - 1;
  if (colM0 >= 0 && dataRowCount > 0) {
    const dataRange = vSheet.getRange(2, 1, dataRowCount, vSheet.getLastColumn());
    dataRange.sort([{ column: colM0 + 1, ascending: false }]);
  }
}

function monthDiff_(startMonthDate, otherMonthDate) {
  // Returns (other - start) in months; if other is before start, negative
  return (otherMonthDate.getFullYear() - startMonthDate.getFullYear()) * 12 + (otherMonthDate.getMonth() - startMonthDate.getMonth());
}

function getVendorCategoryMap_() {
  const sheet = getOrCreateVendorsSheet_();
  const last = sheet.getLastRow();
  const map = new Map();
  if (last < 2) return map;
  const vals = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim());
  const iNorm = headers.findIndex(h => h.toLowerCase() === 'normalized vendor');
  const iCat = headers.findIndex(h => h.toLowerCase() === 'vendor category');
  vals.forEach(r => {
    const nv = String(r[iNorm] || '').trim();
    const cat = String(r[iCat] || '').trim();
    if (nv) map.set(nv, cat || '');
  });
  return map;
}

function lookupVendorCategory_(vendorName) {
  const nv = normalizeVendor_(vendorName);
  if (!nv) return '';
  const map = getVendorCategoryMap_();
  return map.get(nv) || '';
}

function applyVendorCategoriesToTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tSheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!tSheet) return;
  const last = tSheet.getLastRow();
  if (last < 2) return;
  const headers = tSheet.getRange(1, 1, 1, tSheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim());
  const iVendor = headers.findIndex(h => h.toLowerCase() === 'vendor');
  const iImproved = headers.findIndex(h => h.toLowerCase() === 'improved category');
  if (iVendor < 0 || iImproved < 0) return;
  const rng = tSheet.getRange(2, 1, last - 1, tSheet.getLastColumn());
  const vals = rng.getValues();
  const map = getVendorCategoryMap_();
  let updates = 0;
  for (let r = 0; r < vals.length; r++) {
    const row = vals[r];
    if (!row[iImproved]) {
      const nv = normalizeVendor_(row[iVendor]);
      const cat = map.get(nv) || '';
      if (cat) { row[iImproved] = cat; updates++; }
      vals[r] = row;
    }
  }
  if (updates) rng.setValues(vals);
  Logger.log(`[applyVendorCategoriesToTransactions] updated ${updates} rows`);
}

// Vendor AI categorization (20 at a time)
function resetVendorCursor() {
  SCRIPT_PROPERTIES.setProperty('vendor_ai_cursor_row', '2');
  SpreadsheetApp.getUi().alert('Vendor AI cursor reset to row 2.');
}

function improveVendorsBatch() {
  const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
  if (!apiKey) {
    SpreadsheetApp.getUi().alert("Missing Script Property 'GEMINI_KEY'. Set it in Project Settings → Script Properties.");
    return;
  }
  const sheet = getOrCreateVendorsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) { SpreadsheetApp.getUi().alert('No vendors to process.'); return; }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim());
  const iVendor = headers.findIndex(h => h.toLowerCase() === 'vendor');
  const iNorm = headers.findIndex(h => h.toLowerCase() === 'normalized vendor');
  const iCat = headers.findIndex(h => h.toLowerCase() === 'vendor category');
  const iLast = headers.findIndex(h => h.toLowerCase() === 'last updated');

  let start = parseInt(SCRIPT_PROPERTIES.getProperty('vendor_ai_cursor_row') || '2', 10);
  if (start < 2) start = 2;
  if (start > last) start = 2;
  const batch = 20;
  const end = Math.min(last, start + batch - 1);
  const rng = sheet.getRange(start, 1, end - start + 1, sheet.getLastColumn());
  const vals = rng.getValues();
  const tz = Session.getScriptTimeZone();
  let updates = 0;
  for (let i = 0; i < vals.length; i++) {
    const row = vals[i];
    const current = String(row[iCat] || '').trim();
    if (!current) {
      const vendor = row[iVendor] || row[iNorm] || '';
      const ai = aiCategorize_(vendor, vendor, 0, Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'));
      if (ai) {
        row[iCat] = ai;
        if (iLast >= 0) row[iLast] = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
        vals[i] = row;
        updates++;
      }
    }
  }
  if (updates) rng.setValues(vals);
  SCRIPT_PROPERTIES.setProperty('vendor_ai_cursor_row', String(end + 1));
  SpreadsheetApp.getUi().alert(`Vendors categorized: ${updates} (rows ${start}-${end}). Next start: ${end + 1 > last ? 2 : end + 1}`);
}

/**
 * Resets the persistent cursor used by improveCategoriesBatch() back to row 2.
 */
function resetImproveCategoryCursor() {
  const cursorKey = 'improve_cat_cursor_row';
  SCRIPT_PROPERTIES.setProperty(cursorKey, '2');
  Logger.log('[resetImproveCategoryCursor] cursor set to 2');
  SpreadsheetApp.getUi().alert('Improved Category cursor reset to row 2.');
}

// =========================
// Resumable 24-Month Backfill
// =========================

function startBackfill24mResumable() {
  // Initialize cursors and schedule first run
  const tokens = getAccessTokens_();
  const total = tokens.length;
  SCRIPT_PROPERTIES.setProperty('backfill_token_index', '0');
  SCRIPT_PROPERTIES.setProperty('backfill_month_index', '0'); // 0=M0, 23=M-23
  SCRIPT_PROPERTIES.setProperty('backfill_total_tokens', String(total));
  clearExistingTriggers_('resumeBackfill24m');
  scheduleOnce_('resumeBackfill24m', 0);
  const ui = SpreadsheetApp.getUi();
  ui.alert(`Resumable 24-month backfill started for ${total} token(s). It will run in chunks until complete.`);
  SpreadsheetApp.getActive().toast(`Backfill started (0 of ${total}).`, 'Backfill', 5);
  clearBackfillStatus_();
  updateBackfillStatus_(`Started backfill for ${total} token(s).`);
  ensureBackfillWatchdog_();
}

function cancelBackfill24m() {
  clearExistingTriggers_('resumeBackfill24m');
  SCRIPT_PROPERTIES.deleteProperty('backfill_token_index');
  SCRIPT_PROPERTIES.deleteProperty('backfill_month_index');
  SCRIPT_PROPERTIES.deleteProperty('backfill_total_tokens');
  SpreadsheetApp.getUi().alert('Resumable 24-month backfill canceled.');
  updateBackfillStatus_('Backfill canceled.');
  clearExistingTriggers_('backfillWatchdogTick_');
}

function resumeBackfill24m() {
  const start = Date.now();
  const TIME_BUDGET_MS = 4.5 * 60 * 1000; // ~4.5 minutes to leave headroom

  const tokens = getAccessTokens_();
  if (!tokens.length) return;

  let ti = parseInt(SCRIPT_PROPERTIES.getProperty('backfill_token_index') || '0', 10);
  let mi = parseInt(SCRIPT_PROPERTIES.getProperty('backfill_month_index') || '0', 10);
  const totalTokens = parseInt(SCRIPT_PROPERTIES.getProperty('backfill_total_tokens') || String(tokens.length), 10);
  if (ti < 0) ti = 0; if (mi < 0) mi = 0;

  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  heartbeatBackfill_();

  outer: for (; ti < tokens.length; ti++) {
    const [accessToken, accountGroupName] = tokens[ti];
    const itemKeyForToken = tokenHashKey_(accessToken);
    const label = accountGroupName || `...${String(accessToken).slice(-4)}`;
    SpreadsheetApp.getActive().toast(`Working on ${label} (${ti + 1} of ${totalTokens})`, 'Backfill', 5);
    updateBackfillStatus_(`Token ${ti + 1}/${totalTokens}: ${label}`);
    for (; mi < 24; mi++) {
      const startMonth = new Date(startOfThisMonth.getFullYear(), startOfThisMonth.getMonth() - mi, 1);
      const endMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 1, 0);
      const startDate = Utilities.formatDate(startMonth, tz, 'yyyy-MM-dd');
      const endDate = Utilities.formatDate(endMonth, tz, 'yyyy-MM-dd');

      SpreadsheetApp.getActive().toast(`Fetching ${label} m-${mi} ${startDate}→${endDate}`, 'Backfill', 5);
      updateBackfillStatus_(`Fetching ${label} m-${mi} ${startDate}→${endDate}`);
      const { transactions, accountsById } = fetchAllTransactionsForToken_(accessToken, startDate, endDate);

      const categoryMap = getCategoryLookupMap_();
      const all = [];
      transactions.forEach(t => {
        const acct = accountsById.get(t.account_id);
        const officialName = acct?.official_name || acct?.name || '';
        const primary = (t.personal_finance_category?.primary || t.category?.[0] || '').toString();
        const mapped = primary && categoryMap.size ? (categoryMap.get(primary) || primary) : (primary || 'Uncategorized');
        const improvedCategory = lookupVendorCategory_(t.merchant_name || t.name || '');
        all.push({
          accountGroupName,
          date: t.date,
          merchant_name: t.merchant_name,
          name: t.name,
          amount: t.amount,
          primaryFinanceCategory: mapped,
          improvedCategory,
          accountOfficialName: officialName,
          payment_channel: t.payment_channel || '',
          transaction_id: t.transaction_id,
          pending: t.pending === true,
          pending_transaction_id: t.pending_transaction_id || '',
          account_mask: acct?.mask || '',
          plaid_account_id: t.account_id,
          item_key: itemKeyForToken
        });
      });

      if (all.length) {
        // Upsert so we do not clear previously written months
        upsertTransactions_(all);
        SpreadsheetApp.getActive().toast(`Wrote ${all.length} tx for ${label} m-${mi}`, 'Backfill', 5);
        updateBackfillStatus_(`Wrote ${all.length} tx for ${label} m-${mi}`);
      }
      heartbeatBackfill_();

      // Check time budget
      if (!withinTimeBudget_(start, TIME_BUDGET_MS)) {
        SCRIPT_PROPERTIES.setProperty('backfill_token_index', String(ti));
        SCRIPT_PROPERTIES.setProperty('backfill_month_index', String(mi + 1));
        scheduleOnce_('resumeBackfill24m', 60 * 1000);
        SpreadsheetApp.getActive().toast(`Paused. Next: ${label} m-${mi + 1} (${ti + 1} of ${totalTokens})`, 'Backfill', 5);
        updateBackfillStatus_(`Paused due to time budget. Next: ${label} m-${mi + 1} (${ti + 1}/${totalTokens})`);
        return;
      }
    }
    // Finished 24 months for this token; sort Transactions by Date desc, then move to next token
    try {
      sortTransactionsByDateDesc_();
      SpreadsheetApp.getActive().toast('Sorted Transactions by Date (desc).', 'Backfill', 3);
      updateBackfillStatus_('Sorted Transactions by Date (desc).');
    } catch (e) {
      Logger.log(`[resumeBackfill24m] sort error: ${e.message}`);
    }
    mi = 0;
  }

  // Done with all tokens
  SCRIPT_PROPERTIES.deleteProperty('backfill_token_index');
  SCRIPT_PROPERTIES.deleteProperty('backfill_month_index');
  SCRIPT_PROPERTIES.deleteProperty('backfill_total_tokens');
  clearExistingTriggers_('resumeBackfill24m');
  Logger.log('[resumeBackfill24m] Completed backfill for all tokens.');
  SpreadsheetApp.getActive().toast('Backfill complete for all tokens.', 'Backfill', 5);
  updateBackfillStatus_('Backfill complete for all tokens.');
  clearExistingTriggers_('backfillWatchdogTick_');
}

function withinTimeBudget_(startMs, budgetMs) {
  return (Date.now() - startMs) < budgetMs;
}

function scheduleOnce_(fnName, delayMs) {
  if (delayMs && delayMs > 0) {
    ScriptApp.newTrigger(fnName).timeBased().after(delayMs).create();
  } else {
    ScriptApp.newTrigger(fnName).timeBased().after(1000).create();
  }
}

function clearExistingTriggers_(fnName) {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === fnName) {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// =========================
// Transactions sheet helpers
// =========================
function sortTransactionsByDateDesc_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const dateIdx = headers.findIndex(h => h.toLowerCase() === 'date');
  if (dateIdx === -1) return;
  const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  dataRange.sort([{ column: dateIdx + 1, ascending: false }]);
}

/**
 * Processes up to 20 rows of Transactions to fill 'Improved Category'.
 * Maintains a persistent row cursor across runs in Script Properties.
 */
function improveCategoriesBatch() {
  Logger.log('[improveCategoriesBatch] start');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) {
    Logger.log(`[improveCategoriesBatch] sheet ${TRANSACTIONS_SHEET} not found`);
    SpreadsheetApp.getUi().alert(`Sheet '${TRANSACTIONS_SHEET}' not found.`);
    return;
  }

  // Ensure API key is configured
  const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
  if (!apiKey) {
    Logger.log("[improveCategoriesBatch] GEMINI_KEY missing in Script Properties");
    SpreadsheetApp.getUi().alert("Missing Script Property 'GEMINI_KEY'. Set it in Project Settings → Script Properties.");
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('[improveCategoriesBatch] no data rows to process');
    SpreadsheetApp.getUi().alert('No transactions to process.');
    return;
  }

  // Determine columns from header row. Create 'Improved Category' column if missing.
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim());
  const findCol = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase()) + 1; // 1-based
  let COL_VENDOR = findCol('Vendor');
  let COL_AMOUNT = findCol('Amount');
  let COL_CATEGORY = findCol('Category');
  let COL_IMPROVED = findCol('Improved Category');
  let COL_DATE = findCol('Date');

  Logger.log(`[improveCategoriesBatch] header indexes vendor=${COL_VENDOR} amount=${COL_AMOUNT} category=${COL_CATEGORY} improved=${COL_IMPROVED} date=${COL_DATE}`);

  if (!COL_VENDOR || !COL_AMOUNT || !COL_CATEGORY || !COL_DATE) {
    Logger.log('[improveCategoriesBatch] required header missing');
    SpreadsheetApp.getUi().alert('Transactions header row is missing required columns (Vendor, Amount, Category, Date).');
    return;
  }

  // If Improved Category column is missing, insert it right after Category
  if (!COL_IMPROVED) {
    Logger.log('[improveCategoriesBatch] inserting Improved Category column');
    sheet.insertColumnAfter(COL_CATEGORY);
    COL_IMPROVED = COL_CATEGORY + 1;
    sheet.getRange(1, COL_IMPROVED).setValue('Improved Category').setFontWeight('bold');
  }

  const cursorKey = 'improve_cat_cursor_row';
  let startRow = parseInt(SCRIPT_PROPERTIES.getProperty(cursorKey) || '2', 10);
  if (startRow < 2) startRow = 2;
  if (startRow > lastRow) startRow = 2; // wrap to top when finished

  const batchSize = 20;
  const endRow = Math.min(lastRow, startRow + batchSize - 1);
  Logger.log(`[improveCategoriesBatch] processing rows ${startRow}-${endRow} of ${lastRow}`);

  const range = sheet.getRange(startRow, 1, endRow - startRow + 1, sheet.getLastColumn());
  const rows = range.getValues();

  let updates = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const improved = row[COL_IMPROVED - 1];
    const vendor = row[COL_VENDOR - 1];
    const amount = row[COL_AMOUNT - 1];
    const date = row[COL_DATE - 1];
    const name = vendor; // vendor/name are same column in our sheet

    if (!improved) {
      Logger.log(`[improveCategoriesBatch] row=${startRow + i} calling AI for vendor='${vendor}' amount='${amount}' date='${date}'`);
      const ai = aiCategorize_(vendor || '', name || '', amount || 0, date || '');
      if (ai) {
        row[COL_IMPROVED - 1] = ai;
        updates++;
        Logger.log(`[improveCategoriesBatch] row=${startRow + i} improved='${ai}'`);
      } else {
        Logger.log(`[improveCategoriesBatch] row=${startRow + i} no AI category returned`);
      }
    }
    rows[i] = row;
  }

  range.setValues(rows);
  SCRIPT_PROPERTIES.setProperty(cursorKey, String(endRow + 1));
  SpreadsheetApp.getUi().alert(`Improved Categories updated: ${updates} rows (rows ${startRow}-${endRow}). Next start row: ${endRow + 1 > lastRow ? 2 : endRow + 1}`);
  Logger.log(`[improveCategoriesBatch] end; updates=${updates}; nextStart=${endRow + 1}`);
}


// --- CORE PLAID FUNCTIONS (from menu) ---

/**
 * Fetches liability and balance data from Plaid and writes it to the "Liabilities" sheet.
 */
function getBalances() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const LIABILITIES_SHEET = "Liabilities"; 
  const tokenData = getAccessTokens_();
  if (!tokenData.length) return;

  const outputData = [
    ['Institution', 'Account', 'Paid This Month', 'Cycle Status', 'Last Statement Balance', 'Next Payment Due Date', 'Last Statement Issue Date', 'Current Balance', 'Last Payment Amount', 'Last Payment Date']
  ];

  let preservedPaid = new Map();
  let liabilitiesSheet = ss.getSheetByName(LIABILITIES_SHEET);
  if (liabilitiesSheet) {
    // Preserve existing "Paid This Month" values
    const existingData = liabilitiesSheet.getDataRange().getValues();
    if (existingData.length > 1) {
      const headers = existingData[0];
      const paidCol = headers.findIndex(h => String(h).toLowerCase().includes('paid this month'));
      if (paidCol >= 0) {
        for (let i = 1; i < existingData.length; i++) {
          const row = existingData[i];
          const account = String(row[1] || ''); // Account column (index 1)
          const paid = row[paidCol];
          if (account) preservedPaid.set(account, paid);
        }
      }
    }
    liabilitiesSheet.clear();
    liabilitiesSheet.clearFormats(); // Clear old formats
  } else {
    liabilitiesSheet = ss.insertSheet(LIABILITIES_SHEET);
  }

  for (const [accessToken, accountGroupName] of tokenData) {
    const response = makePlaidRequest_('/liabilities/get', { access_token: accessToken });

    if (response.success) {
      const { liabilities, accounts, item } = response.data;
      const institutionName = getInstitutionNameById_(item.institution_id);
      const accountDetailsMap = new Map(accounts.map(acc => [acc.account_id, acc]));

      if (liabilities.credit && liabilities.credit.length > 0) {
        liabilities.credit.forEach(creditAccount => {
          const details = accountDetailsMap.get(creditAccount.account_id);
          if (!details) return;

          const accountName = details.official_name ? `${details.official_name} (${details.mask})` : `${details.name} (${details.mask})`;
          
          // Use accountGroupName from column B, fallback to institution if empty
          const displayName = accountGroupName || getInstitutionNameById_(item.institution_id);
          const now = new Date();
          const rawLastStatementBalance = creditAccount.last_statement_balance;
          const lastStatementBalance = Number(rawLastStatementBalance);
          if (Number.isNaN(lastStatementBalance)) {
            Logger.log(`Non-numeric last_statement_balance for ${accountName}: ${rawLastStatementBalance}`);
          }

          const lastPaymentAmount = parseFloat(creditAccount.last_payment_amount) || 0;
          
          const issueDate = new Date(creditAccount.last_statement_issue_date);
          const daysSinceIssue = (now - issueDate) / (1000 * 60 * 60 * 24);
          const isRecentStatement = daysSinceIssue < 30;
          const isPaid = details.balances.current <= 0;
          const isDormant = (lastStatementBalance == 0 && details.balances.current == 0) || (daysSinceIssue > 90 && isPaid);

          if (isDormant) {
            cycleStatus = "d - Dormant";
          } else if (isRecentStatement && !isPaid) {
            cycleStatus = "a - Statement Generated";
          } else if (isRecentStatement && isPaid) {
            cycleStatus = "b - Statement, Paid";
          } else if (!isRecentStatement && isPaid) {
            cycleStatus = "c - Paid, Awaiting Statement";
          } else {
            // Only mark as overdue if there was a balance on the last statement
            if (lastStatementBalance > 0) {
              // Check if payment is marked as scheduled in "Paid This Month"
              if (preservedPaid.has(accountName)) {
                const paid = preservedPaid.get(accountName);
                if (paid && paid.trim() !== '') {
                  cycleStatus = "b - Payment Scheduled";
                } else {
                  cycleStatus = "b - Overdue";
                }
              } else {
                cycleStatus = "b - Overdue";
              }
            } else {
              // Last statement balance was zero, so no payment due; treat as new charges
              cycleStatus = "a - Statement Generated";
            }
          }

          // Override if user marked "Yes" in Paid This Month
          if (cycleStatus === "a - Statement Generated" && preservedPaid.has(accountName) && preservedPaid.get(accountName).trim() === 'Yes') {
            cycleStatus = "b - Payment Scheduled";
          }

          Logger.log(`After if for ${accountName}: cycleStatus=${cycleStatus}`);

          outputData.push([
            displayName, accountName,
            '',  // Paid This Month: leave as text (no special format)
            cycleStatus,
            parseFloat(creditAccount.last_statement_balance) || 0,
            creditAccount.next_payment_due_date, 
            creditAccount.last_statement_issue_date,
            parseFloat(details.balances.current) || 0, 
            parseFloat(creditAccount.last_payment_amount) || 0, 
            creditAccount.last_payment_date
          ]);
        });
      } else {
        Logger.log(`No credit liabilities found for ${accountGroupName}`);
      }
    } else {
      Logger.log(`Skipping invalid token for ${accountGroupName}: ${response.error}`);
    }
  }

  if (outputData.length > 1) {
    const header = outputData.shift(); 
    outputData.sort((a, b) => (b[4] || 0) - (a[4] || 0));
    outputData.unshift(header);

    // Restore preserved "Paid This Month", but clear if recent payment detected
    for (let i = 1; i < outputData.length; i++) {
      const account = outputData[i][1];
      if (preservedPaid.has(account)) {
        const paidValue = preservedPaid.get(account);
        if (paidValue && paidValue.trim() === 'Yes') {
          // Check for recent payment (within 7 days)
          const lastPaymentDateStr = outputData[i][9]; // Last Payment Date (J)
          if (lastPaymentDateStr) {
            const lastPaymentDate = new Date(lastPaymentDateStr);
            const daysSincePayment = (new Date() - lastPaymentDate) / (1000 * 60 * 60 * 24);
            if (daysSincePayment < 7) {
              outputData[i][2] = ''; // Clear mark if recent payment
            } else {
              outputData[i][2] = paidValue;
            }
          } else {
            outputData[i][2] = paidValue;
          }
        } else {
          outputData[i][2] = paidValue;
        }
      }
    }

    liabilitiesSheet.getRange(1, 1, outputData.length, outputData[0].length).setValues(outputData);
    applyLiabilitySheetFormatting_(liabilitiesSheet);
    Logger.log("Balances script finished successfully.");
  } else {
    Logger.log("No balance data was fetched from the API.");
  }
}

/**
 * Applies all custom formatting to the Liabilities sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to format.
 */
// NOTE: The following helper functions must exist elsewhere in your project.
// function getAccessTokens_() { /* ... */ }
// function makePlaidRequest_(endpoint, payload) { /* ... */ }
// function getInstitutionNameById_(id) { /* ... */ }

/**
 * Checks Plaid item status and highlights duplicates with a three-color system.
 */
function checkItemStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ACCESS_TOKEN_SHEET = "Access Token";
  const sheet = ss.getSheetByName(ACCESS_TOKEN_SHEET);
  if (!sheet) {
    ss.toast(`Error: Sheet '${ACCESS_TOKEN_SHEET}' not found.`);
    return;
  }
  ss.toast("Starting status check...", "In Progress", 15);

  const dataRange = sheet.getDataRange();
  const allData = dataRange.getValues();
  if (allData.length < 1) {
    ss.toast("No tokens to check.");
    return;
  }
  const data = allData; // Check all rows, no header assumption
  const outputData = [];

  // Clear previous formatting on data rows only
  sheet.getRange(1, 1, data.length, sheet.getLastColumn()).setBackground(null);

  // --- 2. FETCH PLAID DATA ---
  for (let i = 0; i < data.length; i++) {
    const accessToken = data[i][0];
    let itemStatus = "";
    let finalColumnDOutput = "";

    if (accessToken && accessToken.startsWith('access-')) {
      const itemResponse = makePlaidRequest_('/item/get', { access_token: accessToken });
      if (itemResponse.success) {
        itemStatus = itemResponse.data.item.error ? itemResponse.data.item.error.error_code : "GOOD";
        if (itemStatus === "GOOD") {
          Logger.log(`Item status GOOD for token ${accessToken}: ${JSON.stringify(itemResponse.data.item)}`);
        }
        const institutionName = getInstitutionNameById_(itemResponse.data.item.institution_id);
        const accountMasks = getAccountMasksFromLiabilities_(accessToken);
        finalColumnDOutput = `${institutionName} (${accountMasks})`;
      } else {
        const errorData = JSON.parse(itemResponse.error);
        itemStatus = errorData.error_code || "API_ERROR";
        finalColumnDOutput = "Invalid Token";
      }
    } else {
      itemStatus = "INVALID_TOKEN";
      finalColumnDOutput = "Invalid Token";
    }
    outputData.push([itemStatus, finalColumnDOutput]);
  }

  // --- 3. WRITE DATA & IDENTIFY DUPLICATES ---
  sheet.getRange(1, 3, outputData.length, 2).setValues(outputData);

  const columnDValues = outputData.map(row => row[1]);
  const valueCounts = new Map();
  columnDValues.forEach(value => {
    if (value && value !== "Invalid Token") {
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    }
  });
  const duplicateValues = new Set();
  for (const [value, count] of valueCounts.entries()) {
    if (count > 1) duplicateValues.add(value);
  }

  // --- 4. APPLY CONDITIONAL HIGHLIGHTING ---
  let duplicatesFound = false;
  for (let i = 0; i < data.length; i++) {
    const isDDupe = duplicateValues.has(columnDValues[i]);
    
    let color = null;
    if (isDDupe) {
      color = "#fee599"; // Orange for Column D duplicates
    }

    if (color) {
      sheet.getRange(i + 1, 1, 1, sheet.getLastColumn()).setBackground(color);
      duplicatesFound = true;
    }
  }

  if (duplicatesFound) {
    ss.toast("⚠️ Duplicates found and highlighted.", "Duplicates Found", 7);
  }
  
  sheet.autoResizeColumn(3);
  sheet.autoResizeColumn(4);
  ss.toast("✅ Status check complete!", "Success", 5);
}

// NOTE: The following helper functions are assumed to exist elsewhere in your project.
// function makePlaidRequest_(endpoint, payload) { /* ... */ }
// function getInstitutionNameById_(id) { /* ... */ }
// function getAccountMasksFromLiabilities_(accessToken) { /* ... */ }

/**
 * Prompts the user for an access token to permanently remove a Plaid item.
 */
function decommissionItem() {
  const ui = SpreadsheetApp.getUi();
  const promptResponse = ui.prompt(
    'Decommission Plaid Item',
    'Enter the full access token you want to permanently decommission:',
    ui.ButtonSet.OK_CANCEL
  );

  if (promptResponse.getSelectedButton() !== ui.Button.OK) return;
  const accessToken = promptResponse.getResponseText().trim();
  if (!accessToken) {
    ui.alert('No access token was entered. Operation cancelled.');
    return;
  }

  const response = makePlaidRequest_('/item/remove', { access_token: accessToken });
  const responseText = response.success ? JSON.stringify(response.data, null, 2) : response.error;
  const title = response.success ? '✅ Operation Successful' : '❌ Operation Failed';
  ui.alert(title, `Plaid's full response was:\n\n${responseText}`, ui.ButtonSet.OK);
}

// --- PLAID LINK FLOW (for UI sidebar) ---

/**
 * Starts the Plaid Link flow by creating a link_token and displaying an HTML sidebar.
 */
function startPlaidLinkFlow() {
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    const msg = "Plaid Client ID or Secret is not set in Script Properties.";
    SpreadsheetApp.getUi().alert(msg);
    Logger.log(msg);
    return;
  }

  const payload = {
    "client_name": "Google Sheets Plaid Integration",
    "country_codes": ["US"],
    "language": "en",
    "language": "en",
    "user": {
      // --- MODIFIED: Use a simple, static user ID as you suggested ---
      "client_user_id": "Jeff"
    },
    "products": ["transactions", "liabilities"]
  };
  const response = makePlaidRequest_('/link/token/create', payload);

  if (response.success && response.data.link_token) {
    const htmlTemplate = HtmlService.createTemplateFromFile('Index');
    htmlTemplate.linkToken = response.data.link_token;
    const htmlOutput = htmlTemplate.evaluate().setWidth(400).setHeight(650).setTitle('Plaid Account Link');
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  } else {
    Logger.log(response.error);
    SpreadsheetApp.getUi().alert("Error: Failed to create Plaid link_token. Check logs.");
  }
}

/**
 * Called from the sidebar's client-side JS to exchange a public_token for an access_token.
 * @param {string} publicToken The public token from a successful Plaid Link flow.
 * @return {string} A status message for the user.
 */
function exchangePublicTokenForAccessToken(publicToken) {
  if (!publicToken) return "Error: Public token is missing.";

  const response = makePlaidRequest_('/item/public_token/exchange', { public_token: publicToken });

  if (response.success && response.data.access_token) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ACCESS_TOKEN_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(ACCESS_TOKEN_SHEET);
      sheet.getRange("A1:B1").setValues([["Access Tokens", "Account Group"]]).setFontWeight("bold");
    }

    // Check if this is an update flow
    const updateRow = SCRIPT_PROPERTIES.getProperty('update_row');
    if (updateRow) {
      // Update the existing row
      const row = parseInt(updateRow, 10);
      sheet.getRange(row, 1).setValue(response.data.access_token);
      SCRIPT_PROPERTIES.deleteProperty('update_row'); // Clear the property
      Logger.log("Successfully updated access_token in row " + row);
      return "Success! Account updated. You can now close this sidebar.";
    } else {
      // Append for new accounts
      sheet.appendRow([response.data.access_token, '']);
      Logger.log("Successfully saved access_token to sheet.");
      return "Success! Account linked. You can now close this sidebar.";
    }
  } else {
    Logger.log(response.error);
    return "Error linking account: " + response.error;
  }
}

/**
 * Starts the Plaid Link flow for updating an existing item.
 */
function startPlaidUpdateFlow() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const cell = sheet.getActiveCell();
  const accessToken = cell.getValue();

  if (cell.getColumn() !== 1 || !accessToken.startsWith('access-')) {
      ui.alert('Please select a cell in Column A containing a valid access token first.');
      return;
  }

  // Store the current row for the exchange function to update
  SCRIPT_PROPERTIES.setProperty('update_row', cell.getRow().toString());

  const payload = {
    "client_name": "Google Sheets Plaid Integration",
    "country_codes": ["US"],
    "language": "en",
    "user": {
      "client_user_id": "Jeff"
    },
    "access_token": accessToken,
    "update": {
      "account_selection_enabled": true
    }
  };
  const response = makePlaidRequest_('/link/token/create', payload);

  if (response.success && response.data.link_token) {
      const htmlTemplate = HtmlService.createTemplateFromFile('Index');
      htmlTemplate.linkToken = response.data.link_token;
      const htmlOutput = htmlTemplate.evaluate().setWidth(400).setHeight(650).setTitle('Update Existing Bank Account');
      SpreadsheetApp.getUi().showSidebar(htmlOutput);
  } else {
      Logger.log(response.error);
      SpreadsheetApp.getUi().alert("Error: Failed to create Plaid update link_token. Check logs.");
  }
}


// --- HELPER & UTILITY FUNCTIONS ---

/**
 * A centralized function for making requests to the Plaid API.
 * @param {string} endpoint The Plaid API endpoint (e.g., "/item/get").
 * @param {Object} payload The request payload.
 * @return {{success: boolean, data: ?Object, error: ?string}} An object with the result.
 * @private
 */
function makePlaidRequest_(endpoint, payload) {
  const fullPayload = {
    client_id: PLAID_CLIENT_ID,
    secret: PLAID_SECRET,
    ...payload
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(fullPayload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(PLAID_ENV_URL + endpoint, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      return { success: true, data: JSON.parse(responseText) };
    } else {
      return { success: false, error: responseText };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Fetches an institution's name by its ID, using a cache to avoid redundant API calls.
 * @param {string} institutionId The institution ID from Plaid.
 * @return {string} The name of the financial institution.
 * @private
 */
function getInstitutionNameById_(institutionId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `institution_${institutionId}`;
  const cachedName = cache.get(cacheKey);
  if (cachedName) return cachedName;

  const response = makePlaidRequest_('/institutions/get_by_id', {
    institution_id: institutionId,
    country_codes: ['US']
  });

  if (response.success && response.data.institution) {
    const institutionName = response.data.institution.name;
    cache.put(cacheKey, institutionName, 21600); // Cache for 6 hours
    return institutionName;
  }
  return response.error ? "API Error" : "Unknown Institution";
}

/**
 * Fetches account masks from the /liabilities/get endpoint for an access token.
 * @param {string} accessToken The Plaid access token.
 * @return {string} A comma-separated string of account masks.
 * @private
 */
function getAccountMasksFromLiabilities_(accessToken) {
  const response = makePlaidRequest_('/liabilities/get', { access_token: accessToken });
  if (response.success && response.data.accounts && response.data.accounts.length > 0) {
    return response.data.accounts.map(account => account.mask).join(', ');
  }
  return "";
}


/**
 * Retrieves valid access tokens from the designated sheet.
 * @return {Array<Array<string>>} An array of [accessToken, accountGroupName] pairs.
 * @private
 */
function getAccessTokens_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ACCESS_TOKEN_SHEET);
  if (!sheet || sheet.getLastRow() < 1) {
    Logger.log(`Sheet '${ACCESS_TOKEN_SHEET}' is missing or empty.`);
    SpreadsheetApp.getUi().alert(`Sheet '${ACCESS_TOKEN_SHEET}' is missing or empty. Please add access tokens first.`);
    return [];
  }
  // No header assumption; check all rows for tokens
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
  return values.filter(row => row[0]);
}

 

/**
 * Fetch all transactions for a token between dates with Plaid pagination.
 * Returns transactions array and a Map of accountId -> account object.
 * @param {string} accessToken
 * @param {string} startDate yyyy-mm-dd
 * @param {string} endDate yyyy-mm-dd
 * @return {{transactions: Array<Object>, accountsById: Map<string, Object>}}
 */
function fetchAllTransactionsForToken_(accessToken, startDate, endDate) {
  const pageSize = 500;
  let offset = 0;
  let total = null;
  const out = [];
  let accountsById = new Map();

  Logger.log(`[fetchAllTransactionsForToken_] window ${startDate} -> ${endDate}`);
  while (total === null || offset < total) {
    const payload = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: pageSize, offset }
    };
    const resp = makePlaidRequest_('/transactions/get', payload);
    if (!resp.success) {
      Logger.log(`transactions/get failed: ${resp.error}`);
      break;
    }
    const data = resp.data;
    if (total === null) total = data.total_transactions || 0;
    if (!accountsById.size && Array.isArray(data.accounts)) {
      accountsById = new Map(data.accounts.map(a => [a.account_id, a]));
    }
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      out.push(...data.transactions);
    }
    offset += pageSize;
  }

  return { transactions: out, accountsById };
}
/**
 * Stores all fetched transactions in the Transactions sheet after clearing it.
 * This version includes logic to detect and mark recurring transactions.
 * @param {Array<Object>} allTransactions An array of transaction objects.
 * @private
 */
function storeTransactions_(allTransactions) {
  if (allTransactions.length === 0) {
    Logger.log("No new transactions to store.");
    return;
  }

  // --- RECURRING DETECTION LOGIC START ---

  const transactionGroups = {};

  // 1. Group transactions by a unique key: "Vendor|Amount"
  allTransactions.forEach(t => {
    const vendorName = t.merchant_name || t.name;
    const key = `${vendorName}|${t.amount}`;

    if (!transactionGroups[key]) {
      transactionGroups[key] = [];
    }
    transactionGroups[key].push(t);
  });

  // 2. Mark transactions in groups with more than one entry as recurring
  Object.values(transactionGroups).forEach(group => {
    if (group.length > 1) {
      group.forEach(transactionInGroup => {
        transactionInGroup.isRecurring = true;
      });
    }
  });

  // --- RECURRING DETECTION LOGIC END ---


  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TRANSACTIONS_SHEET);
  }
  sheet.clearContents();

  // Add headers (now includes Plaid ID and Pending?)
  const headers = ['Group', 'Date', 'Vendor', 'Amount', 'Category', 'Improved Category', 'Account', 'Payment Channel', 'Is Recurring?', 'Plaid ID', 'Pending?'];
  
  const data = allTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(t => [
      t.accountGroupName,
      t.date,
      t.merchant_name || t.name,
      t.amount,
      t.primaryFinanceCategory,
      t.improvedCategory || t.primaryFinanceCategory,
      t.accountOfficialName,
      t.payment_channel,
      t.isRecurring || false, // Use the new property, default to FALSE
      t.transaction_id || '',
      Boolean(t.pending) || false
    ]);
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
  sheet.autoResizeColumns(1, headers.length);
  Logger.log(`Stored ${data.length} transactions and identified recurring charges.`);
}

/**
 * Retrieves the category lookup mapping from its sheet.
 * @return {Map<string, string>} A map of Plaid category to custom category.
 * @private
 */
function getCategoryLookupMap_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CATEGORY_LOOKUP_SHEET);
  if (!sheet) return new Map();
  const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 3).getValues();
  return new Map(data.map(row => [row[0], row[2]]));
}


/**
 * Sorts a 2D array of data in-place, moving rows with duplicate
 * Institution/Account pairs to the top.
 * @param {Array<Array<*>>} data The data array, where index 0 is the header.
 * @private
 */
function sortDataWithDuplicatesOnTop_(data) {
  const headers = data.shift();
  const counts = new Map();
  data.forEach(row => {
    const key = `${row[1]}|${row[2]}`; // Key is "Institution|Account"
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  data.sort((a, b) => {
    const keyA = `${a[1]}|${a[2]}`;
    const keyB = `${b[1]}|${b[2]}`;
    const isDuplicateA = counts.get(keyA) > 1;
    const isDuplicateB = counts.get(keyB) > 1;

    if (isDuplicateA !== isDuplicateB) return isDuplicateB - isDuplicateA; // Duplicates first
    const instCompare = a[1].localeCompare(b[1]); // Then by Institution
    if (instCompare !== 0) return instCompare;
    return a[2].localeCompare(b[2]); // Then by Account
  });

  data.unshift(headers); // Add headers back
}

/**
 * Applies currency and date formatting to the Liabilities sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to format.
 * @private
 */
function applyLiabilitySheetFormatting_(sheet) {
  const numDataRows = sheet.getLastRow() - 1;
  if (numDataRows <= 0) return;

  const lastColumn = sheet.getLastColumn();
  sheet.getRange(1, 1, 1, lastColumn).setFontWeight("bold");
  sheet.getRange(2, 5, numDataRows, 1).setNumberFormat("$#,##0.00"); // Last Statement Bal (E)
  sheet.getRange(2, 8, numDataRows, 2).setNumberFormat("$#,##0.00"); // Current Bal, Last Pmt Amt (H, I)
  sheet.getRange(2, 6, numDataRows, 2).setNumberFormat("yyyy-mm-dd"); // Due Date, Issue Date (F, G)
  sheet.getRange(2, 10, numDataRows, 1).setNumberFormat("yyyy-mm-dd"); // Last Pmt Date (J)
  sheet.autoResizeColumns(1, lastColumn);

  // Add dropdown for Paid This Month (C)
  if (numDataRows > 0) {
    const validation = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Yes', 'No'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, 3, numDataRows, 1).setDataValidation(validation); // Column C
  }

  // Conditional formatting to highlight duplicate rows
  const dataRange = sheet.getRange(2, 1, numDataRows, lastColumn);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=COUNTIFS($B$2:$B, $B2, $C$2:$C, $C2)>1')
    .setBackground("#FFFACD") // Light yellow
    .setRanges([dataRange])
    .build();
  sheet.setConditionalFormatRules([rule]);
}

/**
 * Formats a Date object into 'YYYY-MM-DD' string format.
 * @param {Date} date The date to format.
 * @return {string} The formatted date string.
 * @private
 */
function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// =========================
// Transactions Cursor Sync
// =========================

/**
 * Incremental sync using Plaid /transactions/sync.
 * - Stores per-token cursor in Script Properties (hashed key)
 * - First run backfills last 365 days
 * - Merges added/modified into the Transactions sheet via storeTransactions_()
 */
function syncTransactions() {
  const tokens = getAccessTokens_();
  if (!tokens.length) return;

  const categoryMap = getCategoryLookupMap_();
  const allNormalized = [];

  for (const [accessToken, accountGroupName] of tokens) {
    const tokenKey = tokenHashKey_(accessToken);
    let cursor = getCursorForToken_(tokenKey);

    // One-time initial backfill on first run using /transactions/get (last 365 days)
    if (!cursor) {
      const tz = Session.getScriptTimeZone();
      const endDate = formatDate_(new Date());
      const startDate = formatDate_(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
      const { transactions, accountsById } = fetchAllTransactionsForToken_(accessToken, startDate, endDate);
      const categoryMapInit = getCategoryLookupMap_();
      const normalizedInit = transactions.map(t => {
        const acct = accountsById.get(t.account_id);
        const officialName = acct?.official_name || acct?.name || '';
        const primary = (t.personal_finance_category?.primary || (Array.isArray(t.category) ? t.category[0] : '') || '').toString();
        const mapped = primary && categoryMapInit.size ? (categoryMapInit.get(primary) || primary) : (primary || 'Uncategorized');
        return {
          accountGroupName,
          date: t.date,
          merchant_name: t.merchant_name,
          name: t.name,
          amount: t.amount,
          primaryFinanceCategory: mapped,
          improvedCategory: null,
          accountOfficialName: officialName,
          payment_channel: t.payment_channel || '',
          transaction_id: t.transaction_id,
          pending: t.pending === true,
          pending_transaction_id: t.pending_transaction_id || '',
          account_mask: acct?.mask || '',
          plaid_account_id: t.account_id,
          item_key: tokenKey
        };
      });
      if (normalizedInit.length) {
        upsertTransactions_(normalizedInit);
        Logger.log(`[syncTransactions] initial backfill inserted ${normalizedInit.length}`);
      }
    }

    let hasMore = true;
    while (hasMore) {
      const payload = {
        access_token: accessToken,
        count: 500,
      };
      if (cursor) payload.cursor = cursor; // Do NOT send start_date to /transactions/sync

      const resp = makePlaidRequest_('/transactions/sync', payload);
      if (!resp.success) {
        Logger.log(`transactions/sync failed: ${resp.error}`);
        break;
      }
      const data = resp.data;
      cursor = data.next_cursor || cursor;
      hasMore = Boolean(data.has_more);

      const accountsById = new Map((data.accounts || []).map(a => [a.account_id, a]));

      const normalize = (t) => {
        const acct = accountsById.get(t.account_id);
        const officialName = acct?.official_name || acct?.name || '';
        const primary = (t.personal_finance_category?.primary || (Array.isArray(t.category) ? t.category[0] : '') || '').toString();
        const mapped = primary && categoryMap.size ? (categoryMap.get(primary) || primary) : (primary || 'Uncategorized');
        const improvedCategory = null; // left null; can be filled later from Vendors
        return {
          accountGroupName,
          date: t.date,
          merchant_name: t.merchant_name,
          name: t.name,
          amount: t.amount,
          primaryFinanceCategory: mapped,
          improvedCategory,
          accountOfficialName: officialName,
          payment_channel: t.payment_channel || '',
          transaction_id: t.transaction_id,
          pending: t.pending === true,
          pending_transaction_id: t.pending_transaction_id || '',
          account_mask: acct?.mask || '',
          plaid_account_id: t.account_id,
          item_key: tokenKey
        };
      };

      const added = data.added || [];
      const modified = data.modified || [];
      added.forEach(t => allNormalized.push(normalize(t)));
      modified.forEach(t => allNormalized.push(normalize(t)));
      Logger.log(`[syncTransactions] added=${added.length}, modified=${modified.length}, has_more=${hasMore}`);
      // data.removed could be handled to mark voided entries later
    }

    if (cursor) setCursorForToken_(tokenKey, cursor);
  }

  if (allNormalized.length > 0) {
    upsertTransactions_(allNormalized);
  } else {
    Logger.log('No new or modified transactions found during sync.');
  }
}

/**
 * Upserts transactions by Plaid transaction_id into the Transactions sheet.
 * Does not clear the sheet; preserves existing rows not in the payload.
 * Expects headers created by storeTransactions_().
 * @param {Array<Object>} txns
 */
function upsertTransactions_(txns) {
  if (!Array.isArray(txns) || txns.length === 0) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TRANSACTIONS_SHEET);
  if (!sheet) {
    // If sheet doesn't exist yet, fallback to full store to initialize headers
    storeTransactions_(txns);
    return;
  }

  // Ensure headers include Plaid ID and Pending?
  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0].map(h => String(h || '').trim());
  const required = ['Group','Date','Vendor','Amount','Category','Improved Category','Account','Payment Channel','Is Recurring?','Plaid ID','Pending?','Account Mask','Plaid Account ID','Item Key'];
  let headerChanged = false;
  if (headers.length === 0 || headers[0] === '') {
    sheet.getRange(1, 1, 1, required.length).setValues([required]).setFontWeight('bold');
    headers = required.slice();
    headerChanged = true;
  } else {
    // Add missing required headers at the end, then reorder is not necessary; we will use index lookup.
    required.forEach(req => {
      if (!headers.includes(req)) {
        sheet.insertColumnAfter(headers.length);
        headers.push(req);
        sheet.getRange(1, headers.length).setValue(req).setFontWeight('bold');
        headerChanged = true;
      }
    });
  }

  const idx = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iGroup = idx('Group');
  const iDate = idx('Date');
  const iVendor = idx('Vendor');
  const iAmount = idx('Amount');
  const iCategory = idx('Category');
  const iImproved = idx('Improved Category');
  const iAccount = idx('Account');
  const iChannel = idx('Payment Channel');
  const iRecurring = idx('Is Recurring?');
  const iPlaidId = idx('Plaid ID');
  const iPending = idx('Pending?');
  const iMask = idx('Account Mask');
  const iPlaidAccountId = idx('Plaid Account ID');
  const iItemKey = idx('Item Key');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const existingRange = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol) : null;
  const existing = existingRange ? existingRange.getValues() : [];

  // Build map by Plaid ID -> row index (0-based within existing array)
  const plaidIdToRow = new Map();
  if (existing.length > 0) {
    for (let r = 0; r < existing.length; r++) {
      const row = existing[r];
      const pid = String(row[iPlaidId] || '').trim();
      if (pid) plaidIdToRow.set(pid, r);
    }
  }

  // Prepare updates
  const toInsert = [];
  let updatedCount = 0;
  txns.forEach(t => {
    const pid = String(t.transaction_id || '').trim();
    if (!pid) return; // skip invalid
    const pendingLink = String(t.pending_transaction_id || '').trim();
    
    // Create full row array with lastCol columns
    const arr = new Array(lastCol).fill('');
    arr[iGroup] = t.accountGroupName;
    arr[iDate] = t.date;
    arr[iVendor] = t.merchant_name || t.name;
    arr[iAmount] = t.amount;
    arr[iCategory] = t.primaryFinanceCategory;
    arr[iImproved] = t.improvedCategory || t.primaryFinanceCategory;
    arr[iAccount] = t.accountOfficialName;
    arr[iChannel] = t.payment_channel || '';
    arr[iRecurring] = t.isRecurring || false;
    arr[iPlaidId] = pid;
    arr[iPending] = Boolean(t.pending) || false;
    arr[iMask] = t.account_mask || '';
    arr[iPlaidAccountId] = t.plaid_account_id || '';
    arr[iItemKey] = t.item_key || '';

    if (plaidIdToRow.has(pid)) {
      // Update existing row in memory
      const r = plaidIdToRow.get(pid);
      existing[r] = arr;
      updatedCount++;
    } else if (pendingLink && plaidIdToRow.has(pendingLink)) {
      // Merge posted txn into existing pending row; replace Plaid ID to posted ID
      const r = plaidIdToRow.get(pendingLink);
      existing[r] = arr;
      // Update index map: remove old pending key and map new posted id
      plaidIdToRow.delete(pendingLink);
      plaidIdToRow.set(pid, r);
      updatedCount++;
    } else {
      toInsert.push(arr);
    }
  });

  // Write updates
  if (existingRange && existing.length > 0) existingRange.setValues(existing);
  if (toInsert.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toInsert.length, toInsert[0].length).setValues(toInsert);
  }

  Logger.log(`[upsertTransactions_] updated=${updatedCount}, inserted=${toInsert.length}`);
}

/**
 * Build a stable key for storing cursor per token using SHA-256.
 * @param {string} accessToken
 * @return {string} hex hash
 */
function tokenHashKey_(accessToken) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, accessToken);
  return bytes.map(b => (('0' + (b & 0xff).toString(16)).slice(-2))).join('');
}

function getCursorForToken_(tokenKey) {
  const key = `plaid_cursor_${tokenKey}`;
  return SCRIPT_PROPERTIES.getProperty(key) || null;
}

function setCursorForToken_(tokenKey, cursor) {
  const key = `plaid_cursor_${tokenKey}`;
  if (cursor) SCRIPT_PROPERTIES.setProperty(key, cursor);
}

/**
 * Use Gemini to improve transaction category based on vendor/name/amount/date.
 * Reads API key from Script Properties key 'GEMINI_KEY'.
 * Returns a single category label from a controlled list, or null if unavailable.
 * Caches results for 12 hours keyed by vendor|name|amount.
 * @param {string} vendor
 * @param {string} name
 * @param {number} amount
 * @param {string} date yyyy-mm-dd
 * @return {?string}
 * @private
 */
function aiCategorize_(vendor, name, amount, date) {
  try {
    const apiKey = SCRIPT_PROPERTIES.getProperty('GEMINI_KEY');
    if (!apiKey) return null;

    const normalized = `${(vendor || '').toLowerCase().trim()}|${(name || '').toLowerCase().trim()}|${Number(amount).toFixed(2)}`;
    const cache = CacheService.getScriptCache();
    const cacheKey = `ai_cat_${Utilities.base64Encode(normalized).slice(0, 120)}`; // keep under 150 chars
    const cached = cache.get(cacheKey);
    if (cached) {
      Logger.log(`[aiCategorize_] cache hit for key ${cacheKey}`);
      return cached;
    }

    const categories = [
      'Groceries','Dining','Gas','Transportation','Travel','Utilities','Rent/Mortgage','Insurance','Healthcare',
      'Entertainment','Shopping','Subscriptions','Home Improvement','Education','Gifts/Donations','Fees','Income',
      'Taxes','Pets','Childcare','Business','Transfers','Uncategorized'
    ];

    const systemPrompt = `You are a financial transaction categorization assistant. Return ONLY one best-fit category from this exact list: ${categories.join(', ')}.`;
    const userPrompt = `Vendor: ${vendor}\nName: ${name}\nAmount: ${amount}\nDate: ${date}\n\nReturn only the category word from the list. If unsure, return 'Uncategorized'.`;

    const configuredModel = SCRIPT_PROPERTIES.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash';
    // Payload shape aligned to REST example
    const payload = {
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ]
    };

    // Try versions/models; prefer 2.5 on v1beta, then v1, then 1.5
    const attempts = [
      { ver: 'v1beta', model: configuredModel },
      { ver: 'v1', model: configuredModel },
      { ver: 'v1beta', model: 'gemini-1.5-flash' },
      { ver: 'v1', model: 'gemini-1.5-flash' }
    ];

    let res = null;
    let status = 0;
    let pickedAttempt = null;
    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      const url = `https://generativelanguage.googleapis.com/${a.ver}/models/${encodeURIComponent(a.model)}:generateContent`;
      Logger.log(`[aiCategorize_] attempt ${i + 1}/${attempts.length} -> ${a.ver} ${a.model}`);
      res = UrlFetchApp.fetch(url, {
        method: 'post',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      status = res.getResponseCode();
      Logger.log(`[aiCategorize_] status ${status} for ${a.ver} ${a.model}`);
      if (status === 200) {
        pickedAttempt = a;
        break;
      } else {
        Logger.log(`[aiCategorize_] body: ${res.getContentText()}`);
      }
    }
    if (status !== 200) return null;

    const body = JSON.parse(res.getContentText());
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let picked = (text || '').trim();
    // Normalize to a valid category from the list
    const match = categories.find(c => c.toLowerCase() === picked.toLowerCase());
    if (!match) {
      // try to extract first word that matches
      const lower = picked.toLowerCase();
      const found = categories.find(c => lower.includes(c.toLowerCase()));
      picked = found || null;
    } else {
      picked = match;
    }

    if (picked) {
      cache.put(cacheKey, picked, 60 * 60 * 12); // 12 hours
      Logger.log(`[aiCategorize_] picked='${picked}' (cached)`);
      Logger.log(`[aiCategorize_] cache key: ${cacheKey}`);
    } else {
      Logger.log(`[aiCategorize_] no valid category parsed from '${text}'`);
    }
    return picked;
  } catch (e) {
    Logger.log(`aiCategorize_ error: ${e.message}`);
    return null;
  }
}

/**
 * Improve transaction categories in batch using Gemini AI.
 * @param {array} transactions
 * @return {array} transactions with improved categories
 * @private
 */
function improveCategoriesBatch_(transactions) {
  const improved = transactions.map(t => {
    const vendor = t.merchant_name || '';
    const name = t.name || '';
    const amount = t.amount || 0;
    const date = t.date || '';
    const aiCategory = aiCategorize_(vendor, name, amount, date);
    Logger.log(`[improveCategoriesBatch_] vendor: ${vendor}, name: ${name}, amount: ${amount}, date: ${date}, aiCategory: ${aiCategory}`);
    return { ...t, improvedCategory: aiCategory };
  });
  return improved;
}
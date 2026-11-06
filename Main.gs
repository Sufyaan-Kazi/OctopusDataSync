const OCTOPUS_CONFIG = {
  API_KEY: PropertiesService.getScriptProperties().getProperty("OCTOPUS_API_KEY"),
  ELEC_MPAN: PropertiesService.getScriptProperties().getProperty("OCTOPUS_MPAN"),
  ELEC_SERIAL: PropertiesService.getScriptProperties().getProperty("OCTOPUS_SERIAL"),
  GAS_MPRN: PropertiesService.getScriptProperties().getProperty("OCTOPUS_MPRN"),
  GAS_SERIAL: PropertiesService.getScriptProperties().getProperty("OCTOPUS_GAS_SERIAL"),
  
  // Your fixed tariff rates in pence (Valid until Feb 11, 2027)
  ELEC_UNIT_RATE_PENCE: 21.04,
  GAS_UNIT_RATE_PENCE: 4.96,
  
  TIMEZONE: "Europe/London",
  DATE_FORMAT: "yyyy-MM-dd HH:mm:ss"
};

/**
 * Run this function on a daily trigger to fetch the previous days.
 */
function syncYesterdayOctopus() {
  // 🚨 STRICT CONFIGURATION VALIDATION
  if (!OCTOPUS_CONFIG.API_KEY) {
    throw new Error("❌ CRITICAL: OCTOPUS_API_KEY is missing from Script Properties.");
  }
  
  const hasElec = OCTOPUS_CONFIG.ELEC_MPAN && OCTOPUS_CONFIG.ELEC_SERIAL;
  const hasGas = OCTOPUS_CONFIG.GAS_MPRN && OCTOPUS_CONFIG.GAS_SERIAL;
  
  if (!hasElec && !hasGas) {
    throw new Error("❌ CRITICAL: No meters configured. Please add ELEC_MPAN/SERIAL or GAS_MPRN/SERIAL to Script Properties.");
  }

  // Proceed with date calculation if keys exist
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  
  // 3-Day lookback to handle the smart meter DCC network delay
  const pastDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000); 
  
  const periodFrom = pastDate.toISOString();
  const periodTo = today.toISOString();
  
  // 1. Sync Electricity with Electricity Rate
  if (hasElec) {
    console.log("⚡ Starting Electricity Sync...");
    const elecUrl = `https://api.octopus.energy/v1/electricity-meter-points/${OCTOPUS_CONFIG.ELEC_MPAN}/meters/${OCTOPUS_CONFIG.ELEC_SERIAL}/consumption/?period_from=${periodFrom}&period_to=${periodTo}`;
    fetchOctopusData(elecUrl, "Octopus Electricity", OCTOPUS_CONFIG.ELEC_UNIT_RATE_PENCE);
  }

  // 2. Sync Gas with Gas Rate
  if (hasGas) {
    console.log("🔥 Starting Gas Sync...");
    const gasUrl = `https://api.octopus.energy/v1/gas-meter-points/${OCTOPUS_CONFIG.GAS_MPRN}/meters/${OCTOPUS_CONFIG.GAS_SERIAL}/consumption/?period_from=${periodFrom}&period_to=${periodTo}`;
    fetchOctopusData(gasUrl, "Octopus Gas", OCTOPUS_CONFIG.GAS_UNIT_RATE_PENCE);
  }
}

/**
 * Universal execution logic with duplicate row prevention and cost calculation
 */
function fetchOctopusData(url, sheetName, unitRatePence) {
  if (!OCTOPUS_CONFIG.API_KEY) {
    console.error("❌ Missing API_KEY in Script Properties.");
    return;
  }

  const encodedKey = Utilities.base64Encode(OCTOPUS_CONFIG.API_KEY + ":");
  const headers = { "Authorization": "Basic " + encodedKey };
  
  const response = UrlFetchApp.fetch(url, { "method": "get", "headers": headers, "muteHttpExceptions": true });
  
  if (response.getResponseCode() !== 200) {
    console.error(`❌ API Error for ${sheetName}: ` + response.getContentText());
    return;
  }

  const data = JSON.parse(response.getContentText());
  const results = data.results;

  if (!results || results.length === 0) {
    console.log(`⚠️ No consumption data found for ${sheetName} in this period.`);
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    // Added a 4th column for Cost
    sheet.appendRow(["INTERVAL START", "INTERVAL END", "CONSUMPTION (kWh)", "COST (£)"]);
  }

  const newRows = results.map(interval => {
    const start = Utilities.formatDate(new Date(interval.interval_start), OCTOPUS_CONFIG.TIMEZONE, OCTOPUS_CONFIG.DATE_FORMAT);
    const end = Utilities.formatDate(new Date(interval.interval_end), OCTOPUS_CONFIG.TIMEZONE, OCTOPUS_CONFIG.DATE_FORMAT);
    
    // Calculate the cost: (Consumption * Rate in Pence) / 100 to get Pounds
    const costInPounds = (interval.consumption * unitRatePence) / 100;
    
    return [start, end, interval.consumption, costInPounds];
  });

  const lastRow = sheet.getLastRow();
  let finalRows = newRows;
  
  if (lastRow > 1) {
    const existingData = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    const existingKeys = new Set(existingData.map(r => r[0]));
    finalRows = newRows.filter(row => !existingKeys.has(row[0]));
  }

  if (finalRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, finalRows.length, finalRows[0].length).setValues(finalRows);
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).sort({column: 1, ascending: false});
    console.log(`✅ Successfully added ${finalRows.length} new half-hourly intervals to ${sheetName}.`);
  } else {
    console.log(`✅ Sync skipped: All ${newRows.length} intervals already exist in ${sheetName}.`);
  }
}
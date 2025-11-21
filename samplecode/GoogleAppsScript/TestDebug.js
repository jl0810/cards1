/**
 * Test function to debug the getBalances issue
 */
function testGetBalancesDebug() {
  console.log("Starting debug test...");
  
  // Check if we can get the access token
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("access token");
  if (!sheet) {
    console.log("ERROR: 'access token' sheet not found");
    return;
  }
  
  const accessToken = sheet.getRange("A1").getValue();
  console.log("Access token found:", accessToken);
  
  if (!accessToken) {
    console.log("ERROR: No access token in A1");
    return;
  }
  
  // Test the Plaid API call directly
  const payload = { access_token: accessToken };
  console.log("Testing Plaid API call with payload:", payload);
  
  const response = makePlaidRequest_('/liabilities/get', payload);
  console.log("Plaid API response:", response);
  
  if (response.success) {
    console.log("SUCCESS: API call worked");
    console.log("Data received:", response.data);
  } else {
    console.log("ERROR: API call failed");
    console.log("Error details:", response.error);
  }
}

/**
 * Test function to specifically test liabilities data for the working access token
 */
function testLiabilitiesForWorkingToken() {
  console.log("Testing liabilities for working token...");
  
  // Use the specific working access token
  const accessToken = 'access-production-2bafe2de-761c-49f0-a95a-6837fe28a356';
  console.log("Using access token:", accessToken);
  
  // Test the Plaid API call directly
  const payload = { access_token: accessToken };
  console.log("Testing Plaid API call with payload:", payload);
  
  const response = makePlaidRequest_('/liabilities/get', payload);
  console.log("Plaid API response:", response);
  
  if (response.success) {
    console.log("SUCCESS: API call worked");
    console.log("Data received:", response.data);
    
    // Check if there are credit liabilities
    if (response.data.liabilities && response.data.liabilities.credit) {
      console.log("Credit liabilities found:", response.data.liabilities.credit.length);
      response.data.liabilities.credit.forEach((credit, index) => {
        console.log(`Credit ${index + 1}:`, JSON.stringify(credit, null, 2));
      });
    } else {
      console.log("No credit liabilities found");
    }
  } else {
    console.log("ERROR: API call failed");
    console.log("Error details:", response.error);
  }
}

function testProductionLogic() {
  console.log("Testing production logic simulation...");
  
  // Simulate what the production function should do
  const accessToken = 'access-production-2bafe2de-761c-49f0-a95a-6837fe28a356';
  const accountGroupName = 'Amex (Jeff)';
  
  const outputData = [
    ['Account Group', 'Institution', 'Account', 'Last Statement Balance', 'Next Payment Due Date', 'Last Statement Issue Date', 'Current Balance', 'Last Payment Amount', 'Last Payment Date']
  ];
  
  const response = makePlaidRequest_('/liabilities/get', { access_token: accessToken });
  
  if (response.success) {
    const { liabilities, accounts, item } = response.data;
    const institutionName = getInstitutionNameById_(item.institution_id);
    const accountDetailsMap = new Map(accounts.map(acc => [acc.account_id, acc]));
    
    console.log("Institution name:", institutionName);
    console.log("Account details map:", accountDetailsMap);
    
    if (liabilities.credit && liabilities.credit.length > 0) {
      console.log("Processing credit liabilities...");
      liabilities.credit.forEach((creditAccount, index) => {
        console.log(`Processing credit ${index + 1}:`, creditAccount);
        const details = accountDetailsMap.get(creditAccount.account_id);
        console.log("Account details:", details);
        
        if (!details) {
          console.log("No account details found for:", creditAccount.account_id);
          return;
        }
        
        const accountName = details.official_name ? `${details.official_name} (${details.mask})` : `${details.name} (${details.mask})`;
        console.log("Account name:", accountName);
        
        const row = [
          accountGroupName, institutionName, accountName,
          creditAccount.last_statement_balance, creditAccount.next_payment_due_date, creditAccount.last_statement_issue_date,
          details.balances.current, creditAccount.last_payment_amount, creditAccount.last_payment_date
        ];
        console.log("Output row:", row);
        outputData.push(row);
      });
    } else {
      console.log("No credit liabilities found");
    }
  } else {
    console.log("API call failed:", response.error);
  }
  
  console.log("Final output data:", outputData);
  console.log("Number of rows:", outputData.length);
  
  // Test the sheet writing logic
  console.log("Testing sheet writing logic...");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let liabilitiesSheet = ss.getSheetByName("Liabilities");
  if (liabilitiesSheet) {
    console.log("Liabilities sheet exists, clearing it...");
    liabilitiesSheet.clear();
  } else {
    console.log("Creating new Liabilities sheet...");
    liabilitiesSheet = ss.insertSheet("Liabilities");
  }
  
  if (outputData.length > 1) {
    console.log("Writing data to sheet...");
    liabilitiesSheet.getRange(1, 1, outputData.length, outputData[0].length).setValues(outputData);
    console.log("Data written successfully!");
    console.log("Sheet now has", liabilitiesSheet.getLastRow(), "rows and", liabilitiesSheet.getLastColumn(), "columns");
  } else {
    console.log("No data to write");
  }
}

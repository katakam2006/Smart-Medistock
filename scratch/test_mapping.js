const http = require('http');

function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting API Verification Tests...');

  // Test 1: Fetch medicines for Sai Hospital (Offset 0)
  console.log('\n--- Test 1: Fetch medicines for Sai Hospital ---');
  const saiRes = await makeRequest('/api/medicines?limit=5&hospital_name=sai%20hospital', 'GET');
  console.log('Status:', saiRes.statusCode);
  console.log('Total Count Header:', saiRes.headers['x-total-count']);
  console.log('First 2 Items:');
  console.log(saiRes.body.slice(0, 2));

  // Test 2: Fetch medicines for City Medical Clinic (Offset 4000)
  console.log('\n--- Test 2: Fetch medicines for City Medical Clinic ---');
  const cityRes = await makeRequest('/api/medicines?limit=5&hospital_name=city%20medical%20clinic', 'GET');
  console.log('Status:', cityRes.statusCode);
  console.log('Total Count Header:', cityRes.headers['x-total-count']);
  console.log('First 2 Items:');
  console.log(cityRes.body.slice(0, 2));

  // Test 3: Search by client ID in City Medical Clinic
  console.log('\n--- Test 3: Search by virtual Client ID in City Medical Clinic ---');
  if (cityRes.body.length > 0) {
    const virtualId = cityRes.body[0]['Medicine ID'];
    const searchRes = await makeRequest(`/api/medicines?search=${virtualId}&hospital_name=city%20medical%20clinic`, 'GET');
    console.log('Search query:', virtualId);
    console.log('Found:', searchRes.body);
  }

  // Test 4: Dispatch a unit using Client ID
  console.log('\n--- Test 4: Dispatch using Client ID in City Medical Clinic ---');
  if (cityRes.body.length > 0) {
    const targetItem = cityRes.body[0];
    const initialQty = targetItem['No. of Units'];
    console.log(`Initial stock for ${targetItem['Medicine ID']} (${targetItem['Medicine Name']}): ${initialQty}`);
    
    const dispatchRes = await makeRequest('/api/medicines/dispatch', 'POST', {
      medicine_id: targetItem['Medicine ID'],
      medicine_name: targetItem['Medicine Name'],
      quantity: 1,
      hospital_name: 'city medical clinic'
    });
    console.log('Dispatch Response:', dispatchRes.body);

    // Verify stock in database by querying again
    const verifyRes = await makeRequest(`/api/medicines?search=${targetItem['Medicine ID']}&hospital_name=city%20medical%20clinic`, 'GET');
    console.log('Updated stock in DB:', verifyRes.body[0]['No. of Units']);
  }

  // Test 5: Fetch predictions for City Medical Clinic
  console.log('\n--- Test 5: Forecast for City Medical Clinic ---');
  const forecastRes = await makeRequest('/api/prediction/forecast?limit=3&period=weekly&hospital_name=city%20medical%20clinic', 'GET');
  console.log('Status:', forecastRes.statusCode);
  console.log('Forecast output:');
  console.log(forecastRes.body);
}

runTests().catch(console.error);

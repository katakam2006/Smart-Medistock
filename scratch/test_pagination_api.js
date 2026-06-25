const API_BASE = 'http://localhost:3000';

async function testApi() {
    try {
        console.log("Testing /api/medicines with limit=10 and offset=0...");
        let res = await fetch(`${API_BASE}/api/medicines?limit=10&offset=0&hospital_name=sai%20hospital`);
        console.log(`Status: ${res.status}`);
        console.log("Headers:");
        for (const [key, val] of res.headers.entries()) {
            console.log(`  ${key}: ${val}`);
        }
        let data = await res.json();
        console.log(`Returned items: ${data.length}`);
        if (data.length > 0) {
            console.log("First item sample:", data[0]);
        }

        console.log("\nTesting /api/medicines with limit=10 and offset=10...");
        res = await fetch(`${API_BASE}/api/medicines?limit=10&offset=10&hospital_name=sai%20hospital`);
        console.log(`Status: ${res.status}`);
        data = await res.json();
        console.log(`Returned items: ${data.length}`);
        if (data.length > 0) {
            console.log("First item sample (page 2):", data[0]);
        }

        console.log("\nTesting search query on medicines...");
        res = await fetch(`${API_BASE}/api/medicines?limit=10&offset=0&search=Amox&hospital_name=sai%20hospital`);
        console.log(`Status: ${res.status}`);
        console.log(`X-Total-Count: ${res.headers.get('X-Total-Count')}`);
        data = await res.json();
        console.log(`Search results for 'Amox': ${data.length}`);
        if (data.length > 0) {
            console.log("First search item:", data[0]);
        }
    } catch (err) {
        console.error(err);
    }
}

testApi();

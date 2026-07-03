const API_BASE = 'http://localhost:3000';
const HOSPITAL_NAME = 'sai hospital';

async function test() {
    try {
        // 1. Fetch medicines
        const medsRes = await fetch(`${API_BASE}/api/medicines?limit=4000&hospital_name=${encodeURIComponent(HOSPITAL_NAME)}`);
        const datasetItems = await medsRes.json();
        const inventoryData = datasetItems.map((item, i) => {
            const name = item["Medicine Name"] || 'Unknown';
            const rawPrice = item["Price ($)"] || item.Price || 15;
            const stockVal = parseInt(item["No. of Units"] || item.Quantity || 0, 10) || 0;
            return {
                id: item["Medicine ID"] || `MED-${1000 + i}`,
                name: name,
                cat: item["Category"] || 'General',
                quantity: stockVal,
                price: parseFloat(rawPrice) || 15,
                dose: item["Dosage (mg)"] || item.Dosage || '10mg',
                expiry: item["Expiry Date"] || item.ExpiryDate || '2026-12-31'
            };
        });

        console.log(`Loaded ${inventoryData.length} medicines.`);

        // 2. Fetch alerts
        const alertsRes = await fetch(`${API_BASE}/api/alerts/active?hospital_name=${encodeURIComponent(HOSPITAL_NAME)}`);
        const alerts = await alertsRes.data || await alertsRes.json();
        console.log(`Loaded ${alerts.length} active alerts:`, alerts);

        const alertStatus = {};
        const alertIds = {};
        alerts.forEach(alert => {
            if (alert.alert_type === 'LOW STOCK') {
                alertStatus[`low_${alert.medicine_name}`] = 'pending';
                alertIds[`low_${alert.medicine_name}`] = alert.id;
            } else if (alert.alert_type === 'EXPIRY') {
                alertStatus[`expiry_${alert.medicine_name}`] = 'pending';
                alertIds[`expiry_${alert.medicine_name}`] = alert.id;
            }
        });

        // 3. Render low stock items
        const alertedLowMedicines = Object.keys(alertStatus)
            .filter(key => key.startsWith('low_') && alertStatus[key] === 'pending')
            .map(key => key.replace('low_', ''));

        console.log("alertedLowMedicines:", alertedLowMedicines);

        const lowLimit = 100;
        const lowItems = inventoryData.filter(m => alertedLowMedicines.includes(m.name) && m.quantity < lowLimit);

        console.log(`lowItems (found ${lowItems.length}):`);
        lowItems.forEach(item => console.log(item));

    } catch (err) {
        console.error("Error:", err.message);
    }
}

test();

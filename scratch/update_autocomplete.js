const fs = require('fs');

function updateStocker() {
    let content = fs.readFileSync('public/Stocker.html', 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // 1. Update filterMedicineOptions
    const startFilterMed = content.indexOf('async function filterMedicineOptions(searchText) {');
    const endFilterMed = content.indexOf('function selectMedicine(name) {');
    if (startFilterMed !== -1 && endFilterMed !== -1) {
        const oldBlock = content.slice(startFilterMed, endFilterMed);
        const newBlock = `async function filterMedicineOptions(searchText) {
            const dropdown = document.getElementById('manualAutocompleteDropdown');
            const input = document.getElementById('manualNameInput');

            if (!searchText || searchText.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();

                // Dynamically add found items to activeMedicines if they aren't already there
                items.forEach(item => {
                    const name = item["Medicine Name"];
                    const exists = activeMedicines.some(m => m.id === item["Medicine ID"]);
                    if (!exists) {
                        const rawPrice = item["Price ($)"] || item.Price || 15;
                        const stockVal = parseInt(item["No. of Units"] || item.Quantity || 0, 10) || 0;
                        activeMedicines.push({
                            id: item["Medicine ID"] || \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                            name: name,
                            category: item["Category"] || 'General',
                            quantity: stockVal,
                            dose: item["Dosage"] || '-',
                            price: parseFloat(rawPrice).toFixed(2),
                            expiry: item["Expiry Date"] || "2026-12-31",
                            mfg: item["Manufacture Date"] || '2024-01-01'
                        });
                    }
                });

                if (items.length === 0) {
                    dropdown.innerHTML = \`<div class="no-results">No medicines found matching "\${searchText}"</div>\`;
                    dropdown.classList.add('show');
                    return;
                }

                dropdown.innerHTML = '';
                items.slice(0, 15).forEach(item => {
                    const id = item["Medicine ID"];
                    const name = item["Medicine Name"];
                    const dose = item["Dosage"] || '-';
                    const price = item["Price ($)"] || '0.00';
                    const displayText = \`\${name} (\${dose}) - $\${parseFloat(price).toFixed(2)}\`;

                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = displayText.replace(
                        new RegExp(searchText, 'gi'),
                        match => \`<span class="highlight">\${match}</span>\`
                    );
                    option.innerHTML = highlighted;
                    option.onclick = () => selectMedicine(id, name);
                    dropdown.appendChild(option);
                });
                dropdown.classList.add('show');
            } catch (err) {
                console.error("Autocomplete search failed:", err);
            }
        }\n\n        `;
        content = content.replace(oldBlock, newBlock);
        console.log('Stocker: Updated filterMedicineOptions');
    } else {
        console.error('Stocker: filterMedicineOptions indices not found');
    }

    // 2. Update selectMedicine and fillStockInMedInfoByName
    const startSelectMed = content.indexOf('function selectMedicine(name) {');
    const endSelectMed = content.indexOf('async function filterBillOptions(searchText) {');
    if (startSelectMed !== -1 && endSelectMed !== -1) {
        const oldBlock = content.slice(startSelectMed, endSelectMed);
        const newBlock = `function selectMedicine(id, name) {
            document.getElementById('manualNameInput').value = \`\${name} (ID: \${id})\`;
            document.getElementById('manualName').value = name;
            document.getElementById('manualAutocompleteDropdown').classList.remove('show');
            fillStockInMedInfoById(id);
        }

        function fillStockInMedInfoById(id) {
            const med = activeMedicines.find(m => m.id === id);
            if (med) {
                document.getElementById('manualDose').value = med.dose || '-';
                document.getElementById('manualPrice').value = med.price || '0.00';
            } else {
                document.getElementById('manualDose').value = '';
                document.getElementById('manualPrice').value = '';
            }
        }\n\n        `;
        content = content.replace(oldBlock, newBlock);
        console.log('Stocker: Updated selectMedicine and fillStockInMedInfoById');
    } else {
        console.error('Stocker: selectMedicine indices not found');
    }

    // 3. Update filterBillOptions
    const startFilterBill = content.indexOf('async function filterBillOptions(searchText) {');
    const endFilterBill = content.indexOf('function selectBillMedicine(name) {');
    if (startFilterBill !== -1 && endFilterBill !== -1) {
        const oldBlock = content.slice(startFilterBill, endFilterBill);
        const newBlock = `async function filterBillOptions(searchText) {
            const dropdown = document.getElementById('billAutocompleteDropdown');
            const input = document.getElementById('billMedInput');

            if (!searchText || searchText.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();

                // Dynamically add found items to activeMedicines if they aren't already there
                items.forEach(item => {
                    const name = item["Medicine Name"];
                    const exists = activeMedicines.some(m => m.id === item["Medicine ID"]);
                    if (!exists) {
                        const rawPrice = item["Price ($)"] || item.Price || 15;
                        const stockVal = parseInt(item["No. of Units"] || item.Quantity || 0, 10) || 0;
                        activeMedicines.push({
                            id: item["Medicine ID"] || \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                            name: name,
                            category: item["Category"] || 'General',
                            quantity: stockVal,
                            dose: item["Dosage"] || '-',
                            price: parseFloat(rawPrice).toFixed(2),
                            expiry: item["Expiry Date"] || "2026-12-31",
                            mfg: item["Manufacture Date"] || '2024-01-01'
                        });
                    }
                });

                if (items.length === 0) {
                    dropdown.innerHTML = \`<div class="no-results">No medicines found matching "\${searchText}"</div>\`;
                    dropdown.classList.add('show');
                    return;
                }

                dropdown.innerHTML = '';
                items.slice(0, 15).forEach(item => {
                    const id = item["Medicine ID"];
                    const name = item["Medicine Name"];
                    const dose = item["Dosage"] || '-';
                    const price = item["Price ($)"] || '0.00';
                    const displayText = \`\${name} (\${dose}) - $\${parseFloat(price).toFixed(2)}\`;

                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = displayText.replace(
                        new RegExp(searchText, 'gi'),
                        match => \`<span class="highlight">\${match}</span>\`
                    );
                    option.innerHTML = highlighted;
                    option.onclick = () => selectBillMedicine(id, name);
                    dropdown.appendChild(option);
                });
                dropdown.classList.add('show');
            } catch (err) {
                console.error("Autocomplete search failed:", err);
            }
        }\n\n        `;
        content = content.replace(oldBlock, newBlock);
        console.log('Stocker: Updated filterBillOptions');
    } else {
        console.error('Stocker: filterBillOptions indices not found');
    }

    // 4. Update selectBillMedicine and fillBillMedInfoByName
    const startSelectBill = content.indexOf('function selectBillMedicine(name) {');
    const endSelectBill = content.indexOf('// Close dropdowns when clicking outside');
    if (startSelectBill !== -1 && endSelectBill !== -1) {
        const oldBlock = content.slice(startSelectBill, endSelectBill);
        const newBlock = `function selectBillMedicine(id, name) {
            document.getElementById('billMedInput').value = \`\${name} (ID: \${id})\`;
            document.getElementById('billMedSelect').value = id;
            document.getElementById('billAutocompleteDropdown').classList.remove('show');
            fillBillMedInfoById(id);
        }

        function fillBillMedInfoById(id) {
            const med = activeMedicines.find(m => m.id === id);
            if (med) {
                document.getElementById('billDose').value = med.dose || '-';
                document.getElementById('billPrice').value = med.price || '0.00';
            } else {
                document.getElementById('billDose').value = '';
                document.getElementById('billPrice').value = '';
            }
        }\n\n        `;
        content = content.replace(oldBlock, newBlock);
        console.log('Stocker: Updated selectBillMedicine and fillBillMedInfoById');
    } else {
        console.error('Stocker: selectBillMedicine indices not found');
    }

    // 5. Update fillBillMedInfo and generateBillFromForm
    const startFillBillMed = content.indexOf('function fillBillMedInfo() {');
    const endFillBillMed = content.indexOf('bills.unshift(bill);');
    if (startFillBillMed !== -1 && endFillBillMed !== -1) {
        const oldBlock = content.slice(startFillBillMed, endFillBillMed);
        const newBlock = `function fillBillMedInfo() {
            const id = document.getElementById('billMedSelect').value;
            const med = activeMedicines.find(m => m.id === id);
            if (med) {
                document.getElementById('billDose').value = med.dose || '-';
                document.getElementById('billPrice').value = med.price || '0.00';
            } else {
                document.getElementById('billDose').value = '';
                document.getElementById('billPrice').value = '';
            }
        }

        function generateBillFromForm() {
            const id = document.getElementById('billMedSelect').value;
            const qty = parseInt(document.getElementById('billQty').value);
            if (!id || isNaN(qty) || qty <= 0) { showToast('❌ Select medicine and valid quantity'); return; }
            const med = activeMedicines.find(m => m.id === id);
            if (!med) { showToast('❌ Medicine not found'); return; }
            if (qty > med.quantity) { showToast(\`❌ Insufficient stock! Only \${med.quantity} left.\`); return; }

            const billId = 'B-' + String(Math.floor(Math.random() * 9000) + 1000);
            const date = new Date().toISOString().split('T')[0];
            const display = med.dose && med.dose !== '-' ? \`\${med.name} (\${med.dose})\` : med.name;
            const bill = { id: billId, med: display, qty, date, hospital_name: HOSPITAL_NAME };
            
            // Deduct stock in database
            fetch(API_BASE + '/api/medicines/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_id: med.id,
                    medicine_name: med.name,
                    quantity: qty
                })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(errData => {
                        throw new Error(errData.error || 'Failed to dispatch stock in database.');
                    });
                }
                return res.json();
            })
            .then(data => {
                console.log('✅ Database stock updated on dispatch:', data);
            })
            .catch(err => {
                console.error('❌ Database update error on dispatch:', err);
                showToast('⚠️ Stock updated locally but failed in database.');
            });

            `;
        content = content.replace(oldBlock, newBlock);
        console.log('Stocker: Updated generateBillFromForm search reference');
    } else {
        console.error('Stocker: fillBillMedInfo indices not found');
    }

    content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync('public/Stocker.html', content, 'utf8');
    console.log('Stocker.html updated successfully.');
}

function updateStockin() {
    let content = fs.readFileSync('public/StockinManager.html', 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // 1. Update filterMedicineOptions
    const startFilterMed = content.indexOf('async function filterMedicineOptions(searchText) {');
    const endFilterMed = content.indexOf('function selectMedicine(name) {');
    if (startFilterMed !== -1 && endFilterMed !== -1) {
        const oldBlock = content.slice(startFilterMed, endFilterMed);
        const newBlock = `async function filterMedicineOptions(searchText) {
            const dropdown = document.getElementById('autocompleteDropdown');
            const input = document.getElementById('manualNameInput');

            if (!searchText || searchText.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();

                // Dynamically add found items to the inventoryData if they aren't already there
                items.forEach(item => {
                    const name = item["Medicine Name"];
                    const exists = inventoryData.some(m => m.id === item["Medicine ID"]);
                    if (!exists) {
                        const rawPrice = item["Price ($)"] || item.Price || 15;
                        const stockVal = parseInt(item["No. of Units"] || item.Quantity || 0, 10) || 0;
                        inventoryData.push({
                            id: item["Medicine ID"] || \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                            name: name,
                            cat: item["Category"] || 'General',
                            quantity: stockVal,
                            dose: item["Dosage"] || '-',
                            price: parseFloat(rawPrice) || 15,
                            expiry: item["Expiry Date"] || "2026-12-31",
                            mfg: item["Manufacture Date"] || '2024-01-01'
                        });
                    }
                });

                if (items.length === 0) {
                    dropdown.innerHTML = \`<div class="no-results">No medicines found matching "\${searchText}"</div>\`;
                    dropdown.classList.add('show');
                    return;
                }

                dropdown.innerHTML = '';
                items.slice(0, 15).forEach(item => {
                    const id = item["Medicine ID"];
                    const name = item["Medicine Name"];
                    const dose = item["Dosage"] || '-';
                    const price = item["Price ($)"] || '0.00';
                    const displayText = \`\${name} (\${dose}) - $\${parseFloat(price).toFixed(2)}\`;

                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = displayText.replace(
                        new RegExp(searchText, 'gi'),
                        match => \`<span class="highlight">\${match}</span>\`
                    );
                    option.innerHTML = highlighted;
                    option.onclick = () => selectMedicine(id, name);
                    dropdown.appendChild(option);
                });
                dropdown.classList.add('show');
            } catch (err) {
                console.error("Autocomplete search failed:", err);
            }
        }\n\n        `;
        content = content.replace(oldBlock, newBlock);
        console.log('StockinManager: Updated filterMedicineOptions');
    } else {
        console.error('StockinManager: filterMedicineOptions indices not found');
    }

    // 2. Update selectMedicine and fillStockInMedInfoByName
    const startSelectMed = content.indexOf('function selectMedicine(name) {');
    const endSelectMed = content.indexOf('// Close dropdown when clicking outside');
    if (startSelectMed !== -1 && endSelectMed !== -1) {
        const oldBlock = content.slice(startSelectMed, endSelectMed);
        const newBlock = `function selectMedicine(id, name) {
            document.getElementById('manualNameInput').value = \`\${name} (ID: \${id})\`;
            document.getElementById('manualName').value = name;
            document.getElementById('autocompleteDropdown').classList.remove('show');
            fillStockInMedInfoById(id);
        }

        function fillStockInMedInfoById(id) {
            const med = inventoryData.find(m => m.id === id);
            if (med) {
                document.getElementById('manualDose').value = med.dose || '-';
                document.getElementById('manualPrice').value = med.price || '0.00';
            } else {
                document.getElementById('manualDose').value = '';
                document.getElementById('manualPrice').value = '';
            }
        }\n\n        `;
        content = content.replace(oldBlock, newBlock);
        console.log('StockinManager: Updated selectMedicine and fillStockInMedInfoById');
    } else {
        console.error('StockinManager: selectMedicine indices not found');
    }

    content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync('public/StockinManager.html', content, 'utf8');
    console.log('StockinManager.html updated successfully.');
}

function updateBilling() {
    let content = fs.readFileSync('public/Billing Exceutive.html', 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // 1. Update filterBillOptions
    const startFilterBill = content.indexOf('async function filterBillOptions(searchText) {');
    const endFilterBill = content.indexOf('function selectBillMedicine(name) {');
    if (startFilterBill !== -1 && endFilterBill !== -1) {
        const oldBlock = content.slice(startFilterBill, endFilterBill);
        const newBlock = `async function filterBillOptions(searchText) {
      const dropdown = document.getElementById('billAutocompleteDropdown');
      const input = document.getElementById('billMedInput');

      if (!searchText || searchText.length < 2) {
        dropdown.classList.remove('show');
        return;
      }

      try {
        const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
        if (!response.ok) throw new Error("Could not reach backend");
        const items = await response.json();

        // Dynamically add found items to the inventory if they aren't already there
        items.forEach(item => {
          const name = item["Medicine Name"];
          const exists = inventory.some(m => m.id === item["Medicine ID"]);
          if (!exists) {
            const rawPrice = item["Price ($)"] || item.Price || 15;
            const stockVal = parseInt(item["No. of Units"] || item.Quantity || 0, 10) || 0;
            inventory.push({
              id: item["Medicine ID"] || \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
              name: name,
              cat: item["Category"] || 'General',
              stock: stockVal,
              initialStock: stockVal,
              expiry: item["Expiry Date"] || "2026-12-31",
              price: parseFloat(rawPrice) || 15,
              vendor: item.vendor_name || item["Vendor"] || item.vendor || 'MediPlus Supplies'
            });
          }
        });

        if (items.length === 0) {
          dropdown.innerHTML = \`<div class="no-results">No medicines found matching "\${searchText}"</div>\`;
          dropdown.classList.add('show');
          return;
        }

        dropdown.innerHTML = '';
        items.slice(0, 15).forEach(item => {
          const id = item["Medicine ID"];
          const name = item["Medicine Name"];
          const dose = item["Dosage"] || '-';
          const price = item["Price ($)"] || '0.00';
          const displayText = \`\${name} (\` + (item["Dosage"] ? item["Dosage"] : '-') + \`) - ₹\${parseFloat(price).toFixed(2)}\`;

          const option = document.createElement('div');
          option.className = 'option';
          const highlighted = displayText.replace(
            new RegExp(searchText, 'gi'),
            match => \`<span class="highlight">\${match}</span>\`
          );
          option.innerHTML = highlighted;
          option.onclick = () => selectBillMedicine(id, name);
          dropdown.appendChild(option);
        });
        dropdown.classList.add('show');
      } catch (err) {
        console.error("Autocomplete search failed:", err);
      }
    }\n\n    `;
        content = content.replace(oldBlock, newBlock);
        console.log('Billing: Updated filterBillOptions');
    } else {
        console.error('Billing: filterBillOptions indices not found');
    }

    // 2. Update selectBillMedicine
    const startSelectBill = content.indexOf('function selectBillMedicine(name) {');
    const endSelectBill = content.indexOf('// Close dropdown when clicking outside');
    if (startSelectBill !== -1 && endSelectBill !== -1) {
        const oldBlock = content.slice(startSelectBill, endSelectBill);
        const newBlock = `function selectBillMedicine(id, name) {
      document.getElementById('billMedInput').value = \`\${name} (ID: \${id})\`;
      document.getElementById('billAutocompleteDropdown').classList.remove('show');

      // Find the medicine index
      const idx = inventory.findIndex(m => m.id === id);
      if (idx !== -1) {
        document.getElementById('billMedIdx').value = idx;
        fillBillData();
      }
    }\n\n    `;
        content = content.replace(oldBlock, newBlock);
        console.log('Billing: Updated selectBillMedicine');
    } else {
        console.error('Billing: selectBillMedicine indices not found');
    }

    content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync('public/Billing Exceutive.html', content, 'utf8');
    console.log('Billing Exceutive.html updated successfully.');
}

updateStocker();
updateStockin();
updateBilling();

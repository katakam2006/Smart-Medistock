const fs = require('fs');

function updateServer() {
    let content = fs.readFileSync('server.js', 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // 1. Update /api/medicines search trim
    content = content.replace(
        "const search = req.query.search || '';",
        "const search = (req.query.search || '').trim();"
    );

    // 2. Update /api/medicines/restock check by ID
    const oldRestockSelect = `        const [rows] = await db.query(
            'SELECT medicine_id, no_of_units FROM medicines WHERE LOWER(medicine_name) = LOWER(?) AND (dosage = ? OR ? IS NULL OR dosage = \\'-\\') LIMIT 1',
            [medicine_name, dosage || null, dosage || null]
        );`;

    const newRestockSelect = `        let rows = [];
        if (req.body.medicine_id) {
            const [r] = await db.query('SELECT medicine_id, no_of_units FROM medicines WHERE medicine_id = ?', [req.body.medicine_id]);
            rows = r;
        }
        if (rows.length === 0) {
            const [r] = await db.query(
                'SELECT medicine_id, no_of_units FROM medicines WHERE LOWER(medicine_name) = LOWER(?) AND (dosage = ? OR ? IS NULL OR dosage = \\'-\\') LIMIT 1',
                [medicine_name, dosage || null, dosage || null]
            );
            rows = r;
        }
        `;

    content = content.replace(oldRestockSelect, newRestockSelect);

    content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('server.js updated successfully.');
}

function updateStocker() {
    let content = fs.readFileSync('public/Stocker.html', 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // Add highlightMatch helper after the getExpiryClass helper
    const targetLine = "function getExpiryClass(daysLeft) {";
    const highlightHelper = `function highlightMatch(text, search) {
            if (!search) return text;
            const trimmed = search.trim();
            if (!trimmed) return text;
            const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
            if (index === -1) return text;
            const before = text.slice(0, index);
            const match = text.slice(index, index + trimmed.length);
            const after = text.slice(index + trimmed.length);
            return \`\${before}<span class="highlight">\${match}</span>\${after}\`;
        }

        function getExpiryClass(daysLeft) {`;
    content = content.replace(targetLine, highlightHelper);

    // Update filterMedicineOptions
    const oldFilterMed = `async function filterMedicineOptions(searchText) {
            const dropdown = document.getElementById('manualAutocompleteDropdown');
            const input = document.getElementById('manualNameInput');

            if (!searchText || searchText.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();`;

    const newFilterMed = `async function filterMedicineOptions(searchText) {
            const dropdown = document.getElementById('manualAutocompleteDropdown');
            const input = document.getElementById('manualNameInput');

            const trimmed = (searchText || '').trim();
            if (!trimmed || trimmed.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(trimmed)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();`;
    content = content.replace(oldFilterMed, newFilterMed);

    // Update highlights in filterMedicineOptions
    const oldHighlightsMed = `                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = displayText.replace(
                        new RegExp(searchText, 'gi'),
                        match => \`<span class="highlight">\${match}</span>\`
                    );
                    option.innerHTML = highlighted;
                    option.onclick = () => selectMedicine(id, name);`;

    const newHighlightsMed = `                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = highlightMatch(displayText, trimmed);
                    option.innerHTML = highlighted;
                    option.onclick = () => selectMedicine(id, name);`;
    content = content.replace(oldHighlightsMed, newHighlightsMed);

    // Update selectMedicine to keep input clean and store dataset selectedId
    const oldSelectMed = `function selectMedicine(id, name) {
            document.getElementById('manualNameInput').value = \`\${name} (ID: \${id})\`;
            document.getElementById('manualName').value = name;
            document.getElementById('manualAutocompleteDropdown').classList.remove('show');
            fillStockInMedInfoById(id);
        }`;

    const newSelectMed = `function selectMedicine(id, name) {
            document.getElementById('manualNameInput').value = name;
            document.getElementById('manualNameInput').dataset.selectedId = id;
            document.getElementById('manualName').value = name;
            document.getElementById('manualAutocompleteDropdown').classList.remove('show');
            fillStockInMedInfoById(id);
        }`;
    content = content.replace(oldSelectMed, newSelectMed);

    // Update filterBillOptions search trimming
    const oldFilterBill = `async function filterBillOptions(searchText) {
            const dropdown = document.getElementById('billAutocompleteDropdown');
            const input = document.getElementById('billMedInput');

            if (!searchText || searchText.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();`;

    const newFilterBill = `async function filterBillOptions(searchText) {
            const dropdown = document.getElementById('billAutocompleteDropdown');
            const input = document.getElementById('billMedInput');

            const trimmed = (searchText || '').trim();
            if (!trimmed || trimmed.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(trimmed)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();`;
    content = content.replace(oldFilterBill, newFilterBill);

    // Update highlights in filterBillOptions
    const oldHighlightsBill = `                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = displayText.replace(
                        new RegExp(searchText, 'gi'),
                        match => \`<span class="highlight">\${match}</span>\`
                    );
                    option.innerHTML = highlighted;
                    option.onclick = () => selectBillMedicine(id, name);`;

    const newHighlightsBill = `                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = highlightMatch(displayText, trimmed);
                    option.innerHTML = highlighted;
                    option.onclick = () => selectBillMedicine(id, name);`;
    content = content.replace(oldHighlightsBill, newHighlightsBill);

    // Update selectBillMedicine to keep input clean
    const oldSelectBill = `function selectBillMedicine(id, name) {
            document.getElementById('billMedInput').value = \`\${name} (ID: \${id})\`;
            document.getElementById('billMedSelect').value = id;
            document.getElementById('billAutocompleteDropdown').classList.remove('show');
            fillBillMedInfoById(id);
        }`;

    const newSelectBill = `function selectBillMedicine(id, name) {
            document.getElementById('billMedInput').value = name;
            document.getElementById('billMedSelect').value = id;
            document.getElementById('billAutocompleteDropdown').classList.remove('show');
            fillBillMedInfoById(id);
        }`;
    content = content.replace(oldSelectBill, newSelectBill);

    // Update addMedicineManually existing check & body parameters
    const oldAddMed = `            const existing = activeMedicines.find(m => m.name.toLowerCase() === name.toLowerCase());
            let qtyBefore = 0;
            let qtyAfter = 0;

            if (existing) {
                qtyBefore = existing.quantity;
                existing.quantity += parseInt(qty, 10);
                existing.mfg = mfg || existing.mfg;
                existing.expiry = expiry || existing.expiry;
                qtyAfter = existing.quantity;
            } else {
                const newMed = {
                    id: \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                    name,
                    dose: dose || '-',
                    mfg: mfg || '2024-01-01',
                    expiry: expiry || '2028-12-31',
                    price: parseFloat(price || '0.00').toFixed(2),
                    quantity: parseInt(qty, 10),
                    category: 'General'
                };
                activeMedicines.push(newMed);
                qtyAfter = parseInt(qty, 10);
            }

            // Sync with database
            fetch(API_BASE + '/api/medicines/restock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_name: name,
                    quantity: parseInt(qty, 10),
                    dosage: dose || '-',
                    price: parseFloat(price) || 0.00,
                    category: existing ? existing.category : 'General',`;

    const newAddMed = `            const selectedId = document.getElementById('manualNameInput').dataset.selectedId || '';
            const existing = activeMedicines.find(m => (selectedId && m.id === selectedId) || (m.name.toLowerCase() === name.toLowerCase() && m.dose === dose));
            let qtyBefore = 0;
            let qtyAfter = 0;

            if (existing) {
                qtyBefore = existing.quantity;
                existing.quantity += parseInt(qty, 10);
                existing.mfg = mfg || existing.mfg;
                existing.expiry = expiry || existing.expiry;
                qtyAfter = existing.quantity;
            } else {
                const newMed = {
                    id: selectedId || \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                    name,
                    dose: dose || '-',
                    mfg: mfg || '2024-01-01',
                    expiry: expiry || '2028-12-31',
                    price: parseFloat(price || '0.00').toFixed(2),
                    quantity: parseInt(qty, 10),
                    category: 'General'
                };
                activeMedicines.push(newMed);
                qtyAfter = parseInt(qty, 10);
            }

            // Sync with database
            fetch(API_BASE + '/api/medicines/restock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_id: selectedId,
                    medicine_name: name,
                    quantity: parseInt(qty, 10),
                    dosage: dose || '-',
                    price: parseFloat(price) || 0.00,
                    category: existing ? existing.category : 'General',`;

    content = content.replace(oldAddMed, newAddMed);

    // Clear dataset on success in addMedicineManually
    content = content.replace(
        "showToast(`✅ Added ${qty} units of ${name}`);",
        "showToast(`✅ Added ${qty} units of ${name}`);\n            document.getElementById('manualNameInput').dataset.selectedId = '';"
    );

    content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync('public/Stocker.html', content, 'utf8');
    console.log('Stocker.html updated successfully.');
}

function updateStockin() {
    let content = fs.readFileSync('public/StockinManager.html', 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // Add highlightMatch helper before getMedicineNames
    const targetLine = "function getMedicineNames() {";
    const highlightHelper = `function highlightMatch(text, search) {
            if (!search) return text;
            const trimmed = search.trim();
            if (!trimmed) return text;
            const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
            if (index === -1) return text;
            const before = text.slice(0, index);
            const match = text.slice(index, index + trimmed.length);
            const after = text.slice(index + trimmed.length);
            return \`\${before}<span class="highlight">\${match}</span>\${after}\`;
        }

        function getMedicineNames() {`;
    content = content.replace(targetLine, highlightHelper);

    // Update filterMedicineOptions search trimming
    const oldFilterMed = `async function filterMedicineOptions(searchText) {
            const dropdown = document.getElementById('autocompleteDropdown');
            const input = document.getElementById('manualNameInput');

            if (!searchText || searchText.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();`;

    const newFilterMed = `async function filterMedicineOptions(searchText) {
            const dropdown = document.getElementById('autocompleteDropdown');
            const input = document.getElementById('manualNameInput');

            const trimmed = (searchText || '').trim();
            if (!trimmed || trimmed.length < 2) {
                dropdown.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(trimmed)}&limit=15\`);
                if (!response.ok) throw new Error("Could not reach backend");
                const items = await response.json();`;
    content = content.replace(oldFilterMed, newFilterMed);

    // Update highlights in filterMedicineOptions
    const oldHighlights = `                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = displayText.replace(
                        new RegExp(searchText, 'gi'),
                        match => \`<span class="highlight">\${match}</span>\`
                    );
                    option.innerHTML = highlighted;
                    option.onclick = () => selectMedicine(id, name);`;

    const newHighlights = `                    const option = document.createElement('div');
                    option.className = 'option';
                    const highlighted = highlightMatch(displayText, trimmed);
                    option.innerHTML = highlighted;
                    option.onclick = () => selectMedicine(id, name);`;
    content = content.replace(oldHighlights, newHighlights);

    // Update selectMedicine to keep input clean
    const oldSelectMed = `function selectMedicine(id, name) {
            document.getElementById('manualNameInput').value = \`\${name} (ID: \${id})\`;
            document.getElementById('manualName').value = name;
            document.getElementById('autocompleteDropdown').classList.remove('show');
            fillStockInMedInfoById(id);
        }`;

    const newSelectMed = `function selectMedicine(id, name) {
            document.getElementById('manualNameInput').value = name;
            document.getElementById('manualNameInput').dataset.selectedId = id;
            document.getElementById('manualName').value = name;
            document.getElementById('autocompleteDropdown').classList.remove('show');
            fillStockInMedInfoById(id);
        }`;
    content = content.replace(oldSelectMed, newSelectMed);

    // Update addMedicineManually
    const oldAddMed = `            const existing = inventoryData.find(m => m.name.toLowerCase() === name.toLowerCase());
            let qtyBefore = 0;
            let qtyAfter = 0;

            if (existing) {
                qtyBefore = existing.quantity;
                existing.quantity += parseInt(qty, 10);
                existing.mfg = mfg || existing.mfg;
                existing.expiry = expiry || existing.expiry;
                qtyAfter = existing.quantity;
            } else {
                const newMed = {
                    id: \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                    name: name,
                    cat: 'General',
                    dose: document.getElementById('manualDose').value || '-',
                    price: document.getElementById('manualPrice').value || '0.00',
                    mfg: mfg || '2024-01-01',
                    expiry: expiry || '2028-12-31',
                    quantity: parseInt(qty, 10)
                };
                inventoryData.push(newMed);
                qtyAfter = parseInt(qty, 10);
            }

            // Sync with backend database
            fetch(API_BASE + '/api/medicines/restock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_name: name,
                    quantity: parseInt(qty, 10),
                    dosage: document.getElementById('manualDose').value || '-',
                    price: parseFloat(document.getElementById('manualPrice').value) || 0.00,
                    category: existing ? existing.cat : 'General',`;

    const newAddMed = `            const selectedId = document.getElementById('manualNameInput').dataset.selectedId || '';
            const existing = inventoryData.find(m => (selectedId && m.id === selectedId) || (m.name.toLowerCase() === name.toLowerCase() && m.dose === document.getElementById('manualDose').value));
            let qtyBefore = 0;
            let qtyAfter = 0;

            if (existing) {
                qtyBefore = existing.quantity;
                existing.quantity += parseInt(qty, 10);
                existing.mfg = mfg || existing.mfg;
                existing.expiry = expiry || existing.expiry;
                qtyAfter = existing.quantity;
            } else {
                const newMed = {
                    id: selectedId || \`MED-\${Math.floor(Math.random() * 9000) + 1000}\`,
                    name: name,
                    cat: 'General',
                    dose: document.getElementById('manualDose').value || '-',
                    price: document.getElementById('manualPrice').value || '0.00',
                    mfg: mfg || '2024-01-01',
                    expiry: expiry || '2028-12-31',
                    quantity: parseInt(qty, 10)
                };
                inventoryData.push(newMed);
                qtyAfter = parseInt(qty, 10);
            }

            // Sync with backend database
            fetch(API_BASE + '/api/medicines/restock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicine_id: selectedId,
                    medicine_name: name,
                    quantity: parseInt(qty, 10),
                    dosage: document.getElementById('manualDose').value || '-',
                    price: parseFloat(document.getElementById('manualPrice').value) || 0.00,
                    category: existing ? existing.cat : 'General',`;
    content = content.replace(oldAddMed, newAddMed);

    // Clear dataset on success in addMedicineManually
    content = content.replace(
        "showToast(`✅ Added ${qty} units of ${name}`);",
        "showToast(`✅ Added ${qty} units of ${name}`);\n            document.getElementById('manualNameInput').dataset.selectedId = '';"
    );

    content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync('public/StockinManager.html', content, 'utf8');
    console.log('StockinManager.html updated successfully.');
}

function updateBilling() {
    let content = fs.readFileSync('public/Billing Exceutive.html', 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // Add highlightMatch helper before filterBillOptions
    const targetLine = "async function filterBillOptions(searchText) {";
    const highlightHelper = `function highlightMatch(text, search) {
      if (!search) return text;
      const trimmed = search.trim();
      if (!trimmed) return text;
      const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
      if (index === -1) return text;
      const before = text.slice(0, index);
      const match = text.slice(index, index + trimmed.length);
      const after = text.slice(index + trimmed.length);
      return \`\${before}<span class="highlight">\${match}</span>\${after}\`;
    }

    async function filterBillOptions(searchText) {`;
    content = content.replace(targetLine, highlightHelper);

    // Update filterBillOptions search trimming
    const oldFilterBill = `async function filterBillOptions(searchText) {
      const dropdown = document.getElementById('billAutocompleteDropdown');
      const input = document.getElementById('billMedInput');

      if (!searchText || searchText.length < 2) {
        dropdown.classList.remove('show');
        return;
      }

      try {
        const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(searchText)}&limit=15\`);
        if (!response.ok) throw new Error("Could not reach backend");
        const items = await response.json();`;

    const newFilterBill = `async function filterBillOptions(searchText) {
      const dropdown = document.getElementById('billAutocompleteDropdown');
      const input = document.getElementById('billMedInput');

      const trimmed = (searchText || '').trim();
      if (!trimmed || trimmed.length < 2) {
        dropdown.classList.remove('show');
        return;
      }

      try {
        const response = await fetch(API_BASE + \`/api/medicines?search=\${encodeURIComponent(trimmed)}&limit=15\`);
        if (!response.ok) throw new Error("Could not reach backend");
        const items = await response.json();`;
    content = content.replace(oldFilterBill, newFilterBill);

    // Update highlights in filterBillOptions
    const oldHighlights = `                    const option = document.createElement('div');
          option.className = 'option';
          const highlighted = displayText.replace(
            new RegExp(searchText, 'gi'),
            match => \`<span class="highlight">\${match}</span>\`
          );
          option.innerHTML = highlighted;
          option.onclick = () => selectBillMedicine(id, name);`;

    const newHighlights = `                    const option = document.createElement('div');
          option.className = 'option';
          const highlighted = highlightMatch(displayText, trimmed);
          option.innerHTML = highlighted;
          option.onclick = () => selectBillMedicine(id, name);`;
    content = content.replace(oldHighlights, newHighlights);

    // Update selectBillMedicine to keep input clean
    const oldSelectBill = `function selectBillMedicine(id, name) {
      document.getElementById('billMedInput').value = \`\${name} (ID: \${id})\`;
      document.getElementById('billAutocompleteDropdown').classList.remove('show');`;

    const newSelectBill = `function selectBillMedicine(id, name) {
      document.getElementById('billMedInput').value = name;
      document.getElementById('billAutocompleteDropdown').classList.remove('show');`;
    content = content.replace(oldSelectBill, newSelectBill);

    content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync('public/Billing Exceutive.html', content, 'utf8');
    console.log('Billing Exceutive.html updated successfully.');
}

updateServer();
updateStocker();
updateStockin();
updateBilling();

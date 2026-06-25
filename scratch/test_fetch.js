const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/medicines?limit=100&offset=0&search=&hospital_name=city%20medical%20clinic',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Parsed JSON successfully. First 3 items:');
      console.log(json.slice(0, 3));
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw output snippet:', data.slice(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err);
});

req.end();

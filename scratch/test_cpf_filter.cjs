const https = require('https');

const fetchQuery = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.evidenciacalcados.com.br',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVzZXIiOiI3IiwiaWRMb2phIjoiMCIsImlhdCI6MTc4NTc3MjQxMCwiZXhwIjoxNzg1ODU4ODEwfQ.B1-GbpQrMFXaPUCpC3AdJVacGwVeTaXL-9zq9zxAyLY'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

(async () => {
  const params = [
    '/api/v1/clientes?cpf_cnpj=04552413333',
    '/api/v1/clientes?cpf=04552413333',
    '/api/v1/clientes?busca=04552413333',
    '/api/v1/clientes?search=04552413333',
    '/api/v1/clientes?nome=MENETH'
  ];

  for (const path of params) {
    try {
      const res = await fetchQuery(path);
      console.log(`PATH ${path} => total: ${res.total}, count: ${res.data ? res.data.length : 0}`);
      if (res.data && res.data.length > 0) {
        console.log(`MATCHED: ${res.data[0].nome} (${res.data[0].cpf_cnpj})`);
      }
    } catch (e) {
      console.error(`PATH ${path} ERROR:`, e.message);
    }
  }
})();

const https = require('https');

const fetchUrl = (path) => {
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
  try {
    const res1 = await fetchUrl('/api/v1/clientes');
    console.log('Default /clientes:', { total: res1.total, page: res1.page, perPage: res1.perPage, count: res1.data ? res1.data.length : 0 });
    
    if (res1.data && res1.data.length > 0) {
      console.log('Sample client fields:', Object.keys(res1.data[0]));
      const sampleWithCpf = res1.data.find(c => c.cpf_cnpj);
      if (sampleWithCpf) {
        console.log('Sample client with CPF:', sampleWithCpf);
      }
    }
  } catch (err) {
    console.error(err);
  }
})();

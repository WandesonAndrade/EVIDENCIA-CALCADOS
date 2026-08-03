const https = require('https');

const fetchPage = (page) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.evidenciacalcados.com.br',
      port: 443,
      path: `/api/v1/clientes?page=${page}&perPage=100`,
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
  const page1 = await fetchPage(1);
  console.log('PAGE 1 DATA COUNT:', page1.data ? page1.data.length : 0);
  console.log('PAGES TOTAL:', page1.lastPage);
  if (page1.data && page1.data.length > 0) {
    const withCpf = page1.data.filter(c => c.cpf_cnpj);
    console.log('CLIENTES WITH CPF ON PAGE 1:', withCpf.length);
    if (withCpf.length > 0) {
      console.log('SAMPLE CLIENT WITH CPF:', JSON.stringify(withCpf[0], null, 2));
    }
  }
})();

const https = require('https');

// Simular fetch de clientes e inspecionar a estrutura de retorno
const fetchAllClientes = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.evidenciacalcados.com.br',
      port: 443,
      path: '/api/v1/clientes?page=1',
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
    const result = await fetchAllClientes();
    console.log('API RESPONSE OK. Total clients on page 1:', result.data.length);
    let nullCpfCount = 0;
    let validCpfCount = 0;
    
    result.data.forEach(c => {
      if (!c.cpf_cnpj) {
        nullCpfCount++;
      } else {
        validCpfCount++;
      }
    });

    console.log(`With CPF: ${validCpfCount}, Without/Null CPF: ${nullCpfCount}`);
  } catch (err) {
    console.error('Error fetching MobLink clients:', err);
  }
})();

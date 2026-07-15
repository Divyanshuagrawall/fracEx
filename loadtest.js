const autocannon = require('autocannon');

async function runLoadTest({ url, method, connections, duration, headers, body }) {
  const result = await autocannon({
    url,
    method,
    connections,
    duration,
    headers,
    body,
  });

  console.log('--- Load Test Results ---');
  console.log(`Target: ${method} ${url}`);
  console.log(`Duration: ${duration}s, Connections: ${connections}`);
  console.log(`Total requests: ${result.requests.total}`);
  console.log(`2xx (allowed): ${result['2xx']}`);
  console.log(`Non-2xx (blocked/other): ${result.non2xx}`);
  console.log(`Latency (avg): ${result.latency.average}ms`);
}

runLoadTest({
  url: 'http://localhost:5000/api/orders',
  method: 'POST',
  connections: 10,
  duration: 5,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNDYwZmZiMTkzNWZmODUzMjVlMjY4OCIsImlhdCI6MTc4NDA5OTA2OSwiZXhwIjoxNzg0NzAzODY5fQ.fFqoFlRzVeOrjG1WMPXCP_t61YSC0a5QkUyoZSpZbsg',
  },
  body: JSON.stringify({ assetSymbol: 'AAPL', type: 'buy', orderType: 'market', quantity: 1 }),
});

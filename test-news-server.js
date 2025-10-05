const { spawn } = require('child_process');

async function testNewsServer() {
  console.log('Testing news server...');
  
  const server = spawn('node', ['news-server.js']);
  
  let output = '';
  let error = '';
  
  server.stdout.on('data', (data) => {
    output += data.toString();
    console.log('Server output:', data.toString());
  });
  
  server.stderr.on('data', (data) => {
    error += data.toString();
    console.log('Server stderr:', data.toString());
  });
  
  server.on('close', (code) => {
    console.log('Server closed with code:', code);
    console.log('Full output:', output);
    if (error) console.log('Errors:', error);
  });
  
  // Send test request
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'fetch-crypto-news',
      arguments: { category: 'defi', limit: 3 }
    },
    id: 1
  };
  
  console.log('Sending request:', JSON.stringify(request));
  server.stdin.write(JSON.stringify(request) + '\n');
  
  // Close after 3 seconds
  setTimeout(() => {
    console.log('Closing server...');
    server.stdin.end();
  }, 3000);
}

testNewsServer().catch(console.error);
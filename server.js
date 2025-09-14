const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const cors = require('cors');
const http = require('http');
const url = require('url');

const app = express();
const PORT = 8888;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Proxy API requests to the backend server
app.use('/api', (req, res) => {
  // Extract the path after /api/
  const apiPath = req.originalUrl.replace('/api/', '');
  
  // Construct the backend URL with /v1 prefix
  const backendUrl = `http://13.61.23.21:8080/v1/${apiPath}`;
  
  console.log(`Proxying request to: ${backendUrl}`);
  
  // Forward the request to the backend
  const options = {
    hostname: '13.61.23.21',
    port: 8080,
    path: `/v1/${apiPath}`,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      ...req.headers
    }
  };
  
  // Remove problematic headers
  delete options.headers.host;
  
  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`Response status: ${proxyRes.statusCode}`);
    
    // Forward response headers
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Forward the response
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.status(502).json({
      error: 'Bad Gateway',
      message: 'Failed to connect to backend server',
      details: error.message
    });
  });
  
  // Forward the request body if it exists
  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
});

// Fallback for any other routes - serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Serving static files from: ${__dirname}`);
  console.log(`API requests will be proxied to http://13.61.23.21:8080`);
});
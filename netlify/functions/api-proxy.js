// Modern Netlify Function to proxy API calls and resolve CORS issues
export default async (request, context) => {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }

  try {
    const { path, method, body, headers } = await request.json();
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    // Validate and sanitize the URL
    const allowedHosts = [
      '13.61.23.21:8080',
      'text.pollinations.ai',
      'api.openai.com',
      'api.anthropic.com',
      'api.google.com',
      'api.deepinfra.com'
    ];

    let targetUrl;
    try {
      const url = new URL(path);
      const hostname = url.hostname;
      const port = url.port ? `:${url.port}` : '';
      const fullHost = `${hostname}${port}`;
      
      if (!allowedHosts.some(allowed => fullHost.includes(allowed))) {
        throw new Error('Host not allowed');
      }
      
      targetUrl = url.toString();
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    // Prepare headers for the request
    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Fiesta/1.0',
    };

    // Add authorization header if present
    if (headers && headers.Authorization) {
      requestHeaders.Authorization = headers.Authorization;
    }

    // Make the proxied request
    const response = await fetch(targetUrl, {
      method: method || 'POST',
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { data: responseText };
    }

    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }
};

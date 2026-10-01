const { randomUUID } = require('node:crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let credentials;
  try {
    credentials = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  const expectedId = process.env.CENTRAL_ADMIN_ID || 'CMgondola';
  const expectedPassword = process.env.CENTRAL_ADMIN_PASSWORD || '199451';
  if (String(credentials.id || '') !== expectedId || String(credentials.password || '') !== expectedPassword) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Credenciais administrativas inválidas.' })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({ token: randomUUID() })
  };
};

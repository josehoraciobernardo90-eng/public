import { randomUUID } from 'node:crypto';

export default async request => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  }

  let credentials;
  try {
    credentials = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const expectedId = process.env.CENTRAL_ADMIN_ID || 'CMgondola';
  const expectedPassword = process.env.CENTRAL_ADMIN_PASSWORD || '199451';
  if (String(credentials.id || '') !== expectedId || String(credentials.password || '') !== expectedPassword) {
    return Response.json({ error: 'Credenciais administrativas inválidas.' }, { status: 401 });
  }

  return Response.json(
    { token: randomUUID() },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
};
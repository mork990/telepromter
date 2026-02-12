import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bucketName = (Deno.env.get("GCS_BUCKET_NAME") || "").trim();
    const clientEmail = (Deno.env.get("GCS_CLIENT_EMAIL") || "").trim();
    const privateKey = (Deno.env.get("GCS_PRIVATE_KEY") || "").trim();

    const saKey = { client_email: clientEmail, private_key: privateKey };
    const accessToken = await getAccessToken(saKey);

    // Try to access the file using bearer token
    const objectName = 'videos/mljfmvfeqx9jd0.mp4';
    const res = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(objectName)}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    const data = await res.json();
    return Response.json({ status: res.status, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getAccessToken(saKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: saKey.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const encoder = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const claimB64 = base64url(JSON.stringify(claim));
  const unsignedToken = `${headerB64}.${claimB64}`;
  const rawKey = saKey.private_key.replace(/\\n/g, '\n');
  const pemContent = rawKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\n/g, '').replace(/\r/g, '').trim();
  const keyBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBuffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken));
  const signatureB64 = base64url(signature);
  const jwt = `${unsignedToken}.${signatureB64}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get token');
  return tokenData.access_token;
}

function base64url(input) {
  let str;
  if (typeof input === 'string') { str = btoa(input); } else {
    const bytes = new Uint8Array(input); let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    str = btoa(binary);
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
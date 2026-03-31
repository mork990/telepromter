import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    const bucketName = (Deno.env.get("GCS_BUCKET_NAME") || "").trim();
    const clientEmail = (Deno.env.get("GCS_CLIENT_EMAIL") || "").trim();
    const privateKey = (Deno.env.get("GCS_PRIVATE_KEY") || "").trim();

    if (!bucketName || !clientEmail || !privateKey) {
      return Response.json({ error: 'GCS not configured' }, { status: 500 });
    }

    // Extract object name from the URL
    // URL format: https://storage.googleapis.com/BUCKET/OBJECT_PATH
    const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;
    if (!file_url.startsWith(urlPrefix)) {
      // Not a GCS URL, return as-is
      return Response.json({ signed_url: file_url });
    }

    const objectName = file_url.substring(urlPrefix.length);
    const saKey = { client_email: clientEmail, private_key: privateKey };

    // Generate a signed URL using V4 signing
    const expiration = 3600; // 1 hour
    const now = new Date();
    const datestamp = now.toISOString().replace(/[-:]/g, '').substring(0, 8);
    const timestamp = datestamp + 'T' + now.toISOString().replace(/[-:]/g, '').substring(9, 15) + 'Z';

    const credentialScope = `${datestamp}/auto/storage/goog4_request`;
    const credential = `${saKey.client_email}/${credentialScope}`;

    const host = 'storage.googleapis.com';
    const canonicalUri = `/${bucketName}/${objectName}`;

    const params = new URLSearchParams({
      'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
      'X-Goog-Credential': credential,
      'X-Goog-Date': timestamp,
      'X-Goog-Expires': expiration.toString(),
      'X-Goog-SignedHeaders': 'host',
    });

    // Sort params
    const sortedParams = new URLSearchParams([...params.entries()].sort());
    const canonicalQueryString = sortedParams.toString();

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    // Create string to sign
    const encoder = new TextEncoder();
    const canonicalRequestHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
    const hashHex = Array.from(new Uint8Array(canonicalRequestHash)).map(b => b.toString(16).padStart(2, '0')).join('');

    const stringToSign = [
      'GOOG4-RSA-SHA256',
      timestamp,
      credentialScope,
      hashHex,
    ].join('\n');

    // Import private key and sign
    const rawKey = saKey.private_key.replace(/\\n/g, '\n');
    const pemContent = rawKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .trim();

    const keyBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(stringToSign)
    );

    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    const signedUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signatureHex}`;

    return Response.json({ signed_url: signedUrl });
  } catch (error) {
    console.error('getSignedGcsUrl error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
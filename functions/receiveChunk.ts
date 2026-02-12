import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chunk_base64, session_id, chunk_index, total_chunks, file_name } = await req.json();

    if (!chunk_base64 || !session_id || chunk_index === undefined || !total_chunks) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const bucketName = (Deno.env.get("GCS_BUCKET_NAME") || "").trim();
    const clientEmail = (Deno.env.get("GCS_CLIENT_EMAIL") || "").trim();
    const privateKey = (Deno.env.get("GCS_PRIVATE_KEY") || "").trim();

    if (!bucketName || !clientEmail || !privateKey) {
      return Response.json({ error: 'GCS not configured' }, { status: 500 });
    }

    const saKey = { client_email: clientEmail, private_key: privateKey };

    // Generate OAuth2 access token from service account
    const accessToken = await getAccessToken(saKey);

    // Decode base64 to binary
    const binaryString = atob(chunk_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const isLastChunk = chunk_index === total_chunks - 1;
    const ext = (file_name || 'video.mp4').split('.').pop().toLowerCase();
    const objectName = `videos/${session_id}.${ext}`;

    if (chunk_index === 0) {
      // Start a resumable upload session
      const initRes = await fetch(
        `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=resumable&name=${encodeURIComponent(objectName)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': getMimeType(ext),
          },
          body: JSON.stringify({ name: objectName, contentType: getMimeType(ext) }),
        }
      );

      if (!initRes.ok) {
        const errText = await initRes.text();
        console.error('GCS init error:', errText);
        return Response.json({ error: 'Failed to init upload' }, { status: 500 });
      }

      const resumableUri = initRes.headers.get('Location');
      console.log(`Resumable upload started: ${resumableUri}`);

      // Upload first chunk
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const startByte = 0;
      const endByte = bytes.byteLength - 1;
      const totalSize = isLastChunk ? bytes.byteLength : '*';

      const uploadRes = await fetch(resumableUri, {
        method: 'PUT',
        headers: {
          'Content-Length': bytes.byteLength.toString(),
          'Content-Range': `bytes ${startByte}-${endByte}/${totalSize}`,
        },
        body: bytes,
      });

      if (isLastChunk && uploadRes.ok) {
        const data = await uploadRes.json();
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
        console.log(`Upload complete (single chunk): ${publicUrl}`);
        return Response.json({ success: true, done: true, chunk_index, secure_url: publicUrl });
      }

      if (!isLastChunk && (uploadRes.status === 308 || uploadRes.status === 200)) {
        // Store resumable URI for subsequent chunks - save it in entity
        await base44.asServiceRole.entities.Recording.create({
          title: `__upload_session_${session_id}`,
          file_url: resumableUri,
        });
        console.log(`Chunk 0 uploaded, session saved`);
        return Response.json({ success: true, done: false, chunk_index });
      }

      const errText = await uploadRes.text();
      console.error('GCS first chunk error:', errText);
      return Response.json({ error: 'Failed to upload first chunk' }, { status: 500 });

    } else {
      // Retrieve the resumable URI from stored session
      const sessions = await base44.asServiceRole.entities.Recording.filter({ title: `__upload_session_${session_id}` });
      if (!sessions || sessions.length === 0) {
        return Response.json({ error: 'Upload session not found' }, { status: 400 });
      }

      const resumableUri = sessions[0].file_url;
      const sessionRecordId = sessions[0].id;

      const CHUNK_SIZE = 5 * 1024 * 1024;
      const startByte = chunk_index * CHUNK_SIZE;
      const endByte = startByte + bytes.byteLength - 1;
      const totalSize = isLastChunk ? (endByte + 1) : '*';

      const uploadRes = await fetch(resumableUri, {
        method: 'PUT',
        headers: {
          'Content-Length': bytes.byteLength.toString(),
          'Content-Range': `bytes ${startByte}-${endByte}/${totalSize}`,
        },
        body: bytes,
      });

      if (isLastChunk && uploadRes.ok) {
        // Clean up session record
        await base44.asServiceRole.entities.Recording.delete(sessionRecordId);
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
        console.log(`Upload complete: ${publicUrl}`);
        return Response.json({ success: true, done: true, chunk_index, secure_url: publicUrl });
      }

      if (!isLastChunk && (uploadRes.status === 308 || uploadRes.status === 200)) {
        console.log(`Chunk ${chunk_index} uploaded`);
        return Response.json({ success: true, done: false, chunk_index });
      }

      const errText = await uploadRes.text();
      console.error(`GCS chunk ${chunk_index} error:`, errText);
      return Response.json({ error: `Failed to upload chunk ${chunk_index}` }, { status: 500 });
    }

  } catch (error) {
    console.error('receiveChunk error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getMimeType(ext) {
  const types = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo' };
  return types[ext] || 'video/mp4';
}

async function getAccessToken(saKey) {
  // Create JWT for Google OAuth2
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

  // Import the private key
  const pemContent = saKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
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
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64url(signature);
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get GCS access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

function base64url(input) {
  let str;
  if (typeof input === 'string') {
    str = btoa(input);
  } else {
    // ArrayBuffer
    const bytes = new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    str = btoa(binary);
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
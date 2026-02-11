import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

// v3 - JSON base64 chunked upload to Cloudinary
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (authErr) {
    return Response.json({ error: 'Auth failed: ' + authErr.message }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (parseErr) {
    return Response.json({ error: 'Invalid JSON body: ' + parseErr.message }, { status: 400 });
  }

  const { chunk_base64, upload_id, chunk_index, total_chunks, total_size, range_start, range_end } = body;

  if (!chunk_base64 || !upload_id) {
    return Response.json({ error: 'Missing chunk_base64 or upload_id' }, { status: 400 });
  }

  const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
  const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
  const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'video-uploads';

  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash('sha1').update(toSign).digest('hex');

  // Decode base64 to binary
  const raw = atob(chunk_base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  const blob = new Blob([arr], { type: 'video/mp4' });

  // Build FormData for Cloudinary
  const fd = new FormData();
  fd.append('file', blob, 'chunk.mp4');
  fd.append('api_key', apiKey);
  fd.append('timestamp', String(timestamp));
  fd.append('signature', signature);
  fd.append('folder', folder);

  try {
    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      {
        method: 'POST',
        headers: {
          'X-Unique-Upload-Id': upload_id,
          'Content-Range': `bytes ${range_start}-${range_end}/${total_size}`,
        },
        body: fd,
      }
    );

    const txt = await cloudRes.text();
    let data;
    try { data = JSON.parse(txt); } catch(_) { data = { raw: txt }; }

    // 408 = Cloudinary waiting for more chunks (expected for non-final chunks)
    if (cloudRes.status === 408) {
      return Response.json({
        status: 'pending',
        chunk_index,
        message: 'Chunk received',
      });
    }

    if (!cloudRes.ok) {
      console.error('Cloudinary error:', cloudRes.status, txt);
      return Response.json({ error: data?.error?.message || 'Cloudinary error ' + cloudRes.status }, { status: 500 });
    }

    return Response.json({
      status: data?.secure_url ? 'complete' : 'pending',
      chunk_index,
      data,
    });
  } catch (fetchErr) {
    console.error('Fetch to Cloudinary failed:', fetchErr);
    return Response.json({ error: 'Cloudinary request failed: ' + fetchErr.message }, { status: 500 });
  }
});
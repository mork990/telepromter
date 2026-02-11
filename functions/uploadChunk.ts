import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

// Chunked upload to Cloudinary via JSON base64 payload v2
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { chunk_base64, upload_id, chunk_index, total_chunks, total_size, range_start, range_end } = body;

    if (!chunk_base64 || !upload_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
    const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
    const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'video-uploads';

    // Create signature (alphabetical params + api_secret)
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    // Decode base64 chunk to binary
    const binaryStr = atob(chunk_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const chunkBlob = new Blob([bytes], { type: 'video/mp4' });

    // Build form data for Cloudinary
    const cloudFormData = new FormData();
    cloudFormData.append('file', chunkBlob, 'chunk.mp4');
    cloudFormData.append('api_key', apiKey);
    cloudFormData.append('timestamp', String(timestamp));
    cloudFormData.append('signature', signature);
    cloudFormData.append('folder', folder);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      {
        method: 'POST',
        headers: {
          'X-Unique-Upload-Id': upload_id,
          'Content-Range': `bytes ${range_start}-${range_end}/${total_size}`,
        },
        body: cloudFormData,
      }
    );

    const resText = await cloudRes.text();
    let resData;
    try { resData = JSON.parse(resText); } catch(_) { resData = { raw: resText }; }

    if (!cloudRes.ok) {
      // 408 means Cloudinary is waiting for more chunks - this is expected
      if (cloudRes.status === 408) {
        return Response.json({ 
          status: 'pending', 
          chunk_index: chunk_index,
          message: 'Chunk received, waiting for more' 
        });
      }
      console.error('Cloudinary error:', cloudRes.status, resText);
      return Response.json({ error: resData?.error?.message || `Cloudinary error: ${cloudRes.status}` }, { status: 500 });
    }

    // If this is the last chunk, Cloudinary returns the full video info
    return Response.json({
      status: resData?.secure_url ? 'complete' : 'pending',
      chunk_index: chunk_index,
      data: resData,
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
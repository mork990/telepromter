import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const formData = await req.formData();
    const chunk = formData.get('chunk');
    const uploadId = formData.get('upload_id');
    const chunkIndex = formData.get('chunk_index');
    const totalChunks = formData.get('total_chunks');
    const totalSize = formData.get('total_size');
    const rangeStart = formData.get('range_start');
    const rangeEnd = formData.get('range_end');

    if (!chunk || !uploadId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
    const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
    const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'video-uploads';

    // Create signature
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const { createHash } = await import('node:crypto');
    const signature = createHash('sha1').update(toSign).digest('hex');

    // Build form data for Cloudinary
    const cloudFormData = new FormData();
    cloudFormData.append('file', chunk);
    cloudFormData.append('api_key', apiKey);
    cloudFormData.append('timestamp', String(timestamp));
    cloudFormData.append('signature', signature);
    cloudFormData.append('folder', folder);
    cloudFormData.append('resource_type', 'video');

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      {
        method: 'POST',
        headers: {
          'X-Unique-Upload-Id': uploadId,
          'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
        },
        body: cloudFormData,
      }
    );

    const resText = await cloudRes.text();
    let resData;
    try { resData = JSON.parse(resText); } catch(_) { resData = { raw: resText }; }

    if (!cloudRes.ok && cloudRes.status !== 200) {
      // For chunked uploads, Cloudinary returns various status codes
      // 408 means "waiting for more chunks" which is expected
      if (cloudRes.status === 408) {
        return Response.json({ 
          status: 'pending', 
          chunk_index: Number(chunkIndex),
          message: 'Chunk received, waiting for more' 
        });
      }
      console.error('Cloudinary error:', cloudRes.status, resText);
      return Response.json({ error: resData?.error?.message || `Cloudinary error: ${cloudRes.status}` }, { status: 500 });
    }

    // If this is the last chunk, Cloudinary returns the full video info
    return Response.json({
      status: resData?.secure_url ? 'complete' : 'pending',
      chunk_index: Number(chunkIndex),
      data: resData,
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
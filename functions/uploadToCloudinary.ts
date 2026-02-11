import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    
    let file_url, file_name, file_size_bytes, duration_seconds;
    
    if (contentType.includes('application/json')) {
      // JSON payload with base44 file_url
      const body = await req.json();
      file_url = body.file_url;
      file_name = body.file_name;
      file_size_bytes = body.file_size_bytes;
      duration_seconds = body.duration_seconds;
    } else {
      return Response.json({ error: 'Send JSON with file_url' }, { status: 400 });
    }

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
    const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
    const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'video-uploads';

    // Create signature
    const { createHash } = await import('node:crypto');
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    // Download the file from base44 storage
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file from storage' }, { status: 500 });
    }
    const fileBlob = await fileResponse.blob();

    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', fileBlob, file_name || 'video.mp4');
    formData.append('signature', signature);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('folder', folder);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: 'POST', body: formData }
    );

    const cloudData = await cloudRes.json();

    if (!cloudRes.ok) {
      console.error('Cloudinary error:', JSON.stringify(cloudData));
      return Response.json({ error: cloudData?.error?.message || 'Cloudinary upload failed' }, { status: 500 });
    }

    // Save recording in DB
    const recording = await base44.entities.Recording.create({
      title: (file_name || 'video').replace(/\.[^/.]+$/, ''),
      file_url: cloudData.secure_url,
      duration_seconds: duration_seconds || Math.round(cloudData.duration || 0),
      file_size_bytes: file_size_bytes || cloudData.bytes,
    });

    return Response.json({
      success: true,
      recording_id: recording.id,
      file_url: cloudData.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
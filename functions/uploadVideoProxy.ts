import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    
    let fileBuffer;
    let fileName = 'video.mp4';
    let fileSizeBytes = 0;
    let durationSeconds = 0;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      fileName = formData.get('file_name') || file?.name || 'video.mp4';
      durationSeconds = parseInt(formData.get('duration_seconds') || '0', 10);
      
      if (!file || !(file instanceof File)) {
        return Response.json({ error: 'No file provided' }, { status: 400 });
      }
      
      fileBuffer = await file.arrayBuffer();
      fileSizeBytes = fileBuffer.byteLength;
    } else {
      return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    console.log(`Uploading ${fileName} (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) to Cloudinary...`);

    // Upload to Cloudinary
    const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
    const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
    const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'video-uploads';
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    const cloudForm = new FormData();
    cloudForm.append('file', new Blob([fileBuffer]), fileName);
    cloudForm.append('api_key', apiKey);
    cloudForm.append('timestamp', String(timestamp));
    cloudForm.append('signature', signature);
    cloudForm.append('folder', folder);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: 'POST', body: cloudForm }
    );

    if (!cloudRes.ok) {
      const errBody = await cloudRes.text();
      console.error('Cloudinary error:', errBody);
      return Response.json({ error: 'Cloudinary upload failed: ' + cloudRes.status }, { status: 500 });
    }

    const cloudResult = await cloudRes.json();
    const fileUrl = cloudResult.secure_url;

    if (!fileUrl) {
      return Response.json({ error: 'No URL from Cloudinary' }, { status: 500 });
    }

    console.log('Cloudinary upload success:', fileUrl);

    // Save recording
    const recording = await base44.entities.Recording.create({
      title: fileName.replace(/\.[^/.]+$/, ''),
      file_url: fileUrl,
      duration_seconds: durationSeconds || Math.round(cloudResult.duration || 0),
      file_size_bytes: fileSizeBytes,
    });

    return Response.json({ success: true, file_url: fileUrl, recording_id: recording.id });
  } catch (error) {
    console.error('Upload proxy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
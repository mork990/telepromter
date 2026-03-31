import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, total_chunks, file_name, duration_seconds, file_size_bytes, chunk_uris } = await req.json();

    if (!session_id || !total_chunks || !chunk_uris || chunk_uris.length !== total_chunks) {
      return Response.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
    const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
    const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return Response.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    console.log(`Assembling ${total_chunks} chunks for session ${session_id}`);

    // Download all chunks sequentially and stream to Cloudinary using chunked upload
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'video-uploads';

    // Generate signature
    const { createHash } = await import('node:crypto');
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    // Download and combine all chunks
    const allChunks = [];
    let totalSize = 0;

    for (let i = 0; i < total_chunks; i++) {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: chunk_uris[i] });
      const response = await fetch(signed_url);
      if (!response.ok) {
        return Response.json({ error: `Failed to download chunk ${i}` }, { status: 500 });
      }
      const buffer = new Uint8Array(await response.arrayBuffer());
      allChunks.push(buffer);
      totalSize += buffer.byteLength;
      console.log(`Downloaded chunk ${i}/${total_chunks}, size: ${buffer.byteLength}`);
    }

    console.log(`Total size: ${totalSize}, uploading to Cloudinary...`);

    // Combine chunks
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of allChunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    // Upload to Cloudinary in one go
    const ext = (file_name || 'video.mp4').split('.').pop().toLowerCase();
    const mimeTypes = { 'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime' };
    const mimeType = mimeTypes[ext] || 'video/mp4';

    const formData = new FormData();
    formData.append('file', new Blob([combined], { type: mimeType }), file_name || 'video.mp4');
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);
    formData.append('resource_type', 'video');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: 'POST', body: formData }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData.secure_url) {
      console.error('Cloudinary error:', JSON.stringify(uploadData));
      return Response.json({ error: uploadData?.error?.message || 'Cloudinary upload failed' }, { status: 500 });
    }

    const file_url = uploadData.secure_url;
    console.log(`Uploaded to Cloudinary: ${file_url}`);

    // Create recording
    const title = (file_name || 'video').replace(/\.[^/.]+$/, '');
    const recording = await base44.entities.Recording.create({
      title,
      file_url,
      duration_seconds: duration_seconds || 0,
      file_size_bytes: file_size_bytes || totalSize,
    });

    console.log(`Recording created: ${recording.id}`);

    return Response.json({ 
      success: true, 
      file_url,
      recording_id: recording.id
    });
  } catch (error) {
    console.error('assembleVideo error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
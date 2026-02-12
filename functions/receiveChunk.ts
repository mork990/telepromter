import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

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

    const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
    const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
    const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return Response.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    // Decode base64 to binary
    const binaryString = atob(chunk_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const chunkSize = bytes.byteLength;

    // Calculate Content-Range header
    const CHUNK_SIZE = 5 * 1024 * 1024; // must match frontend
    const startByte = chunk_index * CHUNK_SIZE;
    const endByte = startByte + chunkSize - 1;
    // We don't know the exact total file size, so we use '*' for non-final chunks
    // and the actual end byte for the final chunk
    const isLastChunk = chunk_index === total_chunks - 1;

    // Generate signature
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'video-uploads';
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    // Upload chunk to Cloudinary using chunked upload
    const ext = (file_name || 'video.mp4').split('.').pop().toLowerCase();
    const mimeTypes = { 'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime' };
    const mimeType = mimeTypes[ext] || 'video/mp4';

    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: mimeType }), file_name || 'video.mp4');
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);
    formData.append('resource_type', 'video');

    // Use X-Unique-Upload-Id for chunked upload session
    const headers = {
      'X-Unique-Upload-Id': session_id,
    };

    // Content-Range for chunked upload
    // Format: bytes startByte-endByte/totalSize
    // For non-final: bytes startByte-endByte/*  (we don't know total yet, but Cloudinary needs it)
    // Actually Cloudinary needs the total size for the last chunk
    // We'll estimate: if last chunk, totalSize = endByte + 1, else use -1
    if (isLastChunk) {
      headers['Content-Range'] = `bytes ${startByte}-${endByte}/${endByte + 1}`;
    } else {
      // Use a large estimated total so Cloudinary knows more chunks are coming
      const estimatedTotal = total_chunks * CHUNK_SIZE;
      headers['Content-Range'] = `bytes ${startByte}-${endByte}/${estimatedTotal}`;
    }

    console.log(`Uploading chunk ${chunk_index}/${total_chunks}, range: ${headers['Content-Range']}`);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: 'POST', body: formData, headers }
    );

    const uploadData = await uploadRes.json();

    // For non-final chunks, Cloudinary returns 408 (more chunks expected) or similar
    // For final chunk, it returns 200 with the secure_url
    if (isLastChunk) {
      if (!uploadData.secure_url) {
        console.error('Final chunk upload failed:', JSON.stringify(uploadData));
        return Response.json({ error: 'Cloudinary final upload failed', details: uploadData }, { status: 500 });
      }
      console.log(`Upload complete! URL: ${uploadData.secure_url}`);
      return Response.json({
        success: true,
        done: true,
        chunk_index,
        secure_url: uploadData.secure_url,
        public_id: uploadData.public_id,
      });
    } else {
      // Non-final chunk - Cloudinary may return 408 or 200, both are OK
      console.log(`Chunk ${chunk_index} uploaded, status: ${uploadRes.status}`);
      return Response.json({
        success: true,
        done: false,
        chunk_index,
      });
    }
  } catch (error) {
    console.error('receiveChunk error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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

    console.log(`Assembling ${total_chunks} chunks for session ${session_id}`);

    // Download all chunks and combine
    const chunks = [];
    let totalSize = 0;

    for (let i = 0; i < total_chunks; i++) {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: chunk_uris[i] });
      const response = await fetch(signed_url);
      if (!response.ok) {
        return Response.json({ error: `Failed to download chunk ${i}` }, { status: 500 });
      }
      const buffer = await response.arrayBuffer();
      chunks.push(new Uint8Array(buffer));
      totalSize += buffer.byteLength;
      console.log(`Downloaded chunk ${i}, size: ${buffer.byteLength}`);
    }

    console.log(`Total assembled size: ${totalSize} bytes`);

    // Combine all chunks
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    // Determine mime type
    const ext = (file_name || 'video.mp4').split('.').pop().toLowerCase();
    const mimeTypes = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
    };
    const mimeType = mimeTypes[ext] || 'video/mp4';

    // Upload combined file
    const file = new File([combined], file_name || 'video.mp4', { type: mimeType });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    if (!file_url) {
      return Response.json({ error: 'Upload failed - no URL returned' }, { status: 500 });
    }

    console.log(`Uploaded assembled file: ${file_url}`);

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
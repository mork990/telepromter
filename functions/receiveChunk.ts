import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chunk_base64, session_id, chunk_index, total_chunks } = await req.json();

    if (!chunk_base64 || !session_id || chunk_index === undefined || !total_chunks) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Decode base64 to binary
    const binaryString = atob(chunk_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload chunk as a private file in Base44 storage
    const chunkFile = new File([bytes], `${session_id}_chunk_${chunk_index}.bin`, { type: 'application/octet-stream' });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: chunkFile });

    console.log(`Saved chunk ${chunk_index}/${total_chunks} for session ${session_id}, size: ${bytes.byteLength}, uri: ${file_uri}`);

    return Response.json({ 
      success: true, 
      chunk_index: parseInt(chunk_index),
      size: bytes.byteLength,
      file_uri
    });
  } catch (error) {
    console.error('receiveChunk error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
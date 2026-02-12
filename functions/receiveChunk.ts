import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const chunk = formData.get('chunk');
    const sessionId = formData.get('session_id');
    const chunkIndex = formData.get('chunk_index');
    const totalChunks = formData.get('total_chunks');

    if (!chunk || !sessionId || chunkIndex === null || !totalChunks) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save chunk to /tmp with session_id and index
    const chunkPath = `/tmp/${sessionId}_chunk_${chunkIndex}`;
    const arrayBuffer = await chunk.arrayBuffer();
    await Deno.writeFile(chunkPath, new Uint8Array(arrayBuffer));

    console.log(`Saved chunk ${chunkIndex}/${totalChunks} for session ${sessionId}, size: ${arrayBuffer.byteLength}`);

    return Response.json({ 
      success: true, 
      chunk_index: parseInt(chunkIndex),
      size: arrayBuffer.byteLength
    });
  } catch (error) {
    console.error('receiveChunk error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
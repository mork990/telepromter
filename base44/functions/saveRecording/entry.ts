import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_name, file_size_bytes, duration_seconds } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const recording = await base44.entities.Recording.create({
      title: (file_name || 'video').replace(/\.[^/.]+$/, ''),
      file_url,
      duration_seconds: duration_seconds || undefined,
      file_size_bytes: file_size_bytes || undefined,
    });

    return Response.json({ success: true, recording_id: recording.id });
  } catch (error) {
    console.error('Save recording error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
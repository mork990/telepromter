import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// This function just validates and kicks off the background processor
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const recording_id = body.recording_id;

    if (!recording_id) {
      return Response.json({ error: 'recording_id is required' }, { status: 400 });
    }

    const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY');
    if (!NVIDIA_API_KEY) {
      return Response.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 });
    }

    const recordings = await base44.asServiceRole.entities.Recording.filter({ id: recording_id });
    const recording = recordings[0];
    if (!recording) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    if (recording.eye_contact_status === 'processing') {
      return Response.json({ status: 'already_processing' });
    }

    // Mark as processing
    await base44.asServiceRole.entities.Recording.update(recording_id, {
      eye_contact_status: 'processing',
      eye_contact_error: '',
    });

    // Call the actual processor function (fire and forget via fetch)
    // This runs as a separate Deno isolate with its own timeout
    base44.asServiceRole.functions.invoke('processEyeContact', { recording_id }).catch(err => {
      console.error('Failed to invoke processEyeContact:', err.message);
    });

    return Response.json({ status: 'started', message: 'Eye contact processing started' });

  } catch (error) {
    console.error('fixEyeContact error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
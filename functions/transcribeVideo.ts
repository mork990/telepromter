import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id } = await req.json();
    if (!recording_id) {
      return Response.json({ error: 'recording_id is required' }, { status: 400 });
    }

    // Update status to processing
    await base44.entities.Recording.update(recording_id, { subtitles_status: 'processing' });

    // Fetch the video file
    const recordings = await base44.entities.Recording.filter({ id: recording_id });
    if (!recordings || recordings.length === 0) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }
    const recording = recordings[0];

    // Download the video file
    const videoResponse = await fetch(recording.file_url);
    const videoBlob = await videoResponse.blob();
    const file = new File([videoBlob], 'video.mp4', { type: 'video/mp4' });

    // Transcribe with Whisper - verbose_json gives us timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'he',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    // Convert segments to subtitle format
    const subtitles = (transcription.segments || []).map((seg) => ({
      start: Math.round(seg.start * 100) / 100,
      end: Math.round(seg.end * 100) / 100,
      text: seg.text.trim(),
    }));

    // Save subtitles to recording
    await base44.entities.Recording.update(recording_id, {
      subtitles: subtitles,
      subtitles_status: 'done',
    });

    return Response.json({ success: true, subtitles });
  } catch (error) {
    console.error('Transcription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
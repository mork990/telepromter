import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const videoFile = formData.get('video');
    
    if (!videoFile) {
      return Response.json({ error: 'No video file provided' }, { status: 400 });
    }

    const inputBytes = new Uint8Array(await videoFile.arrayBuffer());
    const inputPath = '/tmp/input.webm';
    const outputPath = '/tmp/output.mp4';

    // Write input file
    await Deno.writeFile(inputPath, inputBytes);

    // Run FFmpeg to convert WebM to MP4
    const cmd = new Deno.Command('ffmpeg', {
      args: [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputPath
      ],
      stdout: 'piped',
      stderr: 'piped'
    });

    const process = await cmd.output();
    
    if (!process.success) {
      const stderr = new TextDecoder().decode(process.stderr);
      console.error('FFmpeg error:', stderr);
      return Response.json({ error: 'Conversion failed', details: stderr }, { status: 500 });
    }

    // Read the output MP4 file
    const mp4Bytes = await Deno.readFile(outputPath);

    // Cleanup temp files
    try {
      await Deno.remove(inputPath);
      await Deno.remove(outputPath);
    } catch (e) {
      // ignore cleanup errors
    }

    return new Response(mp4Bytes, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video_${Date.now()}.mp4"`
      }
    });
  } catch (error) {
    console.error('Convert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
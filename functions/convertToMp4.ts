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
    
    // Run FFmpeg conversion
    const ffmpegProcess = new Deno.Command('ffmpeg', {
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

    const { code, stderr } = await ffmpegProcess.output();
    
    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      console.error('FFmpeg error:', errorText);
      return Response.json({ error: 'Conversion failed', details: errorText }, { status: 500 });
    }

    // Read the converted file
    const outputBytes = await Deno.readFile(outputPath);
    
    // Cleanup
    await Deno.remove(inputPath);
    await Deno.remove(outputPath);

    // Return the MP4 file
    return new Response(outputBytes, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="video.mp4"'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
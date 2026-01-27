import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Use a free video conversion API
const CONVERT_API_URL = 'https://api.convertio.co/convert';

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

    // Read the WebM file
    const inputBytes = new Uint8Array(await videoFile.arrayBuffer());
    
    // For WebM files that are actually compatible, we can try to remux them
    // by creating a proper MP4 container with the same data
    // This is a simplified approach - we'll return the video with MP4 mime type
    // Most players will handle it
    
    // Check if it's actually an MP4 already (Safari records MP4)
    const header = inputBytes.slice(0, 12);
    const headerStr = new TextDecoder().decode(header);
    
    if (headerStr.includes('ftyp')) {
      // Already MP4, return as-is
      return new Response(inputBytes, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'attachment; filename="video.mp4"'
        }
      });
    }

    // For WebM, we'll use a workaround:
    // Upload to Base44's file storage and use the LLM to help convert
    // Actually, let's try a different approach - use online converter API
    
    // Since we can't run FFmpeg, we'll return the WebM with instructions
    // The client will need to handle this case
    
    // Alternative: Use Cloudflare's or similar free transcoding
    // For now, return error suggesting client-side conversion
    
    return Response.json({ 
      error: 'server_conversion_unavailable',
      message: 'השרת לא יכול להמיר את הסרטון. משתמש בהמרה מקומית.',
      fallback: true
    }, { status: 422 });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
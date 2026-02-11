import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v2 as cloudinary } from 'npm:cloudinary@2.5.1';

cloudinary.config({
  cloud_name: Deno.env.get("CLOUDINARY_CLOUD_NAME"),
  api_key: Deno.env.get("CLOUDINARY_API_KEY"),
  api_secret: Deno.env.get("CLOUDINARY_API_SECRET"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, video_url, params } = await req.json();

    if (!action || !video_url) {
      return Response.json({ error: 'Missing action or video_url' }, { status: 400 });
    }

    // Upload video to Cloudinary first
    const uploadResult = await cloudinary.uploader.upload(video_url, {
      resource_type: 'video',
      folder: 'video-editor',
    });

    const publicId = uploadResult.public_id;
    let transformations = [];

    switch (action) {
      case 'trim': {
        // Trim video: params.start_offset, params.end_offset (in seconds)
        const startOffset = params?.start_offset || 0;
        const endOffset = params?.end_offset;
        if (endOffset) {
          transformations.push({ start_offset: startOffset, end_offset: endOffset });
        } else if (params?.duration) {
          transformations.push({ start_offset: startOffset, duration: params.duration });
        }
        break;
      }

      case 'cut': {
        // Cut a segment out: params.cut_start, params.cut_end (in seconds)
        // This creates a video with the segment removed by concatenating before and after
        const cutStart = params?.cut_start || 0;
        const cutEnd = params?.cut_end;
        if (!cutEnd) {
          return Response.json({ error: 'cut_end is required for cut action' }, { status: 400 });
        }
        // Get part before cut
        transformations.push({ start_offset: 0, end_offset: cutStart });
        // We'll use splice for concatenation
        transformations.push({ 
          overlay: `video:${publicId.replace(/\//g, ':')}`,
          start_offset: cutEnd,
          flags: 'splice'
        });
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      case 'add_subtitles': {
        // Add subtitles overlay: params.subtitles (array of {start, end, text})
        const subtitles = params?.subtitles || [];
        if (subtitles.length === 0) {
          return Response.json({ error: 'No subtitles provided' }, { status: 400 });
        }
        
        // Generate SRT content
        let srtContent = '';
        subtitles.forEach((sub, i) => {
          const startTime = formatSrtTime(sub.start);
          const endTime = formatSrtTime(sub.end);
          srtContent += `${i + 1}\n${startTime} --> ${endTime}\n${sub.text}\n\n`;
        });

        // Upload SRT as raw file
        const srtUpload = await cloudinary.uploader.upload(
          `data:text/plain;base64,${btoa(unescape(encodeURIComponent(srtContent)))}`,
          { resource_type: 'raw', folder: 'video-editor/subtitles', format: 'srt' }
        );

        const srtPublicId = srtUpload.public_id;
        const fontSize = params?.font_size || 28;
        const fontColor = params?.font_color || 'white';

        transformations.push({
          overlay: { resource_type: 'subtitles', public_id: srtPublicId },
          gravity: 'south',
          y: 40,
          font_size: fontSize,
          color: fontColor
        });
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Generate the transformed video URL
    const resultUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: transformations,
      format: 'mp4',
    });

    // Use eager transformation to actually process the video
    const eagerResult = await cloudinary.uploader.explicit(publicId, {
      resource_type: 'video',
      type: 'upload',
      eager: transformations.length > 0 ? [transformations] : undefined,
      eager_async: false,
    });

    const processedUrl = eagerResult.eager?.[0]?.secure_url || resultUrl;

    return Response.json({
      success: true,
      original_url: uploadResult.secure_url,
      processed_url: processedUrl,
      public_id: publicId,
    });

  } catch (error) {
    console.error('Cloudinary edit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function formatSrtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function pad3(n) {
  return String(n).padStart(3, '0');
}
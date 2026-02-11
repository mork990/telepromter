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
    let outputFormat = 'mp4';

    switch (action) {
      case 'trim': {
        // params: start_offset, end_offset (or duration) in seconds
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
        // params: cut_start, cut_end in seconds - removes that segment
        const cutStart = params?.cut_start || 0;
        const cutEnd = params?.cut_end;
        if (!cutEnd) {
          return Response.json({ error: 'cut_end is required for cut action' }, { status: 400 });
        }
        transformations.push({ start_offset: 0, end_offset: cutStart });
        transformations.push({ 
          overlay: `video:${publicId.replace(/\//g, ':')}`,
          start_offset: cutEnd,
          flags: 'splice'
        });
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      case 'add_subtitles': {
        // params: subtitles (array of {start, end, text}), font_size, font_color
        const subtitles = params?.subtitles || [];
        if (subtitles.length === 0) {
          return Response.json({ error: 'No subtitles provided' }, { status: 400 });
        }
        let srtContent = '';
        subtitles.forEach((sub, i) => {
          srtContent += `${i + 1}\n${formatSrtTime(sub.start)} --> ${formatSrtTime(sub.end)}\n${sub.text}\n\n`;
        });
        const srtUpload = await cloudinary.uploader.upload(
          `data:text/plain;base64,${btoa(unescape(encodeURIComponent(srtContent)))}`,
          { resource_type: 'raw', folder: 'video-editor/subtitles', format: 'srt' }
        );
        transformations.push({
          overlay: { resource_type: 'subtitles', public_id: srtUpload.public_id },
          gravity: 'south', y: 40,
          font_size: params?.font_size || 28,
          color: params?.font_color || 'white'
        });
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      case 'speed': {
        // params: rate (e.g. 0.5 for half speed, 2 for double speed)
        const rate = params?.rate || 1;
        transformations.push({ effect: `accelerate:${Math.round((rate - 1) * 100)}` });
        break;
      }

      case 'resize': {
        // params: width, height, crop (scale/fill/fit/crop)
        const t = {};
        if (params?.width) t.width = params.width;
        if (params?.height) t.height = params.height;
        t.crop = params?.crop || 'scale';
        transformations.push(t);
        break;
      }

      case 'crop_area': {
        // params: width, height, x, y, gravity
        transformations.push({
          crop: 'crop',
          width: params?.width,
          height: params?.height,
          x: params?.x || 0,
          y: params?.y || 0,
          gravity: params?.gravity || 'north_west'
        });
        break;
      }

      case 'rotate': {
        // params: angle (90, 180, 270, or any degree)
        transformations.push({ angle: params?.angle || 90 });
        break;
      }

      case 'flip': {
        // params: direction ('horizontal' or 'vertical')
        if (params?.direction === 'horizontal') {
          transformations.push({ angle: 'hflip' });
        } else {
          transformations.push({ angle: 'vflip' });
        }
        break;
      }

      case 'filter': {
        // params: effect (grayscale, sepia, brightness, contrast, saturation, blur, pixelate)
        //         value (intensity, optional)
        const effect = params?.effect;
        const value = params?.value;
        if (!effect) {
          return Response.json({ error: 'effect is required for filter action' }, { status: 400 });
        }
        switch (effect) {
          case 'grayscale':
            transformations.push({ effect: 'grayscale' });
            break;
          case 'sepia':
            transformations.push({ effect: `sepia:${value || 80}` });
            break;
          case 'brightness':
            transformations.push({ effect: `brightness:${value || 20}` });
            break;
          case 'contrast':
            transformations.push({ effect: `contrast:${value || 20}` });
            break;
          case 'saturation':
            transformations.push({ effect: `saturation:${value || 20}` });
            break;
          case 'blur':
            transformations.push({ effect: `blur:${value || 500}` });
            break;
          case 'pixelate':
            transformations.push({ effect: `pixelate:${value || 10}` });
            break;
          default:
            transformations.push({ effect: `${effect}${value ? ':' + value : ''}` });
        }
        break;
      }

      case 'add_text': {
        // params: text, font_size, font_color, gravity, x, y, font_family
        const text = params?.text;
        if (!text) {
          return Response.json({ error: 'text is required for add_text action' }, { status: 400 });
        }
        transformations.push({
          overlay: {
            font_family: params?.font_family || 'Arial',
            font_size: params?.font_size || 40,
            text: text
          },
          color: params?.font_color || 'white',
          gravity: params?.gravity || 'south',
          y: params?.y || 40,
          x: params?.x || 0
        });
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      case 'add_image_overlay': {
        // params: image_url, gravity, width, height, x, y, opacity
        const imageUrl = params?.image_url;
        if (!imageUrl) {
          return Response.json({ error: 'image_url is required' }, { status: 400 });
        }
        // Upload image overlay first
        const imgUpload = await cloudinary.uploader.upload(imageUrl, {
          folder: 'video-editor/overlays',
        });
        const t = {
          overlay: imgUpload.public_id.replace(/\//g, ':'),
          gravity: params?.gravity || 'north_east',
        };
        if (params?.width) t.width = params.width;
        if (params?.height) t.height = params.height;
        if (params?.x) t.x = params.x;
        if (params?.y) t.y = params.y;
        if (params?.opacity) t.opacity = params.opacity;
        transformations.push(t);
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      case 'remove_audio': {
        // No params needed
        transformations.push({ effect: 'volume:mute' });
        break;
      }

      case 'volume': {
        // params: level (0-200, 100=normal, 0=mute, 200=double)
        const level = params?.level ?? 100;
        transformations.push({ effect: `volume:${level}` });
        break;
      }

      case 'replace_audio': {
        // params: audio_url
        const audioUrl = params?.audio_url;
        if (!audioUrl) {
          return Response.json({ error: 'audio_url is required' }, { status: 400 });
        }
        const audioUpload = await cloudinary.uploader.upload(audioUrl, {
          resource_type: 'video',
          folder: 'video-editor/audio',
        });
        transformations.push({ effect: 'volume:mute' });
        transformations.push({
          overlay: `video:${audioUpload.public_id.replace(/\//g, ':')}`,
          flags: 'no_overflow'
        });
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      case 'to_gif': {
        // params: start_offset, end_offset (optional), fps (optional)
        if (params?.start_offset !== undefined) {
          transformations.push({ start_offset: params.start_offset });
        }
        if (params?.end_offset !== undefined) {
          transformations.push({ end_offset: params.end_offset });
        }
        if (params?.fps) {
          transformations.push({ effect: `fps:${params.fps}` });
        }
        // Override format to gif
        outputFormat = 'gif';
        break;
      }

      case 'concatenate': {
        // params: video_urls (array of video URLs to append)
        const videoUrls = params?.video_urls || [];
        if (videoUrls.length === 0) {
          return Response.json({ error: 'video_urls array is required' }, { status: 400 });
        }
        for (const url of videoUrls) {
          const vidUpload = await cloudinary.uploader.upload(url, {
            resource_type: 'video',
            folder: 'video-editor',
          });
          transformations.push({
            overlay: `video:${vidUpload.public_id.replace(/\//g, ':')}`,
            flags: 'splice'
          });
          transformations.push({ flags: 'layer_apply' });
        }
        break;
      }

      case 'transition': {
        // params: video_url (next video), effect (fade, wipe, etc.), duration
        const nextVideoUrl = params?.video_url;
        if (!nextVideoUrl) {
          return Response.json({ error: 'video_url is required for transition' }, { status: 400 });
        }
        const nextUpload = await cloudinary.uploader.upload(nextVideoUrl, {
          resource_type: 'video',
          folder: 'video-editor',
        });
        transformations.push({
          overlay: `video:${nextUpload.public_id.replace(/\//g, ':')}`,
          flags: 'splice',
          effect: `transition:${params?.effect || 'fade'}`,
          duration: params?.duration || 1
        });
        transformations.push({ flags: 'layer_apply' });
        break;
      }

      case 'extract_frame': {
        // params: time (seconds) - extract a single frame as image
        transformations.push({ start_offset: params?.time || 0 });
        outputFormat = 'jpg';
        break;
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Generate the transformed video URL
    const resultUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: transformations,
      format: outputFormat,
    });

    // Use eager transformation to actually process the video
    const eagerResult = await cloudinary.uploader.explicit(publicId, {
      resource_type: 'video',
      type: 'upload',
      eager: transformations.length > 0 ? [{ ...Object.assign({}, ...transformations), format: outputFormat }] : undefined,
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
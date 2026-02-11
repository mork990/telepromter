import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { v2 as cloudinary } from 'npm:cloudinary@2.5.1';

cloudinary.config({
  cloud_name: (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim(),
  api_key: (Deno.env.get("CLOUDINARY_API_KEY") || "").trim(),
  api_secret: (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim(),
});

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

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file_url, {
      resource_type: 'video',
      folder: 'video-uploads',
      timeout: 600000, // 10 min timeout
    });

    const cloudinaryUrl = uploadResult.secure_url;
    const cloudinaryDuration = Math.round(uploadResult.duration || 0);

    // Create recording entity
    const recording = await base44.entities.Recording.create({
      title: (file_name || 'video').replace(/\.[^/.]+$/, ''),
      file_url: cloudinaryUrl,
      duration_seconds: duration_seconds || cloudinaryDuration || undefined,
      file_size_bytes: file_size_bytes || uploadResult.bytes || undefined,
    });

    return Response.json({
      success: true,
      recording_id: recording.id,
      file_url: cloudinaryUrl,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cloudName = (Deno.env.get("CLOUDINARY_CLOUD_NAME") || "").trim();
    const apiKey = (Deno.env.get("CLOUDINARY_API_KEY") || "").trim();
    const apiSecret = (Deno.env.get("CLOUDINARY_API_SECRET") || "").trim();

    // Check if preset already exists by trying to get it
    const presetName = 'base44_video_unsigned';
    
    // Try to create the unsigned upload preset
    const authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);
    
    // First try to get existing preset
    const getRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/upload_presets/${presetName}`,
      { headers: { 'Authorization': authHeader } }
    );

    if (getRes.ok) {
      // Preset already exists
      return Response.json({ 
        success: true, 
        preset_name: presetName, 
        cloud_name: cloudName,
        message: 'Preset already exists' 
      });
    }

    // Create new unsigned preset
    const createRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/upload_presets`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: presetName,
          unsigned: true,
          folder: 'video-uploads',
        }),
      }
    );

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error('Create preset error:', JSON.stringify(createData));
      return Response.json({ error: createData?.error?.message || 'Failed to create preset' }, { status: 500 });
    }

    return Response.json({
      success: true,
      preset_name: presetName,
      cloud_name: cloudName,
    });
  } catch (error) {
    console.error('Preset error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
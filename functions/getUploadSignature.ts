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

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'video-uploads';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      Deno.env.get("CLOUDINARY_API_SECRET").trim()
    );

    return Response.json({
      signature,
      timestamp,
      folder,
      cloud_name: Deno.env.get("CLOUDINARY_CLOUD_NAME").trim(),
      api_key: Deno.env.get("CLOUDINARY_API_KEY").trim(),
    });
  } catch (error) {
    console.error('Signature error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
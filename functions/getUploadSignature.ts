import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

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

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'video-uploads';

    // Generate signature: folder + resource_type + timestamp + api_secret
    const toSign = `folder=${folder}&resource_type=video&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    return Response.json({
      signature,
      timestamp,
      folder,
      cloud_name: cloudName,
      api_key: apiKey,
      resource_type: 'video',
    });
  } catch (error) {
    console.error('Signature error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
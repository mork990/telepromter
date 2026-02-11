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

    // Generate signature: folder + timestamp + api_secret (alphabetical order of params)
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    return Response.json({
      signature,
      timestamp,
      folder,
      cloud_name: cloudName,
      api_key: apiKey,
    });
  } catch (error) {
    console.error('Signature error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
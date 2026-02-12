import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const NVIDIA_FUNCTION_ID = 'b75dbca7-b5a4-458c-9275-6d2effeb432a';
const NVCF_INVOKE_URL = `https://api.nvcf.nvidia.com/v2/nvcf/exec/functions/${NVIDIA_FUNCTION_ID}`;
const NVCF_STATUS_URL = `https://api.nvcf.nvidia.com/v2/nvcf/pex/status/`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('User authenticated:', user.email);
  } catch (e) {
    console.error('Auth error:', e.message);
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const recording_id = body.recording_id;
    console.log('recording_id:', recording_id);

    if (!recording_id) {
      return Response.json({ error: 'recording_id is required' }, { status: 400 });
    }

    const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY');
    if (!NVIDIA_API_KEY) {
      return Response.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 });
    }
    console.log('NVIDIA_API_KEY present, length:', NVIDIA_API_KEY.length);

    // Get the recording
    const recordings = await base44.asServiceRole.entities.Recording.filter({ id: recording_id });
    console.log('Recordings found:', recordings.length);
    const recording = recordings[0];
    if (!recording) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Get a publicly accessible URL for the video
    let videoUrl = recording.file_url;
    console.log('Original video URL:', videoUrl?.substring(0, 100));

    if (videoUrl && videoUrl.startsWith('https://storage.googleapis.com/')) {
      try {
        const signedRes = await base44.functions.invoke('getSignedGcsUrl', { file_url: videoUrl });
        console.log('Signed URL response keys:', Object.keys(signedRes || {}));
        if (signedRes?.data?.signed_url) {
          videoUrl = signedRes.data.signed_url;
        } else if (signedRes?.signed_url) {
          videoUrl = signedRes.signed_url;
        }
      } catch (e) {
        console.error('Error getting signed URL:', e.message);
        // Continue with original URL
      }
    }

    console.log('Final video URL length:', videoUrl?.length);

    // Call NVIDIA NVCF invoke endpoint
    const invokeResponse = await fetch(NVCF_INVOKE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        requestBody: {
          video_url: videoUrl,
          gaze_angle: 0,
          strength: 1.0,
        }
      }),
    });

    console.log('NVIDIA response status:', invokeResponse.status);

    // NVCF may return 200 (completed) or 202 (accepted, needs polling)
    if (invokeResponse.status === 202) {
      const requestId = invokeResponse.headers.get('NVCF-REQID');
      console.log('NVIDIA request ID:', requestId);
      if (!requestId) {
        return Response.json({ error: 'No request ID returned from NVIDIA' }, { status: 500 });
      }

      // Poll for completion
      let result = null;
      const maxAttempts = 120;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000));

        const statusResponse = await fetch(`${NVCF_STATUS_URL}${requestId}`, {
          headers: {
            'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            'Accept': 'application/json',
          },
        });

        console.log(`Poll attempt ${i + 1}: status ${statusResponse.status}`);

        if (statusResponse.status === 200) {
          const contentType = statusResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            result = await statusResponse.json();
          } else {
            const videoBytes = await statusResponse.arrayBuffer();
            const blob = new Blob([videoBytes], { type: 'video/mp4' });
            const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
            return Response.json({
              success: true,
              file_url: uploadResult.file_url,
              message: 'Eye contact fixed successfully',
            });
          }
          break;
        } else if (statusResponse.status === 202) {
          continue;
        } else {
          const errorText = await statusResponse.text();
          return Response.json({ error: `NVIDIA status check failed: ${errorText}` }, { status: 500 });
        }
      }

      if (!result) {
        return Response.json({ error: 'Processing timed out' }, { status: 504 });
      }

      return Response.json({ success: true, result });

    } else if (invokeResponse.status === 200) {
      const contentType = invokeResponse.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const result = await invokeResponse.json();
        return Response.json({ success: true, result });
      } else {
        const videoBytes = await invokeResponse.arrayBuffer();
        const blob = new Blob([videoBytes], { type: 'video/mp4' });
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
        return Response.json({
          success: true,
          file_url: uploadResult.file_url,
          message: 'Eye contact fixed successfully',
        });
      }
    } else {
      const errorText = await invokeResponse.text();
      console.error('NVIDIA API error:', invokeResponse.status, errorText);
      return Response.json({ 
        error: `NVIDIA API error (${invokeResponse.status}): ${errorText}` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('fixEyeContact error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const NVIDIA_FUNCTION_ID = 'b75dbca7-b5a4-458c-9275-6d2effeb432a';
const NVCF_INVOKE_URL = `https://api.nvcf.nvidia.com/v2/nvcf/pex/functions/${NVIDIA_FUNCTION_ID}/invoke`;
const NVCF_STATUS_URL = `https://api.nvcf.nvidia.com/v2/nvcf/pex/status/`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id } = await req.json();
    if (!recording_id) {
      return Response.json({ error: 'recording_id is required' }, { status: 400 });
    }

    const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY');
    if (!NVIDIA_API_KEY) {
      return Response.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 });
    }

    let recording;
    try {
      recording = await base44.asServiceRole.entities.Recording.get(recording_id);
      console.log('Recording found:', recording?.id, 'file_url:', recording?.file_url?.substring(0, 80));
    } catch (e) {
      console.error('Error getting recording:', e.message);
      return Response.json({ error: 'Recording not found: ' + e.message }, { status: 404 });
    }

    // Get a signed URL if it's a GCS file
    let videoUrl = recording.file_url;
    if (videoUrl.startsWith('https://storage.googleapis.com/')) {
      const signedRes = await base44.functions.invoke('getSignedGcsUrl', { file_url: videoUrl });
      if (signedRes?.data?.signed_url) {
        videoUrl = signedRes.data.signed_url;
      } else if (signedRes?.signed_url) {
        videoUrl = signedRes.signed_url;
      }
    }

    console.log('Calling NVIDIA NVCF with video URL length:', videoUrl.length);

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

    // NVCF may return 200 (completed) or 202 (accepted, needs polling)
    if (invokeResponse.status === 202) {
      const requestId = invokeResponse.headers.get('NVCF-REQID');
      if (!requestId) {
        return Response.json({ error: 'No request ID returned from NVIDIA' }, { status: 500 });
      }

      // Poll for completion
      let result = null;
      const maxAttempts = 120; // 10 minutes max (5s intervals)
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000));

        const statusResponse = await fetch(`${NVCF_STATUS_URL}${requestId}`, {
          headers: {
            'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            'Accept': 'application/json',
          },
        });

        if (statusResponse.status === 200) {
          const contentType = statusResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            result = await statusResponse.json();
          } else {
            // Binary response - the processed video
            const videoBytes = await statusResponse.arrayBuffer();
            // Upload the processed video
            const blob = new Blob([videoBytes], { type: 'video/mp4' });
            const uploadResult = await base44.integrations.Core.UploadFile({ file: blob });
            
            return Response.json({
              success: true,
              file_url: uploadResult.file_url,
              message: 'Eye contact fixed successfully',
            });
          }
          break;
        } else if (statusResponse.status === 202) {
          // Still processing, continue polling
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
        // Binary video response
        const videoBytes = await invokeResponse.arrayBuffer();
        const blob = new Blob([videoBytes], { type: 'video/mp4' });
        const uploadResult = await base44.integrations.Core.UploadFile({ file: blob });
        
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
      }, { status: invokeResponse.status });
    }

  } catch (error) {
    console.error('fixEyeContact error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as grpc from 'npm:@grpc/grpc-js@1.12.5';
import protobuf from 'npm:protobufjs@7.4.0';
import { Buffer } from 'node:buffer';
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}


const NVIDIA_FUNCTION_ID = 'b75dbca7-b5a4-458c-9275-6d2effeb432a';
const GRPC_TARGET = 'grpc.nvcf.nvidia.com:443';
const DATA_CHUNK_SIZE = 64 * 1024; // 64KB chunks per gRPC message

// Build proto definitions programmatically (no file system needed)
function buildProtoDefinitions() {
  const root = new protobuf.Root();

  // LossyEncoding
  const LossyEncoding = new protobuf.Type("LossyEncoding")
    .add(new protobuf.Field("bitrate", 1, "uint32", "optional"))
    .add(new protobuf.Field("idr_interval", 2, "uint32", "optional"));

  // OutputVideoEncoding
  const OutputVideoEncoding = new protobuf.Type("OutputVideoEncoding")
    .add(new protobuf.Field("lossless", 1, "bool", "optional"))
    .add(new protobuf.Field("lossy", 2, "LossyEncoding", "optional"));

  // RedirectGazeConfig
  const RedirectGazeConfig = new protobuf.Type("RedirectGazeConfig")
    .add(new protobuf.Field("temporal", 1, "uint32", "optional"))
    .add(new protobuf.Field("detect_closure", 2, "uint32", "optional"))
    .add(new protobuf.Field("eye_size_sensitivity", 3, "uint32", "optional"))
    .add(new protobuf.Field("enable_lookaway", 4, "uint32", "optional"))
    .add(new protobuf.Field("lookaway_max_offset", 5, "uint32", "optional"))
    .add(new protobuf.Field("lookaway_interval_min", 6, "uint32", "optional"))
    .add(new protobuf.Field("lookaway_interval_range", 7, "uint32", "optional"))
    .add(new protobuf.Field("gaze_pitch_threshold_low", 8, "float", "optional"))
    .add(new protobuf.Field("gaze_pitch_threshold_high", 9, "float", "optional"))
    .add(new protobuf.Field("gaze_yaw_threshold_low", 10, "float", "optional"))
    .add(new protobuf.Field("gaze_yaw_threshold_high", 11, "float", "optional"))
    .add(new protobuf.Field("head_pitch_threshold_low", 12, "float", "optional"))
    .add(new protobuf.Field("head_pitch_threshold_high", 13, "float", "optional"))
    .add(new protobuf.Field("head_yaw_threshold_low", 14, "float", "optional"))
    .add(new protobuf.Field("head_yaw_threshold_high", 15, "float", "optional"))
    .add(new protobuf.Field("output_video_encoding", 16, "OutputVideoEncoding", "optional"));

  // RedirectGazeRequest (oneof stream_input)
  const RedirectGazeRequest = new protobuf.Type("RedirectGazeRequest")
    .add(new protobuf.Field("config", 1, "RedirectGazeConfig", "optional"))
    .add(new protobuf.Field("video_file_data", 2, "bytes", "optional"))
    .add(new protobuf.OneOf("stream_input", ["config", "video_file_data"]));

  // RedirectGazeResponse (oneof stream_output)
  const RedirectGazeResponse = new protobuf.Type("RedirectGazeResponse")
    .add(new protobuf.Field("config", 1, "RedirectGazeConfig", "optional"))
    .add(new protobuf.Field("video_file_data", 2, "bytes", "optional"))
    .add(new protobuf.Field("keepalive", 3, "bytes", "optional"))
    .add(new protobuf.OneOf("stream_output", ["config", "video_file_data", "keepalive"]));

  // Add all types to root so they can reference each other
  root.add(LossyEncoding);
  root.add(OutputVideoEncoding);
  root.add(RedirectGazeConfig);
  root.add(RedirectGazeRequest);
  root.add(RedirectGazeResponse);

  return {
    root,
    RedirectGazeRequest,
    RedirectGazeResponse,
    RedirectGazeConfig,
  };
}

// Create a gRPC service client from protobufjs definitions
function createGrpcServiceClient(proto) {
  const { RedirectGazeRequest, RedirectGazeResponse } = proto;

  // Build gRPC service definition manually
  const serviceDefinition = {
    RedirectGaze: {
      path: '/nvidia.maxine.eyecontact.v1.MaxineEyeContactService/RedirectGaze',
      requestStream: true,
      responseStream: true,
      requestSerialize: (msg) => {
        const encoded = RedirectGazeRequest.encode(RedirectGazeRequest.create(msg)).finish();
        return new Uint8Array(encoded);
      },
      requestDeserialize: (buf) => RedirectGazeRequest.decode(new Uint8Array(buf)),
      responseSerialize: (msg) => {
        const encoded = RedirectGazeResponse.encode(RedirectGazeResponse.create(msg)).finish();
        return new Uint8Array(encoded);
      },
      responseDeserialize: (buf) => RedirectGazeResponse.decode(new Uint8Array(buf)),
    }
  };

  const ServiceClient = grpc.makeClientConstructor(serviceDefinition, 'MaxineEyeContactService');
  return ServiceClient;
}

async function downloadVideo(url) {
  console.log('Downloading video from:', url.substring(0, 80));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  console.log('Downloaded video size:', arrayBuffer.byteLength, 'bytes');
  return new Uint8Array(arrayBuffer);
}

function processEyeContact(ServiceClient, apiKey, videoData) {
  return new Promise((resolve, reject) => {
    const credentials = grpc.credentials.createSsl();
    const client = new ServiceClient(GRPC_TARGET, credentials);

    const metadata = new grpc.Metadata();
    metadata.add('authorization', `Bearer ${apiKey}`);
    metadata.add('function-id', NVIDIA_FUNCTION_ID);

    const call = client.RedirectGaze(metadata);

    const outputChunks = [];
    let receivedConfig = false;
    let chunkCount = 0;

    call.on('data', (response) => {
      if (response.stream_output === 'config' && !receivedConfig) {
        receivedConfig = true;
        console.log('Received config echo from server');
        return;
      }
      if (response.stream_output === 'keepalive') {
        console.log('Received keepalive');
        return;
      }
      if (response.stream_output === 'video_file_data' && response.video_file_data) {
        chunkCount++;
        outputChunks.push(response.video_file_data);
        if (chunkCount % 50 === 0) {
          console.log(`Received ${chunkCount} output chunks...`);
        }
      }
    });

    call.on('end', () => {
      console.log(`Stream ended. Total output chunks: ${chunkCount}`);
      if (outputChunks.length === 0) {
        reject(new Error('No video data received from NVIDIA'));
        return;
      }
      // Combine all chunks
      const totalLength = outputChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of outputChunks) {
        result.set(new Uint8Array(chunk.buffer || chunk), offset);
        offset += chunk.length;
      }
      console.log('Total output size:', totalLength, 'bytes');
      resolve(result);
    });

    call.on('error', (err) => {
      console.error('gRPC error:', err.code, err.details || err.message);
      reject(err);
    });

    // Send config first
    console.log('Sending config...');
    call.write({
      config: {
        eye_size_sensitivity: 3,
        detect_closure: 0,
        output_video_encoding: {
          lossy: {
            bitrate: 3000000,
            idr_interval: 8,
          }
        }
      }
    });

    // Send video data in chunks
    const totalChunks = Math.ceil(videoData.length / DATA_CHUNK_SIZE);
    console.log(`Sending ${totalChunks} video chunks (${videoData.length} bytes)...`);

    let sentChunks = 0;
    for (let i = 0; i < videoData.length; i += DATA_CHUNK_SIZE) {
      const chunk = videoData.slice(i, i + DATA_CHUNK_SIZE);
      call.write({ video_file_data: chunk });
      sentChunks++;
      if (sentChunks % 50 === 0) {
        console.log(`Sent ${sentChunks}/${totalChunks} chunks...`);
      }
    }

    console.log('All chunks sent, ending write stream...');
    call.end();
  });
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('User authenticated:', user.email);

    const body = await req.json();
    const recording_id = body.recording_id;
    console.log('recording_id (v2-grpc):', recording_id);

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

    if (videoUrl && videoUrl.includes('storage.googleapis.com')) {
      try {
        const signedRes = await base44.functions.invoke('getSignedGcsUrl', { file_url: videoUrl });
        if (signedRes?.data?.signed_url) {
          videoUrl = signedRes.data.signed_url;
        } else if (signedRes?.signed_url) {
          videoUrl = signedRes.signed_url;
        }
      } catch (e) {
        console.error('Error getting signed URL:', e.message);
      }
    }

    // Download the video file
    const videoData = await downloadVideo(videoUrl);

    // Build gRPC client from protobufjs definitions
    // Build gRPC client
    console.log('Building gRPC client...');
    const proto = buildProtoDefinitions();
    const ServiceClient = createGrpcServiceClient(proto);
    console.log('gRPC client ready, starting eye contact processing...');

    // Process via gRPC
    const outputData = await processEyeContact(ServiceClient, NVIDIA_API_KEY, videoData);

    // Upload the result
    console.log('Uploading processed video...');
    const blob = new Blob([outputData], { type: 'video/mp4' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
    console.log('Upload complete:', uploadResult.file_url?.substring(0, 80));

    return Response.json({
      success: true,
      file_url: uploadResult.file_url,
      message: 'Eye contact fixed successfully',
    });

  } catch (error) {
    console.error('fixEyeContact error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
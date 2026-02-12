import { Buffer } from 'node:buffer';
globalThis.Buffer = globalThis.Buffer || Buffer;

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as grpc from 'npm:@grpc/grpc-js@1.12.5';
import protobuf from 'npm:protobufjs@7.4.0';

const NVIDIA_FUNCTION_ID = 'b75dbca7-b5a4-458c-9275-6d2effeb432a';
const GRPC_TARGET = 'grpc.nvcf.nvidia.com:443';
const DATA_CHUNK_SIZE = 64 * 1024;

function buildProtoDefinitions() {
  const root = new protobuf.Root();

  const LossyEncoding = new protobuf.Type("LossyEncoding")
    .add(new protobuf.Field("bitrate", 1, "uint32", "optional"))
    .add(new protobuf.Field("idr_interval", 2, "uint32", "optional"));

  const OutputVideoEncoding = new protobuf.Type("OutputVideoEncoding")
    .add(new protobuf.Field("lossless", 1, "bool", "optional"))
    .add(new protobuf.Field("lossy", 2, "LossyEncoding", "optional"));

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

  const RedirectGazeRequest = new protobuf.Type("RedirectGazeRequest")
    .add(new protobuf.Field("config", 1, "RedirectGazeConfig", "optional"))
    .add(new protobuf.Field("video_file_data", 2, "bytes", "optional"))
    .add(new protobuf.OneOf("stream_input", ["config", "video_file_data"]));

  const RedirectGazeResponse = new protobuf.Type("RedirectGazeResponse")
    .add(new protobuf.Field("config", 1, "RedirectGazeConfig", "optional"))
    .add(new protobuf.Field("video_file_data", 2, "bytes", "optional"))
    .add(new protobuf.Field("keepalive", 3, "bytes", "optional"))
    .add(new protobuf.OneOf("stream_output", ["config", "video_file_data", "keepalive"]));

  root.add(LossyEncoding);
  root.add(OutputVideoEncoding);
  root.add(RedirectGazeConfig);
  root.add(RedirectGazeRequest);
  root.add(RedirectGazeResponse);

  return { root, RedirectGazeRequest, RedirectGazeResponse, RedirectGazeConfig };
}

function createGrpcServiceClient(proto) {
  const { RedirectGazeRequest, RedirectGazeResponse } = proto;

  const serviceDefinition = {
    RedirectGaze: {
      path: '/nvidia.maxine.eyecontact.v1.MaxineEyeContactService/RedirectGaze',
      requestStream: true,
      responseStream: true,
      requestSerialize: (msg) => {
        const encoded = RedirectGazeRequest.encode(RedirectGazeRequest.create(msg)).finish();
        return Buffer.from(encoded);
      },
      requestDeserialize: (buf) => RedirectGazeRequest.decode(new Uint8Array(buf)),
      responseSerialize: (msg) => {
        const encoded = RedirectGazeResponse.encode(RedirectGazeResponse.create(msg)).finish();
        return Buffer.from(encoded);
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
  if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
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
        return;
      }
      if (response.stream_output === 'keepalive') return;
      if (response.stream_output === 'video_file_data' && response.video_file_data) {
        chunkCount++;
        outputChunks.push(response.video_file_data);
      }
    });

    call.on('end', () => {
      console.log(`Stream ended. Total output chunks: ${chunkCount}`);
      if (outputChunks.length === 0) {
        reject(new Error('No video data received from NVIDIA'));
        return;
      }
      // Convert all chunks to Uint8Array first
      const uint8Chunks = outputChunks.map(chunk => {
        if (chunk instanceof Uint8Array) return chunk;
        if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
        if (Buffer.isBuffer(chunk)) return new Uint8Array(chunk);
        // protobufjs may return a Buffer with byteOffset
        if (chunk.buffer && chunk.byteOffset !== undefined) {
          return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        }
        return new Uint8Array(chunk);
      });
      const totalLength = uint8Chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
      console.log('Total output size:', totalLength, 'bytes');
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of uint8Chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(result);
    });

    call.on('error', (err) => {
      console.error('gRPC error:', err.code, err.details || err.message);
      reject(err);
    });

    call.write({
      config: {
        eye_size_sensitivity: 3,
        detect_closure: 0,
        output_video_encoding: { lossy: { bitrate: 3000000, idr_interval: 8 } }
      }
    });

    for (let i = 0; i < videoData.length; i += DATA_CHUNK_SIZE) {
      call.write({ video_file_data: videoData.slice(i, i + DATA_CHUNK_SIZE) });
    }
    call.end();
  });
}

// The actual long-running processing - runs in background
async function runProcessing(base44, recording_id, videoUrl) {
  try {
    console.log('Background processing started for:', recording_id);

    // Mark as processing
    await base44.asServiceRole.entities.Recording.update(recording_id, {
      eye_contact_status: 'processing',
      eye_contact_error: '',
    });

    const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY');
    const videoData = await downloadVideo(videoUrl);

    const proto = buildProtoDefinitions();
    const ServiceClient = createGrpcServiceClient(proto);
    const outputData = await processEyeContact(ServiceClient, NVIDIA_API_KEY, videoData);

    console.log('Uploading processed video...');
    const blob = new Blob([outputData], { type: 'video/mp4' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
    console.log('Upload complete:', uploadResult.file_url?.substring(0, 80));

    await base44.asServiceRole.entities.Recording.update(recording_id, {
      eye_contact_status: 'done',
      eye_contact_url: uploadResult.file_url,
      eye_contact_error: '',
    });
    console.log('Background processing completed successfully');
  } catch (error) {
    console.error('Background processing failed:', error.message);
    try {
      await base44.asServiceRole.entities.Recording.update(recording_id, {
        eye_contact_status: 'error',
        eye_contact_error: error.message || 'Unknown error',
      });
    } catch (e2) {
      console.error('Failed to update error status:', e2.message);
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const recording_id = body.recording_id;

    if (!recording_id) {
      return Response.json({ error: 'recording_id is required' }, { status: 400 });
    }

    const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY');
    if (!NVIDIA_API_KEY) {
      return Response.json({ error: 'NVIDIA_API_KEY not configured' }, { status: 500 });
    }

    const recordings = await base44.asServiceRole.entities.Recording.filter({ id: recording_id });
    const recording = recordings[0];
    if (!recording) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Check if already processing
    if (recording.eye_contact_status === 'processing') {
      return Response.json({ status: 'already_processing' });
    }

    let videoUrl = recording.file_url;
    if (videoUrl && videoUrl.includes('storage.googleapis.com')) {
      try {
        const signedRes = await base44.functions.invoke('getSignedGcsUrl', { file_url: videoUrl });
        if (signedRes?.data?.signed_url) videoUrl = signedRes.data.signed_url;
        else if (signedRes?.signed_url) videoUrl = signedRes.signed_url;
      } catch (e) {
        console.error('Error getting signed URL:', e.message);
      }
    }

    // Fire and forget - start processing in background
    // We DON'T await this - it runs after the response is sent
    runProcessing(base44, recording_id, videoUrl);

    // Immediately return success
    return Response.json({ status: 'started', message: 'Eye contact processing started' });

  } catch (error) {
    console.error('fixEyeContact error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
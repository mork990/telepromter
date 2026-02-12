import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as grpc from 'npm:@grpc/grpc-js@1.12.5';
import * as protoLoader from 'npm:@grpc/proto-loader@0.7.13';

const NVIDIA_FUNCTION_ID = 'b75dbca7-b5a4-458c-9275-6d2effeb432a';
const GRPC_TARGET = 'grpc.nvcf.nvidia.com:443';
const DATA_CHUNK_SIZE = 64 * 1024; // 64KB chunks

// Write proto file to /tmp and load it
async function getProtoClient() {
  const protoContent = `
syntax = "proto3";
package nvidia.maxine.eyecontact.v1;

import "google/protobuf/any.proto";
import "google/protobuf/empty.proto";

service MaxineEyeContactService {
  rpc RedirectGaze(stream RedirectGazeRequest) returns (stream RedirectGazeResponse) {}
}

message LossyEncoding {
  optional uint32 bitrate = 1;
  optional uint32 idr_interval = 2;
}

message CustomEncodingParams {
  map<string, google.protobuf.Any> custom = 1;
}

message OutputVideoEncoding {
  oneof encoding_type {
    bool lossless = 1;
    LossyEncoding lossy = 2;
    CustomEncodingParams custom_encoding = 3;
  }
}

message RedirectGazeConfig {
  optional uint32 temporal = 1;
  optional uint32 detect_closure = 2;
  optional uint32 eye_size_sensitivity = 3;
  optional uint32 enable_lookaway = 4;
  optional uint32 lookaway_max_offset = 5;
  optional uint32 lookaway_interval_min = 6;
  optional uint32 lookaway_interval_range = 7;
  optional float gaze_pitch_threshold_low = 8;
  optional float gaze_pitch_threshold_high = 9;
  optional float gaze_yaw_threshold_low = 10;
  optional float gaze_yaw_threshold_high = 11;
  optional float head_pitch_threshold_low = 12;
  optional float head_pitch_threshold_high = 13;
  optional float head_yaw_threshold_low = 14;
  optional float head_yaw_threshold_high = 15;
  optional OutputVideoEncoding output_video_encoding = 16;
}

message RedirectGazeRequest {
  oneof stream_input {
    RedirectGazeConfig config = 1;
    bytes video_file_data = 2;
  }
}

message RedirectGazeResponse {
  oneof stream_output {
    RedirectGazeConfig config = 1;
    bytes video_file_data = 2;
    google.protobuf.Empty keepalive = 3;
  }
}
`;

  const protoPath = '/tmp/eyecontact.proto';
  await Deno.writeTextFile(protoPath, protoContent);

  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const proto = grpc.loadPackageDefinition(packageDefinition);
  return proto.nvidia.maxine.eyecontact.v1.MaxineEyeContactService;
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

function processEyeContact(ServiceClass, apiKey, videoData) {
  return new Promise((resolve, reject) => {
    const credentials = grpc.credentials.createSsl();
    const client = new ServiceClass(GRPC_TARGET, credentials);

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
      call.write({ video_file_data: Buffer.from(chunk) });
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

    // Load gRPC client
    console.log('Loading gRPC proto...');
    const ServiceClass = await getProtoClient();
    console.log('gRPC client loaded, starting eye contact processing...');

    // Process via gRPC
    const outputData = await processEyeContact(ServiceClass, NVIDIA_API_KEY, videoData);

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
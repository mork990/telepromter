import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recording_id, subtitles = [], style, cuts = [] } = await req.json();

    if (!recording_id || (subtitles.length === 0 && cuts.length === 0)) {
      return Response.json({ error: 'Missing recording_id or no operations' }, { status: 400 });
    }

    // Get recording
    const recordings = await base44.entities.Recording.filter({ id: recording_id });
    const recording = recordings[0];
    if (!recording) {
      return Response.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Download video
    const videoResponse = await fetch(recording.file_url);
    const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());

    // Write video to tmp
    const inputPath = `/tmp/input_${recording_id}.mp4`;
    const outputPath = `/tmp/output_${recording_id}.mp4`;
    await Deno.writeFile(inputPath, videoBytes);

    // Build ASS subtitle file for FFmpeg
    const {
      fontSize = 24,
      fontColor = '#FFFFFF',
      bgColor = '#000000',
      bgOpacity = 70,
      positionX = 50,
      positionY = 85,
    } = style || {};

    // Convert hex color to ASS format (BGR with alpha)
    const hexToAss = (hex) => {
      const r = hex.slice(1, 3);
      const g = hex.slice(3, 5);
      const b = hex.slice(5, 7);
      return `${b}${g}${r}`.toUpperCase();
    };

    const bgAlpha = Math.round((1 - bgOpacity / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
    const primaryColor = `&H00${hexToAss(fontColor)}`;
    const backColor = `&H${bgAlpha}${hexToAss(bgColor)}`;
    
    // Map position to ASS alignment and margins
    // ASS alignment: 1-3 bottom, 4-6 middle, 7-9 top (left/center/right)
    let alignment = 2; // default bottom center
    let marginV = 30;
    
    if (positionY < 33) {
      alignment = 8; // top center
      marginV = Math.round((positionY / 33) * 60);
    } else if (positionY < 66) {
      alignment = 5; // middle center
      marginV = Math.round(Math.abs(positionY - 50) * 2);
    } else {
      alignment = 2; // bottom center
      marginV = Math.round((1 - positionY / 100) * 120);
    }
    
    // Horizontal margin
    let marginL = 0;
    let marginR = 0;
    if (positionX < 40) {
      alignment = alignment - 1 + 3; // shift to right (RTL)
      marginR = Math.round((1 - positionX / 50) * 100);
    } else if (positionX > 60) {
      alignment = alignment - 1 + 1; // shift to left (RTL)
      marginL = Math.round((positionX / 50 - 1) * 100);
    }

    const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${Math.round(fontSize * 2.5)},${primaryColor},${primaryColor},&H00000000,${backColor},1,0,0,0,100,100,0,0,3,2,0,${alignment},${marginL},${marginR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const formatAssTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const cs = Math.round((seconds % 1) * 100);
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    let assEvents = '';
    for (const sub of subtitles) {
      const start = formatAssTime(sub.start);
      const end = formatAssTime(sub.end);
      const text = sub.text.replace(/\n/g, '\\N');
      assEvents += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    }

    const assContent = assHeader + assEvents;
    const assPath = `/tmp/subs_${recording_id}.ass`;
    await Deno.writeTextFile(assPath, assContent);

    // Build FFmpeg filter chain
    const hasSubtitles = subtitles.length > 0;
    const hasCuts = cuts.length > 0;

    if (hasCuts) {
      // Sort cuts and build select filter to EXCLUDE cut segments
      const sortedCuts = [...cuts].sort((a, b) => a.start - b.start);
      
      // Build "keep" segments (inverse of cuts)
      const keepSegments = [];
      let cursor = 0;
      for (const cut of sortedCuts) {
        if (cut.start > cursor) {
          keepSegments.push({ start: cursor, end: cut.start });
        }
        cursor = Math.max(cursor, cut.end);
      }
      // Add final segment (until end of video)
      keepSegments.push({ start: cursor, end: 999999 });

      // Build select expression
      const selectParts = keepSegments.map(seg => 
        `between(t,${seg.start.toFixed(3)},${seg.end.toFixed(3)})`
      ).join('+');

      const selectFilter = `select='${selectParts}',setpts=N/FRAME_RATE/TB`;
      const aselectFilter = `aselect='${selectParts}',asetpts=N/SR/TB`;

      // Step 1: Cut first to a temp file
      const cutPath = `/tmp/cut_${recording_id}.mp4`;
      
      const cutCmd = new Deno.Command('ffmpeg', {
        args: [
          '-y',
          '-i', inputPath,
          '-vf', selectFilter,
          '-af', aselectFilter,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          cutPath,
        ],
        stdout: 'piped',
        stderr: 'piped',
      });

      const cutProcess = await cutCmd.output();
      if (!cutProcess.success) {
        const errText = new TextDecoder().decode(cutProcess.stderr);
        console.error('FFmpeg cut error:', errText);
        try { await Deno.remove(inputPath); } catch {}
        try { await Deno.remove(assPath); } catch {}
        return Response.json({ error: 'FFmpeg cut failed', details: errText.slice(-500) }, { status: 500 });
      }

      if (hasSubtitles) {
        // Step 2: Burn subtitles onto cut video
        // Need to adjust subtitle times for cuts
        // Recalculate subtitle times based on removed segments
        const adjustTime = (t) => {
          let offset = 0;
          for (const cut of sortedCuts) {
            if (t > cut.end) {
              offset += (cut.end - cut.start);
            } else if (t > cut.start) {
              offset += (t - cut.start);
            }
          }
          return Math.max(0, t - offset);
        };

        // Rebuild ASS with adjusted times
        let adjustedEvents = '';
        for (const sub of subtitles) {
          const adjStart = formatAssTime(adjustTime(sub.start));
          const adjEnd = formatAssTime(adjustTime(sub.end));
          const text = sub.text.replace(/\n/g, '\\N');
          adjustedEvents += `Dialogue: 0,${adjStart},${adjEnd},Default,,0,0,0,,${text}\n`;
        }
        const adjustedAssPath = `/tmp/adj_subs_${recording_id}.ass`;
        await Deno.writeTextFile(adjustedAssPath, assHeader + adjustedEvents);

        const burnCmd = new Deno.Command('ffmpeg', {
          args: [
            '-y',
            '-i', cutPath,
            '-vf', `ass=${adjustedAssPath}`,
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'copy',
            outputPath,
          ],
          stdout: 'piped',
          stderr: 'piped',
        });

        const burnProcess = await burnCmd.output();
        try { await Deno.remove(adjustedAssPath); } catch {}
        try { await Deno.remove(cutPath); } catch {}

        if (!burnProcess.success) {
          const errText = new TextDecoder().decode(burnProcess.stderr);
          console.error('FFmpeg burn error:', errText);
          try { await Deno.remove(inputPath); } catch {}
          try { await Deno.remove(assPath); } catch {}
          return Response.json({ error: 'FFmpeg burn failed', details: errText.slice(-500) }, { status: 500 });
        }
      } else {
        // Just rename cut file as output
        await Deno.rename(cutPath, outputPath);
      }
    } else {
      // No cuts, just burn subtitles
      const ffmpegCmd = new Deno.Command('ffmpeg', {
        args: [
          '-y',
          '-i', inputPath,
          '-vf', `ass=${assPath}`,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '23',
          '-c:a', 'copy',
          outputPath,
        ],
        stdout: 'piped',
        stderr: 'piped',
      });

      const process = await ffmpegCmd.output();

      if (!process.success) {
        const errText = new TextDecoder().decode(process.stderr);
        console.error('FFmpeg error:', errText);
        try { await Deno.remove(inputPath); } catch {}
        try { await Deno.remove(assPath); } catch {}
        return Response.json({ error: 'FFmpeg burn failed', details: errText.slice(-500) }, { status: 500 });
      }
    }

    // Read output and upload to cloud storage
    const outputBytes = await Deno.readFile(outputPath);

    // Cleanup tmp files
    try { await Deno.remove(inputPath); } catch {}
    try { await Deno.remove(assPath); } catch {}
    try { await Deno.remove(outputPath); } catch {}

    // Upload to GCS so we can return a URL (works on all devices including iOS)
    const bucketName = Deno.env.get("GCS_BUCKET_NAME");
    const serviceAccountKey = Deno.env.get("GCS_SERVICE_ACCOUNT_KEY");
    
    if (bucketName && serviceAccountKey) {
      const keyData = JSON.parse(serviceAccountKey);
      
      // Create JWT for GCS auth
      const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const now = Math.floor(Date.now() / 1000);
      const claimSet = {
        iss: keyData.client_email,
        scope: "https://www.googleapis.com/auth/devstorage.read_write",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };
      const claims = btoa(JSON.stringify(claimSet));
      
      // Import private key and sign
      const pemContent = keyData.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '');
      const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));
      
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
      );
      
      const signInput = new TextEncoder().encode(`${header}.${claims}`);
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signInput);
      const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const jwt = `${header}.${claims}.${sig}`;
      
      // Get access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      
      if (accessToken) {
        const fileName = `exports/export_${recording_id}_${Date.now()}.mp4`;
        const uploadRes = await fetch(
          `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'video/mp4',
            },
            body: outputBytes,
          }
        );
        
        if (uploadRes.ok) {
          const fileUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
          return Response.json({ file_url: fileUrl });
        }
      }
    }
    
    // Fallback: return binary if GCS upload fails
    return new Response(outputBytes, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video_subtitled.mp4"`,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check premium subscription
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: user.email,
      plan: 'premium',
      status: 'active'
    });

    const hasPremium = subs.length > 0 && (!subs[0].end_date || new Date(subs[0].end_date) > new Date());

    if (!hasPremium) {
      return Response.json({ error: 'Premium subscription required' }, { status: 403 });
    }

    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    if (!DEEPGRAM_API_KEY) {
      return Response.json({ error: 'DEEPGRAM_API_KEY not configured' }, { status: 500 });
    }

    // Request a temporary token with longer TTL for recording sessions
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl_seconds: 3600 }) // 1 hour max
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram token error:', response.status, errorText);
      return Response.json({ error: 'Failed to get Deepgram token' }, { status: 500 });
    }

    const data = await response.json();
    return Response.json({ token: data.access_token, expires_in: data.expires_in });

  } catch (error) {
    console.error('getDeepgramToken error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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

    // Return the API key directly for WebSocket auth
    // The key is only sent to the authenticated premium user's browser
    // and used solely for the Deepgram WebSocket connection
    return Response.json({ token: DEEPGRAM_API_KEY });

  } catch (error) {
    console.error('getDeepgramToken error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useSubscription() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setIsPremium(false);
          setLoading(false);
          return;
        }
        
        const subs = await base44.entities.Subscription.filter({
          user_email: user.email,
          plan: 'premium',
          status: 'active'
        });
        
        if (subs.length > 0) {
          const sub = subs[0];
          // Check if subscription hasn't expired
          if (sub.end_date && new Date(sub.end_date) < new Date()) {
            setIsPremium(false);
          } else {
            setIsPremium(true);
          }
        } else {
          setIsPremium(false);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setIsPremium(false);
      }
      setLoading(false);
    };
    
    checkSubscription();
  }, []);

  return { isPremium, loading };
}
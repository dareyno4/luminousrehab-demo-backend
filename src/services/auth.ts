import { supabaseClient } from '../lib/supabase';

interface LoginCredentials {
  email: string;
  password: string;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  active: boolean;
  mfa_enabled: boolean;
}

export const authService = {
  async login({ email, password }: LoginCredentials) {
    try {
      // First authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', JSON.stringify(authError, null, 2));
        
        // Handle rate limiting
        if ((authError as any).status === 429 || authError.message?.toLowerCase().includes('rate limit')) {
          throw new Error('Too many login attempts. Please wait a few minutes and try again.');
        }
        
        throw new Error(authError.message);
      }

      if (!authData.session) {
        throw new Error('No session created');
      }

      // Then get the user profile from our users table
      // Use maybeSingle to avoid an error when no rows are found, and try a fallback by auth user id
      let userByEmail = null;
      try {
        const resp = await supabaseClient
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        userByEmail = resp.data || null;
        if (resp.error) {
          console.error('User fetch (by email) error:', JSON.stringify(resp.error, null, 2));
        }
      } catch (err) {
        console.error('Exception during user fetch (by email):', err);
      }

      let user = userByEmail || null;

      if (!user) {
        console.error('No user profile found for email', { email });
        throw new Error('Could not fetch user profile');
      }
      if (!user.active) throw new Error('Account is not active');

      return {
        user: {
          ...user,
          token: authData.session.access_token
        }
      };
    } catch (error) {
      throw error;
    }
  },

  async logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  }
};
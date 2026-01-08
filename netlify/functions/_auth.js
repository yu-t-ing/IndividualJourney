const getBearerToken = (event) => {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || '';
  const m = String(auth).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  return { url, anonKey };
};

const getSupabaseUser = async (accessToken) => {
  const { url, anonKey } = getSupabaseConfig();

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Invalid auth token (${res.status}): ${text}`);
  }

  return res.json();
};

const requireUser = async (event) => {
  const token = getBearerToken(event);
  if (!token) {
    const err = new Error('Missing Authorization Bearer token');
    err.statusCode = 401;
    throw err;
  }
  const user = await getSupabaseUser(token);
  return user;
};

module.exports = { getBearerToken, getSupabaseUser, requireUser };

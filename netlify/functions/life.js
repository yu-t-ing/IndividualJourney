const { query } = require('./_db');
const { requireUser } = require('./_auth');

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  },
  body: JSON.stringify(body)
});

const parseIdFromPath = (path) => {
  const marker = '/.netlify/functions/life';
  const idx = path.indexOf(marker);
  if (idx === -1) return null;
  const rest = path.slice(idx + marker.length);
  const parts = rest.split('/').filter(Boolean);
  return parts.length ? parts[0] : null;
};

exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();
    const qs = event.queryStringParameters || {};

    if ((qs.debug || '').toLowerCase() === 'env') {
      return json(200, {
        data: {
          has_NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
          has_NETLIFY_DATABASE_URL_UNPOOLED: !!process.env.NETLIFY_DATABASE_URL_UNPOOLED,
          has_DATABASE_URL: !!process.env.DATABASE_URL,
          node: process.version
        }
      });
    }

    if ((qs.debug || '').toLowerCase() === 'dbinfo') {
      try {
        const r = await query(
          "select current_database() as db, current_user as user, current_schema() as schema, current_setting('search_path') as search_path, to_regclass('public.life_records') as public_life_records, to_regclass('life_records') as life_records"
        );
        return json(200, {
          data: {
            ...((r && r.rows && r.rows[0]) ? r.rows[0] : {}),
            has_NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
            has_NETLIFY_DATABASE_URL_UNPOOLED: !!process.env.NETLIFY_DATABASE_URL_UNPOOLED,
            has_DATABASE_URL: !!process.env.DATABASE_URL
          }
        });
      } catch (e) {
        return json(200, {
          data: {
            error: e?.message || 'unknown',
            has_NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
            has_NETLIFY_DATABASE_URL_UNPOOLED: !!process.env.NETLIFY_DATABASE_URL_UNPOOLED,
            has_DATABASE_URL: !!process.env.DATABASE_URL
          }
        });
      }
    }

    const id = parseIdFromPath(event.path || '');

    if (method === 'GET' && !id) {
      const mode = (qs.mode || 'public').toLowerCase();
      const from = Number.isFinite(Number(qs.from)) ? Number(qs.from) : 0;
      const limit = Number.isFinite(Number(qs.limit)) ? Number(qs.limit) : 90;

      if (mode === 'public') {
        const r = await query(
          'select id, user_id, images, description, is_public, fingerprint, created_at, updated_at from public.life_records where is_public = true order by created_at desc offset $1 limit $2',
          [from, limit]
        );
        return json(200, { data: r.rows });
      }

      const user = await requireUser(event);
      const r = await query(
        'select id, user_id, images, description, is_public, fingerprint, created_at, updated_at from public.life_records where user_id = $1 order by created_at desc offset $2 limit $3',
        [user.id, from, limit]
      );
      return json(200, { data: r.rows });
    }

    if (method === 'POST' && !id) {
      const user = await requireUser(event);
      const body = JSON.parse(event.body || '{}');

      const images = Array.isArray(body.images) ? body.images : [];
      const description = String(body.description ?? body.desc ?? '').trim();
      const is_public = !!body.is_public;
      const fingerprint = body.fingerprint ? String(body.fingerprint) : null;
      const created_at = body.created_at ? new Date(body.created_at) : null;

      if (!images.length) return json(400, { error: 'Missing images' });

      const r = await query(
        'insert into public.life_records (user_id, images, description, is_public, fingerprint, created_at) values ($1,$2::jsonb,$3,$4,$5, coalesce($6, now())) on conflict (user_id, fingerprint) where fingerprint is not null do update set images = excluded.images, description = excluded.description, is_public = excluded.is_public, updated_at = now() returning id, user_id, images, description, is_public, fingerprint, created_at, updated_at',
        [user.id, JSON.stringify(images), description, is_public, fingerprint, created_at]
      );

      return json(200, { data: r.rows[0] || null });
    }

    if ((method === 'PUT' || method === 'PATCH') && id) {
      const user = await requireUser(event);
      const body = JSON.parse(event.body || '{}');

      const fields = [];
      const values = [];
      let i = 1;

      if (body.images !== undefined) {
        const images = Array.isArray(body.images) ? body.images : [];
        fields.push(`images = $${i++}::jsonb`);
        values.push(JSON.stringify(images));
      }
      if (body.description !== undefined || body.desc !== undefined) {
        fields.push(`description = $${i++}`);
        values.push(String(body.description ?? body.desc ?? '').trim());
      }
      if (body.is_public !== undefined) {
        fields.push(`is_public = $${i++}`);
        values.push(!!body.is_public);
      }
      if (body.fingerprint !== undefined) {
        fields.push(`fingerprint = $${i++}`);
        values.push(body.fingerprint ? String(body.fingerprint) : null);
      }

      if (!fields.length) return json(400, { error: 'No updates provided' });

      fields.push('updated_at = now()');
      values.push(id);
      values.push(user.id);

      const r = await query(
        `update public.life_records set ${fields.join(', ')} where id = $${i++} and user_id = $${i++} returning id, user_id, images, description, is_public, fingerprint, created_at, updated_at`,
        values
      );

      if (!r.rows.length) return json(404, { error: 'Not found' });
      return json(200, { data: r.rows[0] });
    }

    if (method === 'DELETE' && id) {
      const user = await requireUser(event);
      const r = await query('delete from public.life_records where id = $1 and user_id = $2 returning id', [id, user.id]);
      if (!r.rows.length) return json(404, { error: 'Not found' });
      return json(200, { data: { id: r.rows[0].id } });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    const statusCode = e.statusCode || 500;
    return json(statusCode, { error: e.message || 'Server error' });
  }
};

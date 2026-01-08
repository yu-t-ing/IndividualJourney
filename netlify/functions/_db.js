const { Pool } = require("pg");

let _pool;

const getPool = () => {
  if (_pool) return _pool;

  const connectionString =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing database connection string");
  }

  _pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  return _pool;
};

const query = async (text, params) => {
  const pool = getPool();
  return pool.query(text, params);
};

module.exports = { query };

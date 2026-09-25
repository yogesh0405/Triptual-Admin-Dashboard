import { Pool } from 'pg';
import { env } from '../utils/env.js';

const connectionString = env.databaseUrl.includes('sslmode=require') && !env.databaseUrl.includes('uselibpqcompat')
  ? `${env.databaseUrl}&uselibpqcompat=true`
  : env.databaseUrl;

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

export const quoteIdentifier = (value) => `"${value.replace(/"/g, '""')}"`;

export async function tableColumns(candidates) {
  const result = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND lower(table_name) = ANY($1::text[])`, [candidates.map((name) => name.toLowerCase())]);
  const found = new Map();
  for (const row of result.rows) {
    const key = row.table_name.toLowerCase();
    if (!found.has(key)) found.set(key, new Set());
    found.get(key).add(row.column_name.toLowerCase());
  }
  return found;
}

export const firstColumn = (columns, names) => names.find((name) => columns.has(name));

export async function ensureSupportMessageSchema() {
  await pool.query(`
    ALTER TABLE IF EXISTS support_ticket_messages
    ALTER COLUMN sender_id DROP NOT NULL
  `);
}

export async function ensureAuthTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS triptual_admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS triptual_admin_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES triptual_admin_users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS triptual_admin_sessions_token_idx ON triptual_admin_sessions(refresh_token_hash);
    
    CREATE TABLE IF NOT EXISTS broadcast_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      channels TEXT[] NOT NULL,
      target_audience TEXT NOT NULL,
      action_url TEXT,
      category TEXT DEFAULT 'general',
      stats JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT DEFAULT 'broadcast',
      action_url TEXT,
      category TEXT DEFAULT 'general',
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tour_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Hotel',
      category TEXT NOT NULL DEFAULT 'hotel',
      destination TEXT NOT NULL,
      country TEXT DEFAULT 'India',
      duration TEXT DEFAULT '5D/4N',
      date_range TEXT DEFAULT 'Jun 15-22',
      guests INT DEFAULT 2,
      match_score INT DEFAULT 90,
      rating NUMERIC(3, 2) DEFAULT 4.80,
      base_price NUMERIC(12, 2) NOT NULL DEFAULT 15000,
      total_nights INT DEFAULT 7,
      style TEXT DEFAULT 'Boutique',
      distance TEXT DEFAULT '0.5 km',
      featured BOOLEAN DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'Published',
      image TEXT NOT NULL,
      alt_images JSONB DEFAULT '[]'::jsonb,
      metrics JSONB DEFAULT '{"walk": 90, "food": 90, "activity": 90}'::jsonb,
      why_matched JSONB DEFAULT '[]'::jsonb,
      itinerary_highlights JSONB DEFAULT '[]'::jsonb,
      inclusions JSONB DEFAULT '[]'::jsonb,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const countRes = await pool.query('SELECT COUNT(*) FROM tour_packages');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    const seedPackages = [
      {
        title: 'Cozy Den', type: 'Hotel', category: 'hotel', destination: 'Barcelona', country: 'Spain',
        duration: '7D/6N', date_range: 'Jun 15-22', guests: 2, match_score: 91, rating: 4.78, base_price: 14600,
        total_nights: 7, style: 'Boutique', distance: '0.3 km', featured: true, status: 'Published',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
        alt_images: JSON.stringify([
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'
        ]),
        metrics: JSON.stringify({ walk: 91, food: 91, activity: 91 }),
        why_matched: JSON.stringify([
          { icon: 'walk', title: 'Walkable to your saved spots', description: '4 of your wishlist places within 800m' },
          { icon: 'food', title: 'Food scene fits your trips', description: 'Matches where you ate in Lisbon & Rome' }
        ]),
        itinerary_highlights: JSON.stringify(['Gothic Quarter walking tour', 'Sagrada Familia guided visit', 'Tapas tasting session']),
        inclusions: JSON.stringify(['Daily Breakfast', 'Airport Transfer', 'City Pass']),
        description: 'Charming boutique hotel in central Barcelona with historic aesthetic and modern amenities.'
      },
      {
        title: 'Oasis Villa', type: 'Villa', category: 'villa', destination: 'San Francisco', country: 'USA',
        duration: '7D/6N', date_range: 'Jun 15-22', guests: 5, match_score: 95, rating: 4.96, base_price: 28000,
        total_nights: 7, style: 'Modern Minimalist', distance: '0.5 km', featured: true, status: 'Published',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
        alt_images: JSON.stringify([
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80'
        ]),
        metrics: JSON.stringify({ walk: 94, food: 96, activity: 88 }),
        why_matched: JSON.stringify([
          { icon: 'walk', title: 'Central location near Golden Gate parks', description: 'Direct cycling route and cable car access' },
          { icon: 'quiet', title: 'Hillside retreat with sunset views', description: 'Sound-insulated architecture with private terrace' }
        ]),
        itinerary_highlights: JSON.stringify(['Golden Gate bay cruise', 'Napa Valley wine day trip', 'Private terrace chef sunset session']),
        inclusions: JSON.stringify(['Private Chef', 'EV Charger', 'Luxury Concierge']),
        description: 'Luxury hillside retreat in San Francisco with floor-to-ceiling glass and private sunset deck.'
      },
      {
        title: 'Garden Escape House', type: 'House', category: 'villa', destination: 'Provence', country: 'France',
        duration: '6D/5N', date_range: 'Jun 15-22', guests: 3, match_score: 87, rating: 4.89, base_price: 13200,
        total_nights: 7, style: 'Coastal', distance: '1.2 km', featured: false, status: 'Published',
        image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
        alt_images: JSON.stringify([]),
        metrics: JSON.stringify({ walk: 85, food: 89, activity: 84 }),
        why_matched: JSON.stringify([
          { icon: 'walk', title: 'Lush botanical garden proximity', description: 'Surrounded by lavender fields' }
        ]),
        itinerary_highlights: JSON.stringify(['Lavender valley photo walk', 'Organic farm dining', 'Winery masterclass']),
        inclusions: JSON.stringify(['Bicycle Rental', 'Wine Tasting', 'Garden Access']),
        description: 'Serene French country home with private botanical gardens and lavender field vistas.'
      }
    ];

    for (const p of seedPackages) {
      await pool.query(`
        INSERT INTO tour_packages (
          title, type, category, destination, country, duration, date_range, guests, match_score, rating,
          base_price, total_nights, style, distance, featured, status, image, alt_images, metrics, why_matched,
          itinerary_highlights, inclusions, description
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      `, [
        p.title, p.type, p.category, p.destination, p.country, p.duration, p.date_range, p.guests, p.match_score, p.rating,
        p.base_price, p.total_nights, p.style, p.distance, p.featured, p.status, p.image, p.alt_images, p.metrics, p.why_matched,
        p.itinerary_highlights, p.inclusions, p.description
      ]);
    }
  }
}

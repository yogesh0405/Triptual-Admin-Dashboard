import { Pool } from 'pg';
import { env } from '../utils/env.js';

const databaseUrl = env.databaseUrl || '';
const requiresSsl = /(?:^|[?&])sslmode=require(?:$|[&])/.test(databaseUrl) || /neon\.tech|render\.com|supabase\.co/.test(databaseUrl);
const connectionString = databaseUrl.includes('sslmode=require') && !databaseUrl.includes('uselibpqcompat')
  ? `${databaseUrl}&uselibpqcompat=true`
  : databaseUrl;

export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 20_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  console.error('[Postgres pool] unexpected error:', error.message);
});

export const quoteIdentifier = (value) => `"${value.replace(/"/g, '""')}"`;

export async function pingDatabase() {
  await pool.query('SELECT 1');
}

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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_event_outbox (
      event_id BIGSERIAL PRIMARY KEY,
      event_type VARCHAR(40) NOT NULL,
      ticket_number VARCHAR(32) NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_support_ticket_event_outbox_created
      ON support_ticket_event_outbox(event_id);
    CREATE TABLE IF NOT EXISTS support_ticket_event_consumers (
      consumer_name VARCHAR(80) PRIMARY KEY,
      last_event_id BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
  await seedExplorePackages();
}

async function seedExplorePackages() {
  const packages = [
    ['Lantern House Stay', 'Hotel', 'hotel', 'Kyoto', 'Japan', '5D/4N', 'Oct 10-14', 2, 94, 4.91, 22400, 4, 'Heritage', true, 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80', "A calm heritage stay near Kyoto's temple lanes, gardens, and traditional tea houses."],
    ['Lake Pichola Palace Escape', 'Hotel', 'hotel', 'Udaipur', 'India', '4D/3N', 'Nov 06-09', 2, 96, 4.95, 26800, 3, 'Luxury', true, 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1000&q=80', "A lakeside heritage escape with rooftop dining and views across Udaipur's old city."],
    ['South Goa Beachfront Villa', 'Villa', 'villa', 'South Goa', 'India', '6D/5N', 'Dec 12-17', 4, 93, 4.88, 31500, 5, 'Coastal', false, 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80', 'A relaxed private villa close to quiet beaches, local seafood, and palm-lined lanes.'],
    ['Himalayan Pine Camp', 'Camping', 'camping', 'Manali', 'India', '5D/4N', 'Jan 18-22', 2, 90, 4.82, 17200, 4, 'Adventure', false, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80', 'A mountain camp base for forest walks, alpine views, and guided day hikes.'],
    ['Bali Jungle Wellness Retreat', 'Resort', 'resort', 'Ubud', 'Indonesia', '7D/6N', 'Feb 03-09', 2, 95, 4.94, 38200, 6, 'Wellness', true, 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80', 'A tropical retreat with a quiet garden setting, wellness sessions, and easy access to Ubud.'],
    ['Jaipur Heritage Haveli', 'House', 'villa', 'Jaipur', 'India', '4D/3N', 'Mar 14-17', 3, 91, 4.87, 19800, 3, 'Heritage', false, 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1000&q=80', "A restored haveli stay within reach of Jaipur's historic forts, markets, and cuisine."]
  ];

  for (const p of packages) {
    await pool.query(`
      INSERT INTO tour_packages (
        title, type, category, destination, country, duration, date_range, guests, match_score,
        rating, base_price, total_nights, style, featured, status, image, description
      )
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Published',$15,$16
      WHERE NOT EXISTS (
        SELECT 1 FROM tour_packages WHERE LOWER(title) = LOWER($1) AND LOWER(destination) = LOWER($4)
      )
    `, p);
  }
}

import { pool } from '../modules/db.js';

export async function listPackages(req, res) {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM tour_packages';
    const params = [];
    const conditions = [];

    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(title) LIKE $${params.length} OR LOWER(destination) LIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    
    const packages = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      name: row.title,
      type: row.type,
      category: row.category,
      destination: row.destination,
      country: row.country || 'India',
      duration: row.duration || '5D/4N',
      dateRange: row.date_range || 'Jun 15-22',
      guests: row.guests || 2,
      matchScore: row.match_score || 90,
      rating: parseFloat(row.rating) || 4.8,
      basePrice: parseFloat(row.base_price) || 15000,
      pricePerNight: parseFloat(row.base_price) ? Math.round(parseFloat(row.base_price) / (row.total_nights || 7)) : 150,
      totalNights: row.total_nights || 7,
      style: row.style || 'Boutique',
      distance: row.distance || '0.5 km',
      featured: row.featured || false,
      status: row.status || 'Published',
      image: row.image,
      altImages: typeof row.alt_images === 'string' ? JSON.parse(row.alt_images) : (row.alt_images || []),
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : (row.metrics || { walk: 90, food: 90, activity: 90 }),
      whyMatched: typeof row.why_matched === 'string' ? JSON.parse(row.why_matched) : (row.why_matched || []),
      itineraryHighlights: typeof row.itinerary_highlights === 'string' ? JSON.parse(row.itinerary_highlights) : (row.itinerary_highlights || []),
      inclusions: typeof row.inclusions === 'string' ? JSON.parse(row.inclusions) : (row.inclusions || []),
      description: row.description || '',
      tags: [row.type, row.style].filter(Boolean),
      createdAt: row.created_at,
    }));

    return res.json({ success: true, packages, total: packages.length });
  } catch (error) {
    console.error('Error listing packages:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function createPackage(req, res) {
  try {
    const {
      title,
      type = 'Hotel',
      category = 'hotel',
      destination,
      country = 'India',
      duration = '5D/4N',
      dateRange = 'Jun 15-22',
      guests = 2,
      matchScore = 92,
      rating = 4.85,
      basePrice = 15000,
      totalNights = 7,
      style = 'Boutique',
      distance = '0.5 km',
      featured = false,
      status = 'Draft',
      image,
      altImages = [],
      metrics = { walk: 90, food: 90, activity: 90 },
      whyMatched = [],
      itineraryHighlights = [],
      inclusions = [],
      description = ''
    } = req.body;

    if (!title || !destination || !image) {
      return res.status(400).json({ success: false, error: 'Title, destination, and cover image URL are required.' });
    }

    const defaultAltImages = Array.isArray(altImages) ? altImages : [];
    const defaultHighlights = Array.isArray(itineraryHighlights) ? itineraryHighlights : [];
    const defaultInclusions = Array.isArray(inclusions) ? inclusions : [];
    const defaultWhyMatched = Array.isArray(whyMatched) ? whyMatched : [];

    const result = await pool.query(
      `INSERT INTO tour_packages (
        title, type, category, destination, country, duration, date_range, guests, match_score, rating,
        base_price, total_nights, style, distance, featured, status, image, alt_images, metrics, why_matched,
        itinerary_highlights, inclusions, description
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *`,
      [
        title, type, category.toLowerCase(), destination, country, duration, dateRange, parseInt(guests) || 2,
        parseInt(matchScore) || 90, parseFloat(rating) || 4.8, parseFloat(basePrice) || 15000, parseInt(totalNights) || 7,
        style, distance, Boolean(featured), status, image, JSON.stringify(defaultAltImages), JSON.stringify(metrics),
        JSON.stringify(defaultWhyMatched), JSON.stringify(defaultHighlights), JSON.stringify(defaultInclusions), description
      ]
    );

    const row = result.rows[0];
    return res.status(201).json({
      success: true,
      message: `Tour package "${row.title}" created successfully.`,
      package: {
        id: row.id,
        title: row.title,
        name: row.title,
        type: row.type,
        category: row.category,
        destination: row.destination,
        country: row.country,
        duration: row.duration,
        dateRange: row.date_range,
        guests: row.guests,
        matchScore: row.match_score,
        rating: parseFloat(row.rating),
        basePrice: parseFloat(row.base_price),
        pricePerNight: Math.round(parseFloat(row.base_price) / (row.total_nights || 7)),
        totalNights: row.total_nights,
        style: row.style,
        distance: row.distance,
        featured: row.featured,
        status: row.status,
        image: row.image,
        altImages: defaultAltImages,
        metrics,
        whyMatched: defaultWhyMatched,
        itineraryHighlights: defaultHighlights,
        inclusions: defaultInclusions,
        description: row.description,
        tags: [row.type, row.style].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Error creating package:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePackageStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Published', 'Draft', 'Sold Out'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status provided.' });
    }

    const result = await pool.query(
      `UPDATE tour_packages SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Package not found.' });
    }

    return res.json({ success: true, message: `Status updated to ${status}`, package: result.rows[0] });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function deletePackage(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM tour_packages WHERE id = $1 RETURNING id`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Package not found.' });
    }
    return res.json({ success: true, message: 'Package deleted successfully.' });
  } catch (error) {
    console.error('Error deleting package:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

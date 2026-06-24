import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    const crmPassword = process.env.CRM_PASSWORD;
    if (crmPassword) {
      const cookieStore = await cookies();
      const session = cookieStore.get('crm_session');
      if (!session || session.value !== 'authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const rating = searchParams.get('rating');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

    const { pool, dbMode, FALLBACK_DB_PATH } = await getDb();

    if (dbMode === 'postgres') {
      let queryStr = 'SELECT * FROM reviews WHERE 1=1';
      const params = [];
      let paramCounter = 1;

      if (location) {
        queryStr += ` AND location = $${paramCounter}`;
        params.push(location);
        paramCounter++;
      }

      if (rating) {
        queryStr += ` AND rating = $${paramCounter}`;
        params.push(parseInt(rating));
        paramCounter++;
      }

      if (status) {
        if (status === 'Read') {
          queryStr += ` AND (status = 'Read' OR status = 'Approved')`;
        } else if (status === 'Unseen') {
          queryStr += ` AND (status = 'Unseen' OR status = 'Pending' OR status = 'Flagged' OR status IS NULL)`;
        } else {
          queryStr += ` AND status = $${paramCounter}`;
          params.push(status);
          paramCounter++;
        }
      }

      if (search) {
        queryStr += ` AND (name ILIKE $${paramCounter} OR review_text ILIKE $${paramCounter})`;
        params.push(`%${search}%`);
        paramCounter++;
      }

      // Sorting
      const allowedSortColumns = ['name', 'location', 'rating', 'created_at'];
      const currentSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const currentSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      
      queryStr += ` ORDER BY ${currentSortBy} ${currentSortOrder}`;

      const result = await pool.query(queryStr, params);
      return NextResponse.json(result.rows);
    } else {
      let data = [];
      if (fs.existsSync(FALLBACK_DB_PATH)) {
        const fileContent = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
        data = JSON.parse(fileContent || '[]');
      }

      if (location) {
        data = data.filter(r => r.location === location);
      }

      if (rating) {
        data = data.filter(r => r.rating === parseInt(rating));
      }

      if (status) {
        if (status === 'Read') {
          data = data.filter(r => r.status === 'Read' || r.status === 'Approved');
        } else if (status === 'Unseen') {
          data = data.filter(r => r.status === 'Unseen' || r.status === 'Pending' || r.status === 'Flagged' || !r.status);
        } else {
          data = data.filter(r => r.status === status);
        }
      }

      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(r => 
          r.name.toLowerCase().includes(searchLower) || 
          r.review_text.toLowerCase().includes(searchLower)
        );
      }

      const currentSortBy = ['name', 'location', 'rating', 'created_at'].includes(sortBy) ? sortBy : 'created_at';
      const orderModifier = sortOrder === 'ASC' ? 1 : -1;

      data.sort((a, b) => {
        let valA = a[currentSortBy];
        let valB = b[currentSortBy];

        if (currentSortBy === 'created_at') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (typeof valA === 'string') {
          return valA.localeCompare(valB) * orderModifier;
        }
        
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * orderModifier;
      });

      return NextResponse.json(data);
    }
  } catch (err) {
    console.error('Error in reviews GET:', err.message);
    return NextResponse.json({ error: 'Failed to fetch reviews.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, location, rating, review_text } = await req.json();

    // Basic validation
    if (!name || !location || !rating || !review_text) {
      return NextResponse.json({ error: 'All fields (name, location, rating, review_text) are required.' }, { status: 400 });
    }

    const parsedRating = parseInt(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5.' }, { status: 400 });
    }

    const { pool, dbMode, FALLBACK_DB_PATH } = await getDb();

    if (dbMode === 'postgres') {
      const query = `
        INSERT INTO reviews (name, location, rating, review_text, status)
        VALUES ($1, $2, $3, $4, 'Unseen')
        RETURNING *;
      `;
      const result = await pool.query(query, [name, location, parsedRating, review_text]);
      return NextResponse.json({
        success: true,
        dbMode: 'postgres',
        review: result.rows[0]
      }, { status: 201 });
    } else {
      let data = [];
      if (fs.existsSync(FALLBACK_DB_PATH)) {
        const fileContent = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
        data = JSON.parse(fileContent || '[]');
      }
      
      const newReview = {
        id: data.length > 0 ? Math.max(...data.map(r => r.id)) + 1 : 1,
        name,
        location,
        rating: parsedRating,
        review_text,
        status: 'Unseen',
        client_notes: '',
        created_at: new Date().toISOString()
      };
      
      data.push(newReview);
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
      
      return NextResponse.json({
        success: true,
        dbMode: 'local',
        review: newReview
      }, { status: 201 });
    }
  } catch (err) {
    console.error('Error in reviews POST:', err.message);
    return NextResponse.json({ error: 'Failed to save review.' }, { status: 500 });
  }
}

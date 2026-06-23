import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';

export async function PATCH(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { status, client_notes } = await req.json();

    const { pool, dbMode, FALLBACK_DB_PATH } = await getDb();

    if (dbMode === 'postgres') {
      let queryStr = 'UPDATE reviews SET ';
      const updates = [];
      const queryParams = [];
      let paramCounter = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramCounter}`);
        queryParams.push(status);
        paramCounter++;
      }

      if (client_notes !== undefined) {
        updates.push(`client_notes = $${paramCounter}`);
        queryParams.push(client_notes);
        paramCounter++;
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
      }

      queryStr += updates.join(', ') + ` WHERE id = $${paramCounter} RETURNING *`;
      queryParams.push(parseInt(id));

      const result = await pool.query(queryStr, queryParams);
      
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    } else {
      let data = [];
      if (fs.existsSync(FALLBACK_DB_PATH)) {
        const fileContent = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
        data = JSON.parse(fileContent || '[]');
      }

      const reviewIndex = data.findIndex(r => r.id === parseInt(id));
      if (reviewIndex === -1) {
        return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
      }

      if (status !== undefined) {
        data[reviewIndex].status = status;
      }
      if (client_notes !== undefined) {
        data[reviewIndex].client_notes = client_notes;
      }

      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
      return NextResponse.json(data[reviewIndex]);
    }
  } catch (err) {
    console.error('Error in reviews PATCH:', err.message);
    return NextResponse.json({ error: 'Failed to update review.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const { pool, dbMode, FALLBACK_DB_PATH } = await getDb();

    if (dbMode === 'postgres') {
      const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING *', [parseInt(id)]);
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Review deleted successfully.', deletedReview: result.rows[0] });
    } else {
      let data = [];
      if (fs.existsSync(FALLBACK_DB_PATH)) {
        const fileContent = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
        data = JSON.parse(fileContent || '[]');
      }

      const reviewIndex = data.findIndex(r => r.id === parseInt(id));
      if (reviewIndex === -1) {
        return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
      }

      const deletedReview = data.splice(reviewIndex, 1)[0];
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
      
      return NextResponse.json({ success: true, message: 'Review deleted successfully.', deletedReview });
    }
  } catch (err) {
    console.error('Error in reviews DELETE:', err.message);
    return NextResponse.json({ error: 'Failed to delete review.' }, { status: 500 });
  }
}

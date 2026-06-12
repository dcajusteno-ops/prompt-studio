import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const databaseDir = path.join(process.cwd(), 'database');
const dataFilePath = path.join(databaseDir, 'data.json');

async function ensureDbDir() {
  try {
    await fs.mkdir(databaseDir, { recursive: true });
  } catch (e) {}
}

async function readData() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await ensureDbDir();
      await fs.writeFile(dataFilePath, '[]');
      return [];
    }
    throw error;
  }
}

async function writeData(data) {
  await ensureDbDir();
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const newItem = await request.json();
    const data = await readData();
    
    const item = {
      id: newItem.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
      createdAt: newItem.createdAt || new Date().toISOString(),
      ...newItem
    };
    
    data.push(item);
    await writeData(data);
    
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const payload = await request.json();
    const data = await readData();
    
    if (Array.isArray(payload)) {
      // Batch update
      payload.forEach(updatedItem => {
        const index = data.findIndex((item) => item.id === updatedItem.id);
        if (index !== -1) {
          data[index] = { ...data[index], ...updatedItem };
        }
      });
      await writeData(data);
      return NextResponse.json({ success: true, count: payload.length });
    } else {
      // Single update
      const updatedItem = payload;
      if (!updatedItem.id) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
      
      const index = data.findIndex((item) => item.id === updatedItem.id);
      if (index === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      
      data[index] = { ...data[index], ...updatedItem };
      await writeData(data);
      
      return NextResponse.json(data[index]);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const payload = await request.text();
    let idsToDelete = [];
    
    if (payload) {
      try {
        const parsed = JSON.parse(payload);
        if (Array.isArray(parsed.ids)) {
          idsToDelete = parsed.ids;
        }
      } catch (e) {}
    }

    if (idsToDelete.length === 0) {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (id) idsToDelete.push(id);
    }
    
    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Missing item IDs' }, { status: 400 });
    }
    
    let data = await readData();
    
    // Delete files from filesystem
    const itemsToDelete = data.filter((item) => idsToDelete.includes(item.id));
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    for (const item of itemsToDelete) {
      if (item.filename) {
        try {
          await fs.unlink(path.join(uploadsDir, item.filename));
        } catch (e) {
          console.error(`Failed to delete file ${item.filename}:`, e);
        }
      }
    }
    
    data = data.filter((item) => !idsToDelete.includes(item.id));
    await writeData(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}

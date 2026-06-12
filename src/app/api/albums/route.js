import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const databaseDir = path.join(process.cwd(), 'database');
const albumsFilePath = path.join(databaseDir, 'albums.json');

async function ensureDbDir() {
  try {
    await fs.mkdir(databaseDir, { recursive: true });
  } catch (e) {}
}

async function readAlbums() {
  try {
    const data = await fs.readFile(albumsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await ensureDbDir();
      const initial = [{ id: 'default', name: '默认画集', createdAt: new Date().toISOString() }];
      await fs.writeFile(albumsFilePath, JSON.stringify(initial, null, 2));
      return initial;
    }
    throw error;
  }
}

async function writeAlbums(data) {
  await ensureDbDir();
  await fs.writeFile(albumsFilePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const data = await readAlbums();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read albums' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const albums = await readAlbums();
    const newAlbum = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name,
      createdAt: new Date().toISOString()
    };
    
    albums.push(newAlbum);
    await writeAlbums(albums);
    
    return NextResponse.json(newAlbum, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save album' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing album ID' }, { status: 400 });
    if (id === 'default') return NextResponse.json({ error: 'Cannot delete default album' }, { status: 400 });
    
    let albums = await readAlbums();
    albums = albums.filter((a) => a.id !== id);
    await writeAlbums(albums);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const databasePath = path.join(process.cwd(), 'database');
const uploadsPath = path.join(process.cwd(), 'public', 'uploads');

export async function GET() {
  try {
    const zip = new AdmZip();

    // Add database directory
    if (existsSync(databasePath)) {
      zip.addLocalFolder(databasePath, 'database');
    }

    // Add uploads directory
    if (existsSync(uploadsPath)) {
      zip.addLocalFolder(uploadsPath, 'public/uploads');
    }

    const zipBuffer = zip.toBuffer();

    // Return the zip file
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename=PromptStudio_Backup_${new Date().toISOString().replace(/[:.]/g, '')}.zip`);
    headers.set('Content-Length', zipBuffer.length.toString());

    return new NextResponse(zipBuffer, { status: 200, headers });
  } catch (error) {
    console.error("Archive export error:", error);
    return NextResponse.json({ error: 'Failed to create archive' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);

    // Validate the zip file structure before extracting (optional, but good practice)
    const zipEntries = zip.getEntries();
    const hasDatabase = zipEntries.some(entry => entry.entryName.startsWith('database/'));
    
    if (!hasDatabase) {
      return NextResponse.json({ error: 'Invalid archive format. Missing database directory.' }, { status: 400 });
    }

    // Dangerous operation: wipe existing data
    if (existsSync(databasePath)) {
      await fs.rm(databasePath, { recursive: true, force: true });
    }
    if (existsSync(uploadsPath)) {
      await fs.rm(uploadsPath, { recursive: true, force: true });
    }

    // Recreate directories
    await fs.mkdir(databasePath, { recursive: true });
    await fs.mkdir(uploadsPath, { recursive: true });

    // Extract all
    zip.extractAllTo(process.cwd(), true);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Archive import error:", error);
    return NextResponse.json({ error: 'Failed to process archive' }, { status: 500 });
  }
}

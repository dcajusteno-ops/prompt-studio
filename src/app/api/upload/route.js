import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure the upload directory exists
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (typeof file === 'string') continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Create a unique filename to avoid overwrites
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.name);
      const baseName = path.basename(file.name, ext);
      const filename = `${baseName}-${uniqueSuffix}${ext}`;
      
      const filePath = path.join(uploadDir, filename);
      
      await fs.writeFile(filePath, buffer);
      
      uploadedFiles.push({
        originalName: file.name,
        filename: filename,
        url: `/uploads/${filename}`,
        size: file.size,
        type: file.type
      });
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

type SessionUser = { role?: string };

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

/** GET — download a backup file */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as SessionUser | undefined)?.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const fileName = request.nextUrl.searchParams.get('file');
  if (!fileName) {
    return NextResponse.json({ error: '缺少文件名参数' }, { status: 400 });
  }

  // Security: prevent path traversal, only allow .sql files from backups dir
  const baseName = path.basename(fileName);
  if (baseName !== fileName || !baseName.endsWith('.sql') || baseName.includes('..')) {
    return NextResponse.json({ error: '无效的文件名' }, { status: 400 });
  }

  const filePath = path.join(BACKUPS_DIR, baseName);

  // Ensure resolved path is within backups dir
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(BACKUPS_DIR))) {
    return NextResponse.json({ error: '无效的文件路径' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  const content = fs.readFileSync(filePath);

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'application/sql; charset=utf-8',
      'Content-Disposition': `attachment; filename="${baseName}"`,
    },
  });
}

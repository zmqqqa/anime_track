import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

type SessionUser = { role?: string };

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

/** GET — list backup files */
export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as SessionUser | undefined)?.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  if (!fs.existsSync(BACKUPS_DIR)) {
    return NextResponse.json({ backups: [] });
  }

  const files = fs.readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .reverse()
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, name));
      return {
        name,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    });

  return NextResponse.json({ backups: files });
}

/** POST — create a new backup */
export async function POST() {
  const session = await getServerSession(authOptions);
  if ((session?.user as SessionUser | undefined)?.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  try {
    const scriptPath = path.join(process.cwd(), 'scripts/db/scheduled_backup.js');
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      timeout: 30000,
    });

    const output = (stdout + '\n' + stderr).trim();

    // Find the newly created file
    const match = output.match(/备份完成: (.+\.sql)/);
    const fileName = match?.[1] || null;

    let fileInfo = null;
    if (fileName) {
      const filePath = path.join(BACKUPS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        fileInfo = { name: fileName, size: stat.size, createdAt: stat.mtime.toISOString() };
      }
    }

    return NextResponse.json({ success: true, backup: fileInfo, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : '备份失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — delete a backup file */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as SessionUser | undefined)?.role !== 'admin') {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: '缺少文件名' }, { status: 400 });
  }

  // Security: only allow .sql files from backups dir, no path traversal
  const baseName = path.basename(name);
  if (baseName !== name || !baseName.endsWith('.sql') || baseName.includes('..')) {
    return NextResponse.json({ error: '无效的文件名' }, { status: 400 });
  }

  const filePath = path.join(BACKUPS_DIR, baseName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  fs.unlinkSync(filePath);
  return NextResponse.json({ success: true });
}

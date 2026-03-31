import bcrypt from 'bcrypt';
import { query } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';

interface ExistingUserRow {
  id: number;
}

export async function POST(request: Request) {
  try {
    const { username, password, name } = await request.json();

    if (!username || !password) {
      return apiError('请提供用户名和密码', 400);
    }

    // 检查用户是否已存在
    const existingUsers = await query<ExistingUserRow[]>('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers && existingUsers.length > 0) {
      return apiError('用户名已存在', 400);
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 插入新用户
    await query(
      'INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)',
      [username, passwordHash, name || username]
    );

    return apiSuccess({ message: '注册成功' }, 201);
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return apiError('注册过程中出现错误', 500);
  }
}

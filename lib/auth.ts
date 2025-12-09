import {cookies} from 'next/headers';
import jwt from 'jsonwebtoken';

export async function getCurrentUser() {
  try {

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}
import {cookies} from 'next/headers';
import jwt from 'jsonwebtoken';

export type Role = 'user'|'owner'|'driver'|'admin';
export interface CurrentUser{
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export async function getCurrentUser():Promise<CurrentUser | null > {
  try {

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return {
      userId: decoded.userId,
      email: decoded.email,
      name : decoded.name,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}
export function hasRole(
  user: CurrentUser | null,
  allow: Role[]
):boolean{
  if(!user) return false;
  return allow.includes(user.role);
}
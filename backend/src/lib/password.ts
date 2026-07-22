import bcrypt from 'bcrypt';
import { config } from '../config';

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, config.auth.bcryptCost);

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

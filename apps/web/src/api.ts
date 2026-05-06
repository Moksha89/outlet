import axios from 'axios';
import { io, Socket } from 'socket.io-client';

import type { User } from './types';

export const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? 'http://outlet.andhrawala.ae' : 'http://localhost:4000');

export const api = axios.create({ baseURL: API_URL });

export function setToken(token: string | null): void {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function connectRealtime(user: User, token: string): Socket {
  return io(API_URL, {
    auth: { token, userId: user.id, role: user.role, outletId: user.outlet_id },
  });
}

export function money(value: number | null | undefined): string {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

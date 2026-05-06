import admin from 'firebase-admin';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';

import { db, nowIso } from './db.js';
import type { NotificationType } from './types.js';

let io: Server | null = null;
let firebaseReady = false;

export function setRealtime(server: Server): void {
  io = server;
}

export function initFirebase(): void {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || firebaseReady) return;
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'),
  ) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FCM_PROJECT_ID,
  });
  firebaseReady = true;
}

interface NotifyInput {
  userId?: string | null;
  outletId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, string>;
}

export async function notify(input: NotifyInput): Promise<void> {
  const id = uuid();
  db.prepare(
    `INSERT INTO notifications (id, user_id, outlet_id, title, message, type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId ?? null,
    input.outletId ?? null,
    input.title,
    input.message,
    input.type,
    nowIso(),
  );

  const notification = { id, ...input, is_read: 0, created_at: nowIso() };
  if (input.userId) io?.to(`user:${input.userId}`).emit('notification.created', notification);
  if (input.outletId) io?.to(`outlet:${input.outletId}`).emit('notification.created', notification);
  io?.to('admins').emit('notification.created', notification);

  if (!firebaseReady) return;
  const tokens = db
    .prepare(
      `SELECT fcm_token FROM users
       WHERE fcm_token IS NOT NULL
         AND (? IS NULL OR id = ?)
         AND (? IS NULL OR outlet_id = ?)`,
    )
    .all(input.userId ?? null, input.userId ?? null, input.outletId ?? null, input.outletId ?? null) as {
    fcm_token: string;
  }[];

  await Promise.allSettled(
    tokens.map((row) =>
      admin.messaging().send({
        token: row.fcm_token,
        notification: { title: input.title, body: input.message },
        data: input.data ?? {},
      }),
    ),
  );
}

export function emitBusinessUpdate(event: string, payload: unknown): void {
  io?.to('admins').emit(event, payload);
  if (
    payload &&
    typeof payload === 'object' &&
    'outlet_id' in payload &&
    typeof payload.outlet_id === 'string'
  ) {
    io?.to(`outlet:${payload.outlet_id}`).emit(event, payload);
  }
}

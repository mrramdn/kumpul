import type { PoolClient } from "pg";
import { query, transaction } from "./db";
import { ApiError } from "./http";
import type { EventInput } from "./validation";

// Semua query SQL untuk acara dan pendaftaran ada di file ini. Nilai dari pengguna selalu dikirim
// sebagai parameter ($1, $2, ...), tidak pernah digabung ke teks SQL, supaya aman dari SQL injection.
// Hak akses dicek di sini juga: hanya pemilik acara (atau admin) yang boleh mengubah atau menghapusnya.

/** Siapa yang melakukan perubahan: id akun dan apakah akun itu admin. */
export type Actor = { id: string; isAdmin: boolean };

export type Event = {
  id: string;
  ownerId: string;
  title: string;
  host: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  registeredCount: number;
  /** Nama tiga pendaftar pertama, untuk avatar di kartu acara. */
  firstAttendees: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type Registration = {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  createdAt: Date;
};

export type EventFilter = "upcoming" | "past" | "all";

type EventRow = {
  id: string;
  owner_id: string;
  title: string;
  host: string;
  description: string;
  location: string;
  starts_at: Date;
  ends_at: Date;
  capacity: number | null;
  registered_count: number;
  first_attendees: string[];
  created_at: Date;
  updated_at: Date;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: Date;
};

const SELECT_EVENT = `
  SELECT e.id, e.owner_id, e.title, e.host, e.description, e.location, e.starts_at, e.ends_at, e.capacity,
         e.created_at, e.updated_at,
         (SELECT count(*) FROM registrations r WHERE r.event_id = e.id) AS registered_count,
         ARRAY(SELECT u.name FROM registrations r JOIN users u ON u.id = r.user_id
               WHERE r.event_id = e.id ORDER BY r.created_at, r.id LIMIT 3) AS first_attendees
  FROM events e`;

const SELECT_REGISTRATION = `
  SELECT r.id, r.event_id, r.user_id, u.name, u.email, r.created_at
  FROM registrations r
  JOIN users u ON u.id = r.user_id`;

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    host: row.host,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    registeredCount: row.registered_count,
    firstAttendees: row.first_attendees,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRegistration(row: RegistrationRow): Registration {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

const eventNotFound = () => new ApiError(404, "EVENT_NOT_FOUND");

export async function listEvents(filter: EventFilter = "all") {
  // "Akan datang" termasuk acara yang sedang berlangsung (belum selesai).
  const where = { upcoming: "WHERE e.ends_at >= now()", past: "WHERE e.ends_at < now()", all: "" }[filter];
  const order = filter === "past" ? "e.starts_at DESC" : "e.starts_at ASC";
  const rows = await query<EventRow>(`${SELECT_EVENT} ${where} ORDER BY ${order}, e.id`);
  return rows.map(toEvent);
}

/** Acara yang dibuat akun ini. */
export async function listEventsOwnedBy(userId: string) {
  const rows = await query<EventRow>(`${SELECT_EVENT} WHERE e.owner_id = $1 ORDER BY e.starts_at DESC, e.id`, [userId]);
  return rows.map(toEvent);
}

/** Acara yang diikuti akun ini. */
export async function listEventsAttendedBy(userId: string) {
  const rows = await query<EventRow>(
    `${SELECT_EVENT}
     WHERE EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.user_id = $1)
     ORDER BY e.starts_at DESC, e.id`,
    [userId],
  );
  return rows.map(toEvent);
}

export async function getEvent(id: string) {
  const [row] = await query<EventRow>(`${SELECT_EVENT} WHERE e.id = $1`, [id]);
  return row ? toEvent(row) : null;
}

export async function eventExists(id: string) {
  const rows = await query("SELECT 1 FROM events WHERE id = $1", [id]);
  return rows.length > 0;
}

export async function createEvent(ownerId: string, input: EventInput) {
  const [row] = await query<{ id: string }>(
    `INSERT INTO events (owner_id, title, host, description, location, starts_at, ends_at, capacity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [ownerId, input.title, input.host, input.description, input.location, input.startsAt, input.endsAt, input.capacity],
  );
  return (await getEvent(row.id))!;
}

async function countRegistrations(client: PoolClient, eventId: string) {
  const { rows } = await client.query<{ count: number }>("SELECT count(*) FROM registrations WHERE event_id = $1", [
    eventId,
  ]);
  return rows[0].count;
}

/**
 * Mengunci baris acara sampai transaksi selesai (FOR UPDATE), jadi jumlah pendaftar tidak bisa berubah
 * di tengah pengecekan kuota, lalu memastikan akun ini pemiliknya (atau admin).
 */
async function lockOwnedEvent(client: PoolClient, eventId: string, actor: Actor) {
  const { rows } = await client.query<{ owner_id: string }>("SELECT owner_id FROM events WHERE id = $1 FOR UPDATE", [
    eventId,
  ]);
  if (rows.length === 0) throw eventNotFound();
  if (rows[0].owner_id !== actor.id && !actor.isAdmin) throw new ApiError(403, "NOT_EVENT_OWNER");
}

export async function updateEvent(id: string, actor: Actor, input: EventInput) {
  await transaction(async (client) => {
    await lockOwnedEvent(client, id, actor);
    const registered = await countRegistrations(client, id);
    if (input.capacity !== null && input.capacity < registered) {
      throw new ApiError(409, "CAPACITY_BELOW_REGISTERED", { values: { count: registered }, field: "capacity" });
    }
    await client.query(
      `UPDATE events
       SET title = $2, host = $3, description = $4, location = $5,
           starts_at = $6, ends_at = $7, capacity = $8, updated_at = now()
       WHERE id = $1`,
      [id, input.title, input.host, input.description, input.location, input.startsAt, input.endsAt, input.capacity],
    );
  });
  return (await getEvent(id))!;
}

export async function deleteEvent(id: string, actor: Actor) {
  // Pendaftarnya ikut terhapus karena foreign key memakai ON DELETE CASCADE.
  await transaction(async (client) => {
    await lockOwnedEvent(client, id, actor);
    await client.query("DELETE FROM events WHERE id = $1", [id]);
  });
}

export async function listRegistrations(eventId: string) {
  const rows = await query<RegistrationRow>(
    `${SELECT_REGISTRATION} WHERE r.event_id = $1 ORDER BY r.created_at, r.id`,
    [eventId],
  );
  return rows.map(toRegistration);
}

export async function findRegistration(eventId: string, userId: string) {
  const [row] = await query<RegistrationRow>(`${SELECT_REGISTRATION} WHERE r.event_id = $1 AND r.user_id = $2`, [
    eventId,
    userId,
  ]);
  return row ? toRegistration(row) : null;
}

/** Akun yang sedang masuk mendaftarkan dirinya sendiri ke acara. */
export async function createRegistration(eventId: string, userId: string) {
  try {
    const id = await transaction(async (client) => {
      const { rows } = await client.query<{ capacity: number | null; ended: boolean }>(
        "SELECT capacity, ends_at < now() AS ended FROM events WHERE id = $1 FOR UPDATE",
        [eventId],
      );
      const event = rows[0];
      if (!event) throw eventNotFound();
      if (event.ended) throw new ApiError(409, "EVENT_ENDED");
      // Dicek sebelum kuota: orang yang sudah terdaftar lebih perlu tahu itu daripada "kuota penuh".
      const existing = await client.query("SELECT 1 FROM registrations WHERE event_id = $1 AND user_id = $2", [
        eventId,
        userId,
      ]);
      if (existing.rowCount) throw new ApiError(409, "ALREADY_REGISTERED");
      if (event.capacity !== null && (await countRegistrations(client, eventId)) >= event.capacity) {
        throw new ApiError(409, "EVENT_FULL");
      }
      const inserted = await client.query<{ id: string }>(
        "INSERT INTO registrations (event_id, user_id) VALUES ($1, $2) RETURNING id",
        [eventId, userId],
      );
      return inserted.rows[0].id;
    });
    return (await findRegistrationById(id))!;
  } catch (error) {
    // Jaring pengaman: constraint registrations_once_per_user di database (23505 = unique_violation)
    // tetap menolak pendaftaran ganda walaupun pengecekan di atas terlewat.
    if ((error as { code?: unknown }).code === "23505") throw new ApiError(409, "ALREADY_REGISTERED");
    throw error;
  }
}

async function findRegistrationById(id: string) {
  const [row] = await query<RegistrationRow>(`${SELECT_REGISTRATION} WHERE r.id = $1`, [id]);
  return row ? toRegistration(row) : null;
}

/** Peserta membatalkan pendaftarannya sendiri, atau pemilik acara (atau admin) menghapus peserta. */
export async function deleteRegistration(eventId: string, registrationId: string, actor: Actor) {
  const rows = await query<{ registrant: string; owner: string }>(
    `SELECT r.user_id AS registrant, e.owner_id AS owner
     FROM registrations r
     JOIN events e ON e.id = r.event_id
     WHERE r.id = $1 AND r.event_id = $2`,
    [registrationId, eventId],
  );
  if (rows.length === 0) throw new ApiError(404, "REGISTRATION_NOT_FOUND");
  const allowed = actor.isAdmin || rows[0].registrant === actor.id || rows[0].owner === actor.id;
  if (!allowed) throw new ApiError(403, "NOT_EVENT_OWNER");
  await query("DELETE FROM registrations WHERE id = $1", [registrationId]);
}

import type { PoolClient } from "pg";
import { query, transaction } from "./db";
import { ApiError } from "./http";
import type { EventInput, RegistrationInput } from "./validation";

// Semua query SQL aplikasi ada di file ini. Nilai dari pengguna selalu dikirim sebagai parameter
// ($1, $2, ...), tidak pernah digabung ke teks SQL, supaya aman dari SQL injection.

export type Event = {
  id: string;
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
  name: string;
  email: string;
  createdAt: Date;
};

export type EventFilter = "upcoming" | "past" | "all";

type EventRow = {
  id: string;
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
  name: string;
  email: string;
  created_at: Date;
};

const SELECT_EVENT = `
  SELECT e.id, e.title, e.host, e.description, e.location, e.starts_at, e.ends_at, e.capacity,
         e.created_at, e.updated_at,
         (SELECT count(*) FROM registrations r WHERE r.event_id = e.id) AS registered_count,
         ARRAY(SELECT r.name FROM registrations r WHERE r.event_id = e.id
               ORDER BY r.created_at, r.id LIMIT 3) AS first_attendees
  FROM events e`;

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
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
  return { id: row.id, eventId: row.event_id, name: row.name, email: row.email, createdAt: row.created_at };
}

const eventNotFound = () => new ApiError(404, "EVENT_NOT_FOUND");

export async function listEvents(filter: EventFilter = "all") {
  // "Akan datang" termasuk acara yang sedang berlangsung (belum selesai).
  const where = { upcoming: "WHERE e.ends_at >= now()", past: "WHERE e.ends_at < now()", all: "" }[filter];
  const order = filter === "past" ? "e.starts_at DESC" : "e.starts_at ASC";
  const rows = await query<EventRow>(`${SELECT_EVENT} ${where} ORDER BY ${order}, e.id`);
  return rows.map(toEvent);
}

export async function getEvent(id: string) {
  const [row] = await query<EventRow>(`${SELECT_EVENT} WHERE e.id = $1`, [id]);
  return row ? toEvent(row) : null;
}

export async function createEvent(input: EventInput) {
  const [row] = await query<{ id: string }>(
    `INSERT INTO events (title, host, description, location, starts_at, ends_at, capacity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [input.title, input.host, input.description, input.location, input.startsAt, input.endsAt, input.capacity],
  );
  return (await getEvent(row.id))!;
}

async function countRegistrations(client: PoolClient, eventId: string) {
  const { rows } = await client.query<{ count: number }>("SELECT count(*) FROM registrations WHERE event_id = $1", [
    eventId,
  ]);
  return rows[0].count;
}

export async function updateEvent(id: string, input: EventInput) {
  await transaction(async (client) => {
    // FOR UPDATE mengunci baris acara sampai transaksi selesai, jadi jumlah pendaftar
    // tidak bisa berubah di tengah pengecekan kapasitas.
    const locked = await client.query("SELECT id FROM events WHERE id = $1 FOR UPDATE", [id]);
    if (locked.rowCount === 0) throw eventNotFound();

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

export async function deleteEvent(id: string) {
  // Pendaftarnya ikut terhapus karena foreign key memakai ON DELETE CASCADE.
  const rows = await query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);
  if (rows.length === 0) throw eventNotFound();
}

export async function eventExists(id: string) {
  const rows = await query("SELECT 1 FROM events WHERE id = $1", [id]);
  return rows.length > 0;
}

export async function listRegistrations(eventId: string) {
  const rows = await query<RegistrationRow>(
    `SELECT id, event_id, name, email, created_at
     FROM registrations
     WHERE event_id = $1
     ORDER BY created_at, id`,
    [eventId],
  );
  return rows.map(toRegistration);
}

export async function createRegistration(eventId: string, input: RegistrationInput) {
  try {
    return await transaction(async (client) => {
      const { rows } = await client.query<{ capacity: number | null; ended: boolean }>(
        "SELECT capacity, ends_at < now() AS ended FROM events WHERE id = $1 FOR UPDATE",
        [eventId],
      );
      const event = rows[0];
      if (!event) throw eventNotFound();
      if (event.ended) throw new ApiError(409, "EVENT_ENDED");
      // Dicek sebelum kuota: orang yang sudah terdaftar lebih perlu tahu itu daripada "kuota penuh".
      const existing = await client.query("SELECT 1 FROM registrations WHERE event_id = $1 AND email = $2", [
        eventId,
        input.email,
      ]);
      if (existing.rowCount) throw new ApiError(409, "ALREADY_REGISTERED", { field: "email" });
      if (event.capacity !== null && (await countRegistrations(client, eventId)) >= event.capacity) {
        throw new ApiError(409, "EVENT_FULL");
      }

      const inserted = await client.query<RegistrationRow>(
        `INSERT INTO registrations (event_id, name, email)
         VALUES ($1, $2, $3)
         RETURNING id, event_id, name, email, created_at`,
        [eventId, input.name, input.email],
      );
      return toRegistration(inserted.rows[0]);
    });
  } catch (error) {
    // Jaring pengaman: constraint registrations_one_per_email di database (23505 = unique_violation)
    // tetap menolak email ganda walaupun pengecekan di atas terlewat.
    if ((error as { code?: unknown }).code === "23505") {
      throw new ApiError(409, "ALREADY_REGISTERED", { field: "email" });
    }
    throw error;
  }
}

export async function deleteRegistration(eventId: string, registrationId: string) {
  const rows = await query("DELETE FROM registrations WHERE id = $1 AND event_id = $2 RETURNING id", [
    registrationId,
    eventId,
  ]);
  if (rows.length === 0) throw new ApiError(404, "REGISTRATION_NOT_FOUND");
}

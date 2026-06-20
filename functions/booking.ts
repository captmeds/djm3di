interface Env {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_WHATSAPP_FROM: string;
  TWILIO_WHATSAPP_TEMPLATE_SID?: string;
  TURNSTILE_SECRET_KEY: string;
  BOOKING_WHATSAPP_TO: string;
}

interface BookingPayload {
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  contact_method?: string;
  country: string;
  event_name?: string;
  event_type: string;
  event_date: string;
  flexible_date?: boolean;
  venue_name?: string;
  venue_city: string;
  venue_country: string;
  attendance?: string;
  indoor_outdoor?: string;
  set_type?: string;
  set_length?: string;
  set_slot?: string;
  genres?: string[];
  other_artists?: string;
  budget_currency?: string;
  budget?: string;
  travel_covered?: string;
  accommodation_covered?: string;
  visa_assistance?: string;
  sound_system?: string;
  rider_acknowledged?: boolean;
  hear_about?: string;
  event_link?: string;
  message?: string;
  turnstile_token?: string;
}

// Simple in-memory rate limiting per IP (resets on Worker restart, per-isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

function formatWhatsAppMessage(d: BookingPayload): string {
  const lines = [
    '🎧 *NEW DJ BOOKING INQUIRY — DJ M3DI*',
    '',
    '*CONTACT*',
    `Name: ${d.full_name}`,
    `Email: ${d.email}`,
    d.phone ? `Phone: ${d.phone}` : null,
    d.company ? `Company: ${d.company}` : null,
    d.role ? `Role: ${d.role}` : null,
    d.contact_method ? `Preferred contact: ${d.contact_method}` : null,
    `Country: ${d.country}`,
    '',
    '*EVENT*',
    d.event_name ? `Event name: ${d.event_name}` : null,
    `Type: ${d.event_type}`,
    `Date: ${d.event_date}${d.flexible_date ? ' (flexible)' : ''}`,
    d.venue_name ? `Venue: ${d.venue_name}` : null,
    `City / Country: ${d.venue_city}, ${d.venue_country}`,
    d.attendance ? `Attendance: ${d.attendance}` : null,
    d.indoor_outdoor ? `Indoor/Outdoor: ${d.indoor_outdoor}` : null,
    '',
    '*PERFORMANCE*',
    d.set_type ? `Set type: ${d.set_type}` : null,
    d.set_length ? `Set length: ${d.set_length}h` : null,
    d.set_slot ? `Time slot: ${d.set_slot}` : null,
    d.genres && d.genres.length > 0 ? `Genres: ${d.genres.join(', ')}` : null,
    d.other_artists ? `Other artists: ${d.other_artists}` : null,
    '',
    '*COMMERCIALS*',
    d.budget ? `Fee offered: ${d.budget_currency ?? 'USD'} ${d.budget}` : null,
    d.travel_covered ? `Travel: ${d.travel_covered}` : null,
    d.accommodation_covered ? `Accommodation: ${d.accommodation_covered}` : null,
    d.visa_assistance ? `Visa assistance: ${d.visa_assistance}` : null,
    d.sound_system ? `Sound system: ${d.sound_system}` : null,
    d.rider_acknowledged ? 'Technical rider: Acknowledged' : null,
    '',
    d.hear_about ? `*Heard via:* ${d.hear_about}` : null,
    d.event_link ? `*Event link:* ${d.event_link}` : null,
    d.message ? `*Notes:*\n${d.message}` : null,
    '',
    '─────────────────────',
    'Sent via djm3di.com booking form',
  ];

  return lines.filter(Boolean).join('\n');
}

async function sendWhatsApp(
  env: Env,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const body = new URLSearchParams({
    From: env.TWILIO_WHATSAPP_FROM,
    To: env.BOOKING_WHATSAPP_TO,
    Body: message,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const errData = await res.json() as { message?: string; code?: number };
    const errMsg = `Twilio error ${res.status}: ${errData.message ?? 'unknown'} (code ${errData.code ?? 'n/a'})`;
    console.error(errMsg);
    return { ok: false, error: errMsg };
  }

  return { ok: true };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // ── Method guard (belt-and-suspenders) ──
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed.' }, 405);
  }

  // ── Rate limiting ──
  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return jsonResponse({ success: false, message: 'Too many requests. Please try again later.' }, 429);
  }

  // ── Parse body ──
  let payload: BookingPayload;
  try {
    payload = await request.json() as BookingPayload;
  } catch {
    return jsonResponse({ success: false, message: 'Invalid request body.' }, 400);
  }

  // ── Honeypot (server-side check) ──
  // Client sends 'website' field value; bots fill it, humans don't.
  // (Honeypot field is not in BookingPayload; if present in raw JSON, it would surface here.)
  const raw = payload as Record<string, unknown>;
  if (raw['website'] && String(raw['website']).trim().length > 0) {
    // Silent 200 to confuse bots
    return jsonResponse({ success: true });
  }

  // ── Required field validation ──
  const required: Array<keyof BookingPayload> = [
    'full_name', 'email', 'country', 'event_type', 'event_date', 'venue_city', 'venue_country',
  ];
  for (const field of required) {
    const val = payload[field];
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      return jsonResponse({ success: false, message: `Missing required field: ${field}.` }, 400);
    }
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(payload.email)) {
    return jsonResponse({ success: false, message: 'Invalid email address.' }, 400);
  }

  // ── Turnstile verification ──
  const turnstileOk = await verifyTurnstile(
    payload.turnstile_token ?? '',
    env.TURNSTILE_SECRET_KEY ?? '',
    ip,
  );
  if (!turnstileOk) {
    return jsonResponse({ success: false, message: 'Bot protection check failed. Please refresh and try again.' }, 403);
  }

  // ── Format & send WhatsApp ──
  const message = formatWhatsAppMessage(payload);
  const result = await sendWhatsApp(env, message);

  if (!result.ok) {
    return jsonResponse(
      { success: false, message: 'Failed to deliver your inquiry. Please try again shortly.' },
      502,
    );
  }

  return jsonResponse({ success: true });
};

// Reject all other methods
export const onRequest: PagesFunction<Env> = async () => {
  return jsonResponse({ success: false, message: 'Method not allowed.' }, 405);
};

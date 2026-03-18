// Supabase Edge Function — Envia push notifications agendadas
// Deploy: supabase functions deploy push-notifications
// Cron: supabase functions schedule push-notifications "*/15 * * * *"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC  = "BKbbrvaRRSGvmJwSQp-aQjsrNrlJid3k9bYXVSAlavsZXRKfrfSPDS6JnsfaNPbHks78J4Ejo2P9m_63PIuMduY";
const VAPID_PRIVATE = "rd_tEq7gPieU3vQwOtu1ZUihHwtp372dSrsTFTmzh5E";
const VAPID_SUBJECT = "mailto:admin@bulkingpro.app";

Deno.serve(async (req) => {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pega todas as subscrições ativas
    const { data: subs } = await sb.from("push_subscriptions").select("*");
    if (!subs?.length) return new Response("No subscribers", { status: 200 });

    const now = new Date();
    const hhmm = now.toTimeString().slice(0,5); // "HH:MM"

    // Horários de refeição conhecidos
    const mealTimes = ["12:30","15:30","18:00","21:00","23:00","03:00","06:30","08:30","11:30","16:30","20:00","22:30"];
    const isMealTime = mealTimes.includes(hhmm);

    const results = [];
    for (const sub of subs) {
      const msgs = [];

      if (isMealTime) {
        msgs.push({ title: "🍽️ Hora de comer!", body: `${hhmm} — Verifique sua próxima refeição no app.` });
      }

      // Verifica água (envia se não registrou nas últimas 1h — simplificado)
      const { count: waterCount } = await sb.from("water_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", sub.user_id)
        .eq("data", now.toISOString().slice(0,10))
        .gte("created_at", new Date(Date.now() - 3600000).toISOString());

      const hour = now.getHours();
      if ((waterCount ?? 0) === 0 && hour >= 8 && hour <= 22 && !isMealTime) {
        msgs.push({ title: "💧 Beba água!", body: "Você não registrou água na última hora. Mantenha-se hidratado!" });
      }

      for (const msg of msgs) {
        try {
          await sendPush(sub.endpoint, sub.p256dh, sub.auth, msg.title, msg.body);
          results.push({ user: sub.user_id, ok: true });
        } catch (e) {
          // Subscrição inválida — remove
          if (e.message?.includes("410") || e.message?.includes("404")) {
            await sb.from("push_subscriptions").delete().eq("id", sub.id);
          }
          results.push({ user: sub.user_id, ok: false, err: e.message });
        }
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

// ── Web Push com VAPID ──────────────────────────────────────────
async function sendPush(endpoint: string, p256dh: string, auth: string, title: string, body: string) {
  const payload = JSON.stringify({ title, body, icon: "/icon-192.png", badge: "/icon-notif.png" });

  // Importa chave privada VAPID
  const privKeyBytes = base64UrlDecode(VAPID_PRIVATE);
  const privKey = await crypto.subtle.importKey(
    "raw", privKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false, ["deriveKey", "deriveBits"]
  );

  // JWT VAPID
  const vapidJwt = await buildVapidJwt(endpoint, privKey);
  const pubKeyB64 = VAPID_PUBLIC;

  // Criptografia ECDH + AES-GCM
  const encrypted = await encryptPayload(payload, p256dh, auth);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${vapidJwt},k=${pubKeyB64}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
    },
    body: encrypted,
  });

  if (!res.ok && res.status !== 201) {
    throw new Error(`Push failed: ${res.status}`);
  }
}

async function buildVapidJwt(endpoint: string, privKey: CryptoKey): Promise<string> {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header  = base64UrlEncode(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = base64UrlEncode(JSON.stringify({ aud, exp, sub: VAPID_SUBJECT }));
  const msg = `${header}.${payload}`;

  const signKey = await crypto.subtle.importKey(
    "raw", base64UrlDecode(VAPID_PRIVATE),
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signKey,
    new TextEncoder().encode(msg)
  );
  return `${msg}.${base64UrlEncode(new Uint8Array(sig))}`;
}

async function encryptPayload(payload: string, p256dhB64: string, authB64: string): Promise<Uint8Array> {
  const p256dh = base64UrlDecode(p256dhB64);
  const authSecret = base64UrlDecode(authB64);
  const payloadBytes = new TextEncoder().encode(payload);

  // Gera chave efêmera
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ephPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  const serverKey = await crypto.subtle.importKey("raw", p256dh, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: serverKey }, ephemeral.privateKey, 256));

  // Salt aleatório 16 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF
  const prk = await hkdf(authSecret, sharedBits, concat(new TextEncoder().encode("WebPush: info\x00"), p256dh, ephPubRaw), 32);
  const cek = await hkdf(salt, prk, new TextEncoder().encode("Content-Encoding: aes128gcm\x00"), 16);
  const nonce = await hkdf(salt, prk, new TextEncoder().encode("Content-Encoding: nonce\x00"), 12);

  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concat(payloadBytes, new Uint8Array([2])); // padding delimiter
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, padded));

  // RFC 8188 header: salt(16) + rs(4) + keyid_len(1) + keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(salt, rs, new Uint8Array([ephPubRaw.length]), ephPubRaw, ciphertext);
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), ikm));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, concat(info, new Uint8Array([1]))));
  return okm.slice(0, len);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function base64UrlDecode(s: string): Uint8Array {
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
}

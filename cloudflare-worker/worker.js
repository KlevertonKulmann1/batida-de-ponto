/**
 * Cloudflare Worker para Lembretes de Ponto via Web Push
 * 100% autônomo, sem dependências externas, usando Web Crypto API.
 */

// =========================================================================
// CHAVES VAPID (Geradas exclusivamente para o seu projeto)
// =========================================================================
const VAPID_KEYS = {
  publicKey: 'BMByAAvpIK5HGGYz8_68rjv6oNv7UmKogE7QrVmrkOkgar0CLFl6Cqa0YvxSM-i5r6lF6FNOBdnykOZgnOY2Kag',
  privateKey: 'zFmjq_jmBwKLYxJLKFuvb0YojDHsVBzthQRC7T6u4h4',
  subject: 'mailto:kleverton.kulmann1@gmail.com'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export default {
  /**
   * Manipulador de requisições HTTP (API)
   */
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // 1. Status / Health Check
      if (url.pathname === '/' || url.pathname === '/api/status') {
        return new Response(JSON.stringify({
          status: 'online',
          message: 'Serviço de Push para Controle de Ponto ativo!',
          vapidPublicKey: VAPID_KEYS.publicKey,
          timestamp: new Date().toISOString()
        }), { headers: CORS_HEADERS });
      }

      // 2. Registrar/Atualizar Assinatura e Grade de Horários
      if (url.pathname === '/api/subscribe' && request.method === 'POST') {
        const body = await request.json();
        const { subscription, schedule, timezone = 'America/Sao_Paulo' } = body;

        if (!subscription || !subscription.endpoint) {
          return new Response(JSON.stringify({ error: 'Assinatura inválida' }), { status: 400, headers: CORS_HEADERS });
        }

        const dataToSave = {
          subscription,
          schedule: schedule || {},
          timezone,
          updatedAt: new Date().toISOString()
        };

        // Salva no KV se configurado
        if (env.PONTO_KV) {
          await env.PONTO_KV.put('user_subscription', JSON.stringify(dataToSave));
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Celular cadastrado com sucesso para receber notificações!'
        }), { headers: CORS_HEADERS });
      }

      // 3. Teste Imediato de Notificação
      if (url.pathname === '/api/test' && request.method === 'POST') {
        const body = await request.json();
        let sub = body.subscription;

        if (!sub && env.PONTO_KV) {
          const saved = await env.PONTO_KV.get('user_subscription', 'json');
          if (saved) sub = saved.subscription;
        }

        if (!sub) {
          return new Response(JSON.stringify({ error: 'Nenhuma assinatura informada para teste' }), { status: 400, headers: CORS_HEADERS });
        }

        const payload = JSON.stringify({
          title: 'Controle de Ponto ⏰',
          body: 'Teste recebido com sucesso! O seu celular está pronto para os lembretes.',
          icon: './assets/alert-icon.png',
          url: './index.html'
        });

        await sendWebPush(sub, payload, VAPID_KEYS);

        return new Response(JSON.stringify({
          success: true,
          message: 'Notificação de teste disparada com sucesso para o seu celular!'
        }), { headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify({ error: 'Rota não encontrada' }), { status: 404, headers: CORS_HEADERS });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500, headers: CORS_HEADERS });
    }
  },

  /**
   * Gatilho Agendado (Cron Trigger - roda a cada minuto)
   */
  async scheduled(event, env, ctx) {
    if (!env.PONTO_KV) return;

    const data = await env.PONTO_KV.get('user_subscription', 'json');
    if (!data || !data.subscription || !data.schedule) return;

    const tz = data.timezone || 'America/Sao_Paulo';
    const now = new Date();

    // Formata o horário atual no fuso do usuário (ex: "11:30" e "segunda")
    const formatterTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const currentTime = formatterTime.format(now);

    const formatterDay = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      weekday: 'long'
    });
    // Normaliza: "segunda-feira" -> "segunda", "terça-feira" -> "terca"
    let currentDay = formatterDay.format(now).toLowerCase().split('-')[0];
    currentDay = currentDay.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const daySchedule = data.schedule[currentDay];
    if (!daySchedule || !daySchedule.times || !daySchedule.times.includes(currentTime)) {
      return; // Não é horário de bater ponto agora
    }

    // Evita enviar push duplicado dentro do mesmo minuto
    const lastSentKey = `last_sent_${currentDay}_${currentTime}`;
    const alreadySent = await env.PONTO_KV.get(lastSentKey);
    if (alreadySent) return;

    // Dispara a Notificação Push
    const payload = JSON.stringify({
      title: 'Hora de Bater o Ponto! ⏰',
      body: `Horário previsto: ${currentTime}. Toque aqui para registrar agora.`,
      icon: './assets/alert-icon.png',
      url: './index.html?punch=1'
    });

    await sendWebPush(data.subscription, payload, VAPID_KEYS);

    // Marca como enviado por 3 minutos no KV
    await env.PONTO_KV.put(lastSentKey, '1', { expirationTtl: 180 });
  }
};

// =========================================================================
// IMPLEMENTAÇÃO CRIPTOGRÁFICA DO WEB PUSH (RFC 8291 / RFC 8292)
// =========================================================================

function b64ToUint8(b64) {
  const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard.padEnd(standard.length + (4 - (standard.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ToB64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendWebPush(subscription, payloadText, vapid) {
  const endpoint = subscription.endpoint;
  const clientPublicKey = b64ToUint8(subscription.keys.p256dh);
  const clientAuth = b64ToUint8(subscription.keys.auth);

  // 1. Gera o Token VAPID JWT
  const vapidHeader = await createVapidHeader(endpoint, vapid);

  // 2. Criptografa o Payload (AES-128-GCM RFC 8291)
  const encryptedPayload = await encryptPayload(clientPublicKey, clientAuth, payloadText);

  // 3. Dispara a requisição HTTP POST para o endpoint do Google / Apple / Mozilla
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeader,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '3600',
      'Urgency': 'high'
    },
    body: encryptedPayload
  });

  if (!response.ok && response.status !== 201) {
    const errorText = await response.text();
    throw new Error(`Falha no envio do WebPush (${response.status}): ${errorText}`);
  }

  return response;
}

async function createVapidHeader(endpoint, vapid) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: now + (12 * 3600),
    sub: vapid.subject
  };

  const headerB64 = uint8ToB64(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ToB64(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Importa a chave privada VAPID
  const rawPrivate = b64ToUint8(vapid.privateKey);
  const rawPublic = b64ToUint8(vapid.publicKey);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: vapid.privateKey,
    x: uint8ToB64(rawPublic.slice(1, 33)),
    y: uint8ToB64(rawPublic.slice(33, 65))
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = uint8ToB64(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  return `vapid t=${jwt}, k=${vapid.publicKey}`;
}

async function encryptPayload(clientPublicKeyBytes, clientAuthBytes, text) {
  // @ts-ignore
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // @ts-ignore
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey));

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // @ts-ignore
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    localKeyPair.privateKey,
    256
  ));

  // 2. PRK_key = HMAC-SHA-256(auth_secret, sharedSecret)
  const authKey = await crypto.subtle.importKey(
    'raw',
    clientAuthBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prkKeyBytes = new Uint8Array(await crypto.subtle.sign('HMAC', authKey, sharedSecret));

  // 3. key_info = "WebPush: info\0" || clientPublicKey || localPublicKey
  const keyInfo = concat(
    new TextEncoder().encode('WebPush: info\0'),
    clientPublicKeyBytes,
    localPublicKeyRaw
  );

  // 4. IKM = HMAC-SHA-256(PRK_key, key_info || 0x01)
  const prkKeyCrypto = await crypto.subtle.importKey(
    'raw',
    prkKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const ikm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKeyCrypto, concat(keyInfo, new Uint8Array([1]))));

  // 5. PRK = HKDF-Extract(salt, IKM)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltKey = await crypto.subtle.importKey(
    'raw',
    salt,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const prk = await crypto.subtle.sign('HMAC', saltKey, ikm);

  // 6. CEK = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0" || 0x01)[0..16]
  const prkHmacKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const cekInfo = concat(new TextEncoder().encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1]));
  const cekBytes = (new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, cekInfo))).slice(0, 16);

  // 7. NONCE = HKDF-Expand(PRK, "Content-Encoding: nonce\0" || 0x01)[0..12]
  const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce\0'), new Uint8Array([1]));
  const nonceBytes = (new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, nonceInfo))).slice(0, 12);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cekBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Padding de 1 delimitador (0x02) conforme RFC 8291
  const payloadBytes = new TextEncoder().encode(text);
  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));

  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBytes, tagLength: 128 },
    aesKey,
    paddedPayload
  ));

  // Formato do body (RFC 8291):
  // salt (16) || rs (4) || idlen (1) || localKey (65) || encrypted
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096 bytes record size
  const idlen = new Uint8Array([localPublicKeyRaw.length]);

  return concat(salt, rs, idlen, localPublicKeyRaw, encrypted);
}

function concat(...arrays) {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}


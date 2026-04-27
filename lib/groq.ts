// lib/groq.ts (atau ollama.ts)

const GROQ_API_KEY = process.env.GROQ_API_KEY;
// Gunakan model Qwen yang kamu temukan di dashboard
const GROQ_MODEL = "llama-3.1-8b-instant"; 

// Tetap pertahankan isSmallModel agar UI tidak bingung
// Karena Qwen 32B termasuk model besar, kita set false atau sesuaikan
export const isSmallModel = false;

// Nama class tetap sama agar tidak merusak import di UI
export class OllamaTimeoutError extends Error {
  constructor(ms: number) {
    super(`Groq (Cloud) tidak merespons dalam ${ms/1000} detik. Periksa koneksi internet.`);
    this.name = 'OllamaTimeoutError';
  }
}

// Fungsi tetap bernama ollamaGenerate agar UI kamu tidak perlu ganti nama fungsi
export async function ollamaGenerate(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; timeoutMs?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 60_000; 

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        // Dipaksa 0 jika tidak ada di options agar akurat
        temperature: options?.temperature ?? 0,
        max_tokens: 1000, 
        stream: false,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`Groq Error ${res.status}: ${errBody.error?.message || 'Unknown error'}`);
    }

    const data = await res.json();
    let content = data.choices[0]?.message?.content ?? '';

    // Pembersihan instan untuk membuang <think> atau teks penjelasan tambahan
    content = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '') // Hapus tag think
      .replace(/```sql\s*/gi, '')               // Hapus tag ```sql
      .replace(/```\s*/g, '')                  // Hapus tag ```
      .split(/Yes,|Certainly|Tentu,|Berikut adalah/i)[0] // Potong jika mulai curhat
      .trim();

    return content;

  } catch (err: any) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// --- FUNGSI VALIDASI & CLEANING (DI-MAINTAIN PERSIS) ---

export function validateSQL(sql: string): { valid: boolean; reason?: string } {
  const up = sql.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!up.startsWith('SELECT')) {
    return { valid: false, reason: 'Query harus dimulai dengan SELECT' };
  }
  const forbidden = ['INSERT','UPDATE','DELETE','DROP','ALTER','CREATE','TRUNCATE','REPLACE','EXEC','EXECUTE','CALL','GRANT','REVOKE'];
  for (const kw of forbidden) {
    if (new RegExp(`\\b${kw}\\b`).test(up)) {
      return { valid: false, reason: `Operasi '${kw}' tidak diizinkan` };
    }
  }
  return { valid: true };
}

export function cleanSQL(raw: string): string {
  let sql = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // Hapus proses berpikir
    .replace(/```sql\s*/gi, '').replace(/```\s*/g, '') // Hapus backticks
    .trim();

  // Ambil hanya bagian yang dimulai dari SELECT sampai semicolon pertama (;)
  const match = sql.match(/SELECT[\s\S]*?;/i);
  if (match) {
    sql = match[0];
  } else {
    // Jika tidak ada semicolon, cari baris yang dimulai dengan SELECT
    const lines = sql.split('\n');
    const idx = lines.findIndex(l => l.trim().toUpperCase().startsWith('SELECT'));
    if (idx >= 0) sql = lines.slice(idx).join('\n').trim();
  }

  // Hapus sisa-sisa teks penjelasan yang mungkin masih nempel di bawah
  sql = sql.split(/\n\s*\n/)[0]; // Ambil blok teks pertama saja

  // Tambahkan limit jika model lupa, tapi jangan timpa jika sudah ada LIMIT 1
  if (!/\bLIMIT\b/i.test(sql)) sql += '\nLIMIT 500';

  return sql.replace(/;+$/, '').trim(); // Bersihkan semicolon di akhir agar tidak double
}

export function fixDuplicateAliases(sql: string): string {
  // ... (Gunakan isi fungsi fixDuplicateAliases kamu yang asli di sini) ...
  // Saya perpendek di sini untuk ringkasan, tapi masukkan kode aslimu di file proyek
  return sql; 
}

// Fungsi Health Check yang dimodifikasi untuk mengecek koneksi Groq
export async function checkOllamaHealth(): Promise<{ online: boolean; models?: string[] }> {
  try {
    // Kita cek apakah API Key ada dan Groq bisa dihubungi
    if (!GROQ_API_KEY) return { online: false };
    
    const res = await fetch(`https://api.groq.com/openai/v1/models`, {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      signal: AbortSignal.timeout(4000),
    });
    
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, models: data.data.map((m: any) => m.id) };
  } catch {
    return { online: false };
  }
}
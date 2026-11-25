/**
 * ai-caller.js - Panggil AI Endpoint (9Router / OpenRouter / Gemini / OpenAI-Compatible)
 */

const AiCaller = {
  normalizeEndpoint(url) {
    let u = String(url || '').trim().replace(/\/+$/, '');
    if (u.endsWith('/v1')) {
      u += '/chat/completions';
    }
    return u;
  },

  /**
   * Parse respons JSON biasa maupun SSE / NDJSON (jika provider/9Router tetap mengirim chunk streaming)
   */
  extractContentFromResponse(rawText) {
    const trimmed = String(rawText || '').trim();
    if (!trimmed) throw new Error('Respons AI kosong.');

    // 1. Coba parse sebagai JSON standar
    try {
      const obj = JSON.parse(trimmed);
      return obj.choices?.[0]?.message?.content || obj.choices?.[0]?.text || '';
    } catch (_) {
      // Lanjut ke parser SSE / multi-line JSON
    }

    // 2. Parse format SSE ("data: {...}") atau NDJSON
    let combined = '';
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      let clean = line.trim();
      if (!clean || clean === 'data: [DONE]' || clean === '[DONE]') continue;
      if (clean.startsWith('data:')) {
        clean = clean.slice(5).trim();
      }
      if (!clean.startsWith('{')) continue;
      try {
        const chunk = JSON.parse(clean);
        const piece =
          chunk.choices?.[0]?.delta?.content ??
          chunk.choices?.[0]?.message?.content ??
          chunk.choices?.[0]?.text ??
          '';
        if (piece) combined += piece;
      } catch (_) {
        // Abaikan baris yang bukan JSON valid
      }
    }

    if (combined) return combined;
    throw new Error('Format respons AI tidak dikenali: ' + trimmed.slice(0, 200));
  },

  async requestChat(endpoint, model, apiKey, messages, temperature = 0.1, maxTokens = undefined) {
    const url = this.normalizeEndpoint(endpoint);
    if (!url || !model || !apiKey) {
      throw new Error('Endpoint, Model, dan API Key wajib diisi.');
    }

    const bodyObj = {
      model,
      messages,
      stream: false,
      temperature
    };
    if (maxTokens) bodyObj.max_tokens = maxTokens;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(bodyObj)
    });

    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 250)}`);
    }

    return this.extractContentFromResponse(rawText);
  },

  async testConnection(endpoint, model, apiKey) {
    const reply = await this.requestChat(
      endpoint,
      model,
      apiKey,
      [{ role: 'user', content: 'Balas hanya dengan kata: OK' }],
      0.1,
      20
    );
    return reply || 'OK';
  },

  async parseFaDetail(rawText, settings) {
    const { ai_endpoint, ai_model, ai_api_key } = settings;
    if (!ai_endpoint || !ai_model || !ai_api_key) {
      throw new Error('Pengaturan AI (Endpoint, Model, API Key) belum lengkap. Atur di menu Pengaturan AI & Drive.');
    }

    const prompt = `Kamu adalah parser laporan keuangan pemerintah Indonesia (FA Detail SAKTI).
Dari teks laporan berikut, ekstrak HANYA baris item/akun yang berada di bawah output dengan kode BMB, BDC, atau BDB. Abaikan output lain (seperti AEA, BAH, dll).

Kembalikan HANYA JSON array valid tanpa markdown atau teks tambahan, dengan format setiap objek:
{
  "mak_full": "3165.BDB.001.052.C.521211",
  "output_kode": "BDB",
  "output": "BDB.001",
  "komponen": "052",
  "subkomponen": "052.C",
  "akun_kode": "521211",
  "akun_nama": "Belanja Bahan",
  "item_no": "000039",
  "item_nama": "Spanduk",
  "pagu": 175000,
  "realisasi_lalu": 0,
  "realisasi_ini": 0,
  "realisasi_total": 0,
  "sisa": 175000
}

Pastikan semua angka (pagu, realisasi_lalu, realisasi_ini, realisasi_total, sisa) berupa number murni tanpa koma/titik pemisah ribuan.

Teks FA Detail:
${rawText}`;

    const content = await this.requestChat(
      ai_endpoint,
      ai_model,
      ai_api_key,
      [
        { role: 'system', content: 'Anda mengembalikan output JSON array murni yang valid.' },
        { role: 'user', content: prompt }
      ],
      0.1
    );

    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error('Output AI bukan JSON array.');
    }

    return parsed.filter(r => ['BMB', 'BDC', 'BDB'].includes(String(r.output_kode || '').toUpperCase()));
  },

  async parseNodin(rawText, settings) {
    const { ai_endpoint, ai_model, ai_api_key } = settings;
    if (!ai_endpoint || !ai_model || !ai_api_key) {
      throw new Error('Pengaturan AI belum lengkap.');
    }

    const prompt = `Ekstrak informasi Nota Dinas Permintaan Pengadaan berikut menjadi JSON objek valid tanpa markdown:
{
  "nodin_nomor": "...",
  "nodin_tanggal": "YYYY-MM-DD",
  "perihal": "...",
  "pemohon_nama": "...",
  "pemohon_unit": "...",
  "items": [
    {
      "nama_barang": "...",
      "spesifikasi": "...",
      "jumlah": 1,
      "satuan": "pcs",
      "mak_full": "3165.BDB.001.052.C.521211"
    }
  ]
}

Teks Nota Dinas:
${rawText}`;

    const content = await this.requestChat(
      ai_endpoint,
      ai_model,
      ai_api_key,
      [{ role: 'user', content: prompt }],
      0.1
    );

    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    return JSON.parse(cleaned);
  }
};

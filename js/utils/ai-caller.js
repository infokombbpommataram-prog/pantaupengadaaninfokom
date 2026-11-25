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

  extractJsonArray(text) {
    const cleaned = String(text || '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) {
      return [];
    }
    const jsonSlice = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(jsonSlice);
    return Array.isArray(parsed) ? parsed : [];
  },

  /**
   * Ambil hanya halaman-halaman yang berada di bawah output BMB, BDC, atau BDB
   */
  filterTargetPages(fullText) {
    const pages = String(fullText || '').split(/--- HALAMAN \d+ ---/);
    const selected = [];
    let currentOutput = '';

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i].trim();
      if (!p) continue;

      // Cari semua kode SubOutput seperti "BDB.001", "BDC.001", "BMB.001", "BKB.001", "AEA.001"
      const subOutputMatches = p.match(/\b([A-Z]{3})\.\d{3}\b/g) || [];
      let pageHasTarget = false;

      if (['BMB', 'BDC', 'BDB'].includes(currentOutput)) {
        pageHasTarget = true;
      }

      for (const m of subOutputMatches) {
        const code = m.slice(0, 3);
        currentOutput = code;
        if (['BMB', 'BDC', 'BDB'].includes(code)) {
          pageHasTarget = true;
        }
      }

      // Fallback jika hanya ada kode 3 huruf berdiri sendiri
      if (!pageHasTarget && /\b(BMB|BDC|BDB)\b/.test(p)) {
        pageHasTarget = true;
      }

      if (pageHasTarget) {
        selected.push({ pageText: p, lastOutput: currentOutput });
      }
    }

    return selected;
  },

  async parseFaDetail(rawText, settings, onProgress = null) {
    const { ai_endpoint, ai_model, ai_api_key } = settings;
    if (!ai_endpoint || !ai_model || !ai_api_key) {
      throw new Error('Pengaturan AI (Endpoint, Model, API Key) belum lengkap. Atur di menu Pengaturan AI & Drive.');
    }

    const targetPages = this.filterTargetPages(rawText);
    const pagesToProcess = targetPages.length > 0
      ? targetPages
      : [{ pageText: rawText.slice(0, 12000), lastOutput: '' }];

    // Proses per 2 halaman agar tidak melebihi batas token input/output AI
    const BATCH_SIZE = 2;
    const allRows = [];
    const totalBatches = Math.ceil(pagesToProcess.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      if (onProgress) onProgress(b + 1, totalBatches);
      const slice = pagesToProcess.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      const chunkText = slice.map(s => s.pageText).join('\n\n');

      const prompt = `Kamu adalah parser laporan keuangan pemerintah Indonesia (FA Detail SAKTI).
Dari teks laporan berikut, ekstrak HANYA baris item/akun yang berada di bawah output dengan kode BMB, BDC, atau BDB. Abaikan output lain (seperti AEA, BAH, BKB, dll).
Jika pada halaman ini ada item yang merupakan lanjutan dari output BMB/BDC/BDB di halaman sebelumnya, tetap ekstrak dengan output_kode yang sesuai.

Kembalikan HANYA JSON array valid tanpa teks penjelasan apapun, dengan format setiap objek:
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

Pastikan semua angka berupa number murni tanpa koma/titik pemisah ribuan. Jika tidak ada item BMB/BDC/BDB di potongan ini, kembalikan [].

Teks FA Detail:
${chunkText}`;

      const content = await this.requestChat(
        ai_endpoint,
        ai_model,
        ai_api_key,
        [
          { role: 'system', content: 'Anda hanya mengembalikan JSON array murni yang valid tanpa markdown atau teks tambahan.' },
          { role: 'user', content: prompt }
        ],
        0.1
      );

      const parsed = this.extractJsonArray(content);
      const valid = parsed.filter(r => ['BMB', 'BDC', 'BDB'].includes(String(r.output_kode || '').toUpperCase()));
      allRows.push(...valid);
    }

    return allRows;
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

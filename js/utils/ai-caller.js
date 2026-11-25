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
   * Bersihkan header & footer berulang di setiap halaman PDF FA Detail SAKTI
   * sehingga menjadi satu tabel hierarkis yang menyambung utuh.
   */
  cleanFaText(fullText) {
    return String(fullText || '')
      .replace(/--- HALAMAN \d+ ---/g, '\n')
      .replace(/\*Lock Pagu adalah jumlah pagu yang sedang dalam proses usulan revisi DIPA atau POK\.[\s\S]*?selesai menjadi DIPA\./g, '')
      .replace(/Periode\s+\w+\s+\d{4}\s+Satuan Kerja\s*:[\s\S]*?Pagu Revisi/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  },

  /**
   * Potong teks bersih menjadi section per Output (BDB, BDC, BMB) secara utuh
   * dari kemunculan kode Output hingga Output berikutnya.
   */
  extractTargetSections(fullText) {
    const clean = this.cleanFaText(fullText);
    const targets = ['BDB', 'BDC', 'BMB'];
    const sections = [];

    // Cari semua posisi SubOutput seperti "BDB.001", "BDC.001", "BMB.001", "BIA.001", "CAB.001", dll.
    const subRegex = /\b([A-Z]{3})\.\d{3}\b/g;
    const markers = [];
    let match;
    while ((match = subRegex.exec(clean)) !== null) {
      markers.push({ code: match[1], sub: match[0], index: match.index });
    }

    if (markers.length === 0) {
      return [{ outputKode: '', text: clean.slice(0, 10000) }];
    }

    // Kelompokkan marker berurutan yang memiliki output code yang sama
    let i = 0;
    while (i < markers.length) {
      const code = markers[i].code;
      // Cari awal baris Output (mundur sedikit untuk menangkap nama Output mis. "BMB Komunikasi Publik ...")
      const rawStart = Math.max(0, markers[i].index - 180);
      const outputIdx = clean.lastIndexOf(code + ' ', markers[i].index);
      const startIdx = (outputIdx !== -1 && outputIdx >= rawStart) ? outputIdx : markers[i].index;

      // Cari akhir section: posisi marker pertama yang code-nya berbeda
      let j = i + 1;
      while (j < markers.length && markers[j].code === code) {
        j++;
      }

      let endIdx = clean.length;
      if (j < markers.length) {
        // Mundur sebelum nama Output berikutnya (cari "<NEXT_CODE> " sebelum marker j)
        const nextCode = markers[j].code;
        const nextOutIdx = clean.lastIndexOf(nextCode + ' ', markers[j].index);
        endIdx = (nextOutIdx !== -1 && nextOutIdx > startIdx) ? nextOutIdx : markers[j].index;
      }

      if (targets.includes(code)) {
        sections.push({
          outputKode: code,
          text: clean.slice(startIdx, endIdx).trim()
        });
      }

      i = j;
    }

    return sections;
  },

  /**
   * Pecah section yang panjang (mis. BDB ~18rb char) menjadi chunk ~5.500 char
   * pada batas akun (52xxxx) sambil menyisipkan konteks header hierarki.
   */
  splitSectionIntoChunks(section) {
    const MAX_LEN = 5500;
    const text = section.text;
    if (text.length <= MAX_LEN) {
      return [text];
    }

    const chunks = [];
    let pos = 0;
    let activeKomponen = '';
    let activeSubkomponen = '';

    while (pos < text.length) {
      let end = Math.min(pos + MAX_LEN, text.length);
      if (end < text.length) {
        // Cari batas akun 6 digit (mis. " 521211 " atau " 524111 ") sebelum end agar tidak memotong di tengah baris item
        const sliceForBreak = text.slice(pos, end);
        const akunMatches = [...sliceForBreak.matchAll(/\s(5[1-3]\d{4})\s/g)];
        if (akunMatches.length > 0) {
          const lastMatch = akunMatches[akunMatches.length - 1];
          if (lastMatch.index > 1000) {
            end = pos + lastMatch.index;
          }
        }
      }

      const chunkBody = text.slice(pos, end).trim();
      const prefix = pos > 0
        ? `[LANJUTAN OUTPUT ${section.outputKode}${activeKomponen ? ' | Komponen: ' + activeKomponen : ''}${activeSubkomponen ? ' | SubKomponen: ' + activeSubkomponen : ''}]\n`
        : '';

      chunks.push(prefix + chunkBody);

      // Update konteks komponen/subkomponen terakhir di chunk ini untuk chunk berikutnya
      const subKompMatches = [...chunkBody.matchAll(/\b(\d{3}\.[0-9A-Z]{2})\b/g)];
      if (subKompMatches.length > 0) {
        activeSubkomponen = subKompMatches[subKompMatches.length - 1][1];
        activeKomponen = activeSubkomponen.slice(0, 3);
      }

      pos = end;
    }

    return chunks;
  },

  async parseFaDetail(rawText, settings, onProgress = null) {
    const { ai_endpoint, ai_model, ai_api_key } = settings;
    if (!ai_endpoint || !ai_model || !ai_api_key) {
      throw new Error('Pengaturan AI (Endpoint, Model, API Key) belum lengkap. Atur di menu Pengaturan AI & Drive.');
    }

    const sections = this.extractTargetSections(rawText);
    const allChunks = [];
    sections.forEach(sec => {
      const chunks = this.splitSectionIntoChunks(sec);
      chunks.forEach(c => allChunks.push({ outputKode: sec.outputKode, text: c }));
    });

    if (allChunks.length === 0) {
      throw new Error('Tidak ditemukan bagian BMB, BDC, atau BDB di dalam PDF ini.');
    }

    const allRows = [];
    const totalBatches = allChunks.length;

    for (let b = 0; b < totalBatches; b++) {
      if (onProgress) onProgress(b + 1, totalBatches, allChunks[b].outputKode);
      const chunk = allChunks[b];

      const prompt = `Ekstrak semua baris item/akun dari potongan Laporan FA Detail SAKTI berikut.
Seluruh teks di bawah ini adalah bagian dari Output ${chunk.outputKode || 'BMB/BDC/BDB'}.
Gunakan hierarki: Program 3165 -> Output (${chunk.outputKode}) -> SubOutput (mis. ${chunk.outputKode}.001) -> Komponen (mis. 051/052) -> SubKomponen (mis. 051.0A -> kode huruf A/B/C) -> Akun (6 digit, mis. 521211) -> Item (6 digit, mis. 000258).
Format mak_full contoh: "3165.${chunk.outputKode}.001.051.A.521211" (ambil huruf akhir subkomponen mis. 051.0A menjadi 051.A).

Kembalikan HANYA JSON array murni (tanpa teks lain):
[{"mak_full":"3165.${chunk.outputKode}.001.051.A.521211","output_kode":"${chunk.outputKode}","output":"${chunk.outputKode}.001","komponen":"051","subkomponen":"051.A","akun_kode":"521211","akun_nama":"Belanja Bahan","item_no":"000258","item_nama":"Pembuatan Baliho, Spanduk dan Banner","pagu":4906000,"realisasi_lalu":4185000,"realisasi_ini":0,"realisasi_total":4185000,"sisa":721000}]

Pastikan semua angka berupa number murni tanpa pemisah ribuan.

Teks:
${chunk.text}`;

      let content = '';
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          content = await this.requestChat(
            ai_endpoint,
            ai_model,
            ai_api_key,
            [
              { role: 'system', content: 'Return valid JSON array only.' },
              { role: 'user', content: prompt }
            ],
            0.1
          );
          break;
        } catch (err) {
          if (attempt === 2) throw err;
        }
      }

      const parsed = this.extractJsonArray(content);
      const valid = parsed.map(r => {
        if (!r.output_kode && chunk.outputKode) r.output_kode = chunk.outputKode;
        return r;
      }).filter(r => ['BMB', 'BDC', 'BDB'].includes(String(r.output_kode || '').toUpperCase()));
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

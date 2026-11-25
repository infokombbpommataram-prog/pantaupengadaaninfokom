/**
 * ai-caller.js - Panggil AI Endpoint (9Router / OpenAI-Compatible / Gemini)
 */

const AiCaller = {
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

    const res = await fetch(ai_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ai_api_key}`
      },
      body: JSON.stringify({
        model: ai_model,
        messages: [
          { role: 'system', content: 'Anda mengembalikan output JSON array murni yang valid.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API Error (${res.status}): ${errText.slice(0, 250)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      throw new Error('Respons AI kosong.');
    }

    // Bersihkan markdown code fence jika AI menyertakan ```json
    const cleaned = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error('Output AI bukan JSON array.');
    }

    // Filter ulang hanya BMB, BDC, BDB untuk memastikan kepatuhan
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

    const res = await fetch(ai_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ai_api_key}`
      },
      body: JSON.stringify({
        model: ai_model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API Error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    return JSON.parse(content);
  }
};

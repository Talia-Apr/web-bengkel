import pool from "@/lib/db";

export async function GET() {
  try {
    const [jasa] = await pool.query(`
      SELECT kode_jasa, nama_jasa, harga_jasa, keterangan
      FROM jasa_servis
      ORDER BY nama_jasa ASC
    `);

    const [sparepart] = await pool.query(`
      SELECT nama_sparepart, mobil, kategori, harga_jual, stok, satuan
      FROM sparepart
      WHERE is_deleted = 0
      ORDER BY kategori ASC, nama_sparepart ASC
    `);

    return Response.json({
      jasa,
      sparepart
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Gagal mengambil data" },
      { status: 500 }
    );
  }
}
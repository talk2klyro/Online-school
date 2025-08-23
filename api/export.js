// api/export.js
const { createDatabaseIfMissing, listStudents, toCSV } = require("./_notion");

module.exports = async (req, res) => {
  try {
    const { databaseId } = await createDatabaseIfMissing();
    const rows = await listStudents(databaseId);
    const csv = toCSV(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=attendance.csv");
    return res.status(200).send(csv);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

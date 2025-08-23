// api/ensure-db.js
const { createDatabaseIfMissing } = require("./_notion");

module.exports = async (req, res) => {
  try {
    const info = await createDatabaseIfMissing();
    res.status(200).json({ ok: true, created: info.created, databaseId: info.databaseId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

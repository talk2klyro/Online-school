const { createDatabaseIfMissing } = require("./_notion");

module.exports = async (req, res) => {
  try {
    const result = await createDatabaseIfMissing();
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to ensure database" });
  }
};

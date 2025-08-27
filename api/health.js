// Simple health check
module.exports = async (req, res) => {
  res.status(200).json({ ok: true, time: new Date().toISOString() });
};

const { createDatabaseIfMissing, listStudents, addStudent } = require("./_notion");

module.exports = async (req, res) => {
  try {
    const { databaseId } = await createDatabaseIfMissing();

    if (req.method === "GET") {
      const students = await listStudents(databaseId);
      res.status(200).json(students);
    } 
    
    else if (req.method === "POST") {
      const { name, phone, sn } = req.body;
      const student = await addStudent(databaseId, { name, phone, sn });
      res.status(201).json(student);
    } 
    
    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Students API failed" });
  }
};

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

// Add more detailed CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',       
  password: '',      
  database: 'garcia_db'   
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error connecting to the database:', err);
    process.exit(1); // Exit if we can't connect to the database
  });

// Add a test route
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// CRUD Operations
// Create todo
app.post('/todos', async (req, res) => {
  console.log('📝 Creating new todo:', req.body);
  const { title } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO todolist (title) VALUES (?)',
      [title]
    );
    
    const [newTodo] = await pool.execute(
      'SELECT * FROM todolist WHERE id = ?',
      [result.insertId]
    );
    
    console.log('✅ Todo created:', newTodo[0]);
    res.json(newTodo[0]);
  } catch (err) {
    console.error('❌ Error creating todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Read all todos
app.get('/todos', async (req, res) => {
  console.log('📋 Fetching all todos');
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM todolist ORDER BY date_added DESC'
    );
    console.log(`✅ Found ${rows.length} todos`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching todos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update todo status
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  console.log(`📝 Updating todo ${id} to status: ${status}`);
  
  try {
    const query = `
      UPDATE todolist 
      SET status = ?,
          date_completed = CASE 
            WHEN ? = 'completed' THEN CURRENT_TIMESTAMP
            ELSE NULL
          END
      WHERE id = ?
    `;
    
    await pool.execute(query, [status, status, id]);
    
    const [updatedTodo] = await pool.execute(
      'SELECT * FROM todolist WHERE id = ?',
      [id]
    );
    
    if (updatedTodo.length === 0) {
      console.log(`❌ Todo ${id} not found`);
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    console.log('✅ Todo updated:', updatedTodo[0]);
    res.json(updatedTodo[0]);
  } catch (err) {
    console.error('❌ Error updating todo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete todo
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Deleting todo ${id}`);
  try {
    const [result] = await pool.execute(
      'DELETE FROM todolist WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      console.log(`❌ Todo ${id} not found`);
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    console.log('✅ Todo deleted successfully');
    res.json({ message: 'Todo deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting todo:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
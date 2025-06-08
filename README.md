### Step 1: Set Up Your Environment

1. **Install Node.js**: Make sure you have Node.js installed on your machine. You can download it from [nodejs.org](https://nodejs.org/).

2. **Install PostgreSQL**: Ensure you have PostgreSQL installed and running. You can download it from [postgresql.org](https://www.postgresql.org/download/).

3. **Create a Database**: Use the SQL provided to create your database and tables. You can run the SQL script using a PostgreSQL client like pgAdmin or the command line.

### Step 2: Create a New Node.js Project

1. **Create a Project Directory**:
   ```bash
   mkdir erp-api
   cd erp-api
   ```

2. **Initialize a New Node.js Project**:
   ```bash
   npm init -y
   ```

3. **Install Required Packages**:
   You will need several packages to build your API:
   ```bash
   npm install express pg dotenv
   ```

   - `express`: A web framework for Node.js.
   - `pg`: PostgreSQL client for Node.js.
   - `dotenv`: To manage environment variables.

### Step 3: Set Up Your Project Structure

Create the following directory structure:

```
erp-api/
│
├── .env
├── index.js
├── routes/
│   └── api.js
└── controllers/
    └── moduleController.js
```

### Step 4: Configure Environment Variables

Create a `.env` file in the root of your project to store your database connection details:

```plaintext
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=ERPSystem
```

Replace `your_username` and `your_password` with your PostgreSQL credentials.

### Step 5: Create the API

1. **Create the Entry Point (`index.js`)**:

```javascript
const express = require('express');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
```

2. **Create the API Routes (`routes/api.js`)**:

```javascript
const express = require('express');
const { getModules, createModule } = require('../controllers/moduleController');

const router = express.Router();

// Get all modules
router.get('/modules', getModules);

// Create a new module
router.post('/modules', createModule);

module.exports = router;
```

3. **Create the Module Controller (`controllers/moduleController.js`)**:

```javascript
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Get all modules
const getModules = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM modules');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Create a new module
const createModule = async (req, res) => {
    const { name, description, icon_url, created_by } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO modules (name, description, icon_url, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, icon_url, created_by]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getModules,
    createModule,
};
```

### Step 6: Run Your API

1. **Start the Server**:
   ```bash
   node index.js
   ```

2. **Test Your API**:
   You can use tools like Postman or curl to test your API endpoints:
   - **Get all modules**: `GET http://localhost:3000/api/modules`
   - **Create a new module**: `POST http://localhost:3000/api/modules` with a JSON body:
     ```json
     {
       "name": "New Module",
       "description": "Description of the new module",
       "icon_url": "http://example.com/icon.png",
       "created_by": 1
     }
     ```

### Step 7: Expand Your API

You can continue to expand your API by adding more routes and controllers for other tables and stored procedures defined in your SQL files. Make sure to handle errors and validate input data as needed.

### Conclusion

You now have a basic Node.js API that interacts with your PostgreSQL database. You can expand this project by adding more functionality, such as authentication, validation, and more complex queries.
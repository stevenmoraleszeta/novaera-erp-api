# NovaEra ERP API

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-316192?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

A comprehensive RESTful API for an Enterprise Resource Planning (ERP) system built with Node.js, Express, and PostgreSQL. This API provides complete backend functionality for managing modules, tables, records, users, roles, permissions, notifications, file uploads, audit logs, and more.

## ✨ Introduction

NovaEra ERP API is a robust backend solution designed for enterprise-level resource planning and management. It features a modular architecture with role-based access control, comprehensive audit logging, real-time notifications, file management, and flexible data modeling capabilities.

### Key Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with role-based access control (RBAC)
- 📊 **Dynamic Data Modeling**: Create and manage custom modules, tables, and columns
- 📝 **Record Management**: Full CRUD operations for records with assigned users and comments
- 🔔 **Notifications**: Real-time and scheduled notifications system
- 📁 **File Management**: Secure file upload and management
- 📋 **Views & Sorting**: Custom views with advanced sorting capabilities
- 🔍 **Audit Logging**: Comprehensive audit trail for all system activities
- 👥 **Collaboration**: User assignment, comments, and table collaboration features
- ⏰ **Scheduled Jobs**: Automated notification scheduling using node-cron

## 🚀 Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Task Scheduling**: node-cron
- **File Handling**: Built-in Node.js file system
- **Environment Management**: dotenv

## ⚙️ Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/novaera-erp-api.git
   cd novaera-erp-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your database credentials and other configuration values.

4. **Set up the database**
   - Create a PostgreSQL database
   - Run the SQL schema scripts to create all required tables
   - Ensure the database user has appropriate permissions

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Start the production server**

   ```bash
   npm start
   ```

The API will be available at `http://localhost:3000` (or the port specified in your `.env` file).

## 📋 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_SSL=disable

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Optional: Database URL (for hosted environments)
# DATABASE_URL=postgresql://user:password@host:port/database
```

See `.env.example` for a complete template.

## 🧩 Project Structure

```text
novaera-erp-api/
│
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   │
│   ├── config/
│   │   └── db.js              # Database connection configuration
│   │
│   ├── controllers/           # Request handlers
│   │   ├── authController.js
│   │   ├── modulesController.js
│   │   ├── tablesController.js
│   │   ├── recordsController.js
│   │   ├── usersController.js
│   │   ├── rolesController.js
│   │   ├── permissionsController.js
│   │   ├── notificationsController.js
│   │   ├── filesController.js
│   │   ├── auditLogController.js
│   │   └── ...
│   │
│   ├── services/              # Business logic layer
│   │   ├── usersService.js
│   │   ├── modulesService.js
│   │   ├── recordsService.js
│   │   └── ...
│   │
│   ├── routes/                # API routes
│   │   ├── auth.js
│   │   ├── modules.js
│   │   ├── tables.js
│   │   ├── records.js
│   │   └── ...
│   │
│   ├── middleware/            # Custom middleware
│   │   ├── authMiddleware.js
│   │   └── validateFile.js
│   │
│   ├── jobs/                  # Scheduled jobs
│   │   └── notificationScheduler.js
│   │
│   └── utils/                 # Utility functions
│       └── fileUtils.js
│
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── LICENSE                    # License file
├── package.json               # Project dependencies
└── README.md                  # Project documentation
```

## 📚 API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user information

### Modules

- `GET /api/modules` - Get all modules
- `POST /api/modules` - Create a new module
- `GET /api/modules/:id` - Get a specific module
- `PUT /api/modules/:id` - Update a module
- `DELETE /api/modules/:id` - Delete a module

### Tables

- `GET /api/tables` - Get all tables
- `POST /api/tables` - Create a new table
- `GET /api/tables/:id` - Get a specific table
- `PUT /api/tables/:id` - Update a table
- `DELETE /api/tables/:id` - Delete a table

### Records

- `GET /api/records` - Get all records
- `POST /api/records` - Create a new record
- `GET /api/records/:id` - Get a specific record
- `PUT /api/records/:id` - Update a record
- `DELETE /api/records/:id` - Delete a record

### Users

- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Other Endpoints

- Roles: `/api/roles`
- Permissions: `/api/permissions`
- Notifications: `/api/notifications`
- Files: `/api/files`
- Views: `/api/views`
- Audit Log: `/api/audit-log`
- And more...

## 🔒 Security Features

- JWT-based authentication with secure cookie storage
- Password hashing using bcryptjs
- Role-based access control (RBAC)
- CORS configuration for allowed origins
- SQL injection prevention through parameterized queries
- Input validation and sanitization
- Audit logging for security monitoring

## 🚀 Deployment

### Recommended Platforms

- **Render**: Easy deployment with PostgreSQL support
- **Railway**: Simple setup with automatic database provisioning
- **Heroku**: Traditional PaaS with add-on support
- **AWS**: Full control with EC2, RDS, and Elastic Beanstalk
- **DigitalOcean**: App Platform or Droplets
- **Vercel**: Serverless functions (may require adjustments)

### Deployment Checklist

1. Set `NODE_ENV=production` in environment variables
2. Configure production database credentials
3. Set a strong `JWT_SECRET`
4. Configure `DB_SSL` appropriately for your database provider
5. Update CORS allowed origins in `src/app.js`
6. Ensure database migrations are run
7. Set up environment variables on your hosting platform
8. Configure automatic restarts (PM2, systemd, etc.)

### Example: Deploying to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables from your `.env` file
6. Create a PostgreSQL database on Render
7. Update database connection variables
8. Deploy

## 🧪 Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon

### Development Best Practices

- Use environment variables for all configuration
- Follow the existing code structure and patterns
- Add appropriate error handling
- Write meaningful commit messages
- Test API endpoints before committing

## 📝 License

This project is proprietary and confidential. All rights reserved.

### Copyright (c) 2024 Steven Morales Fallas

Redistribution, modification, reproduction, sublicensing, or any form of transaction (including commercial, educational, or promotional use) involving this repository, its source code, or derived works is strictly prohibited without the explicit and personal written authorization of the Lead Developer, Steven Morales Fallas.

Unauthorized commercial use, resale, or licensing of this repository or its contents is strictly forbidden and will be subject to applicable legal action.

For licensing inquiries, please contact: Steven Morales Fallas

## 👤 Author

### Steven Morales Fallas

- Full Stack Developer
- Specialized in Node.js, Express, PostgreSQL, and modern web technologies

## 🤝 Contributing

This is a proprietary project. Contributions are not accepted at this time. For collaboration inquiries, please contact the author.

## 📞 Support

For issues, questions, or licensing inquiries, please contact the project maintainer.

---

**Note**: This API is designed to work with a frontend application. Ensure proper CORS configuration and authentication flow when integrating with client applications.

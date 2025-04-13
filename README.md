# Visitor Management System

A comprehensive system for managing visitors in a facility, built with FastAPI (Backend) and React (Frontend).

## Overview

The Visitor Management System (VMS) is designed to streamline the visitor registration, approval, and check-in/check-out processes within an organization. This system provides a secure and efficient way to manage visitors while maintaining detailed records for security and compliance purposes.

## Features

### Authentication
- JWT-based secure authentication
- Role-based access control (Admin, Security Guard, Faculty/Host)
- Password hashing and security

### User Management
- Admin dashboard for user administration
- Different user roles with specific permissions
- Department-based organization

### Visitor Registration
- Multiple registration methods:
  - Admin registration
  - Host pre-registration
  - Visitor self-registration
- Comprehensive visitor information capture

### Approval Workflow
- Host notification and approval process
- Rejection with reason tracking
- Pre-approval for scheduled visits

### Check-In and Check-Out
- Photo capture during check-in
- QR code badge generation
- Streamlined check-out process
- Visit duration tracking

### Badge Management
- QR code generation for visitor badges
- Badge verification through scanning
- Expiry time management

### Monitoring and Reporting
- Real-time visitor statistics
- Host activity tracking
- System health monitoring
- Comprehensive audit logging

## Technology Stack

### Backend
- FastAPI (Python web framework)
- SQLAlchemy ORM
- MySQL database
- JWT authentication
- Pydantic for data validation

### Frontend
- React.js
- Material UI components
- React Router for navigation
- Context API for state management
- Axios for API communication
- HTML5-QRcode for QR scanning

## Installation and Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- MySQL 8.0+

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/visitor-management-system.git
   cd visitor-management-system
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with the following variables:
   ```
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=vms_db

   # JWT Configuration
   SECRET_KEY=your-secret-key-here
   ACCESS_TOKEN_EXPIRE_MINUTES=30

   # Application Configuration
   DEBUG=True
   API_PREFIX=/api/v1
   ```

5. Create the MySQL database:
   ```sql
   CREATE DATABASE vms_db;
   CREATE USER 'your_mysql_user'@'localhost' IDENTIFIED BY 'your_mysql_password';
   GRANT ALL PRIVILEGES ON vms_db.* TO 'your_mysql_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

6. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd vms-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with:
   ```
   REACT_APP_API_URL=http://localhost:8000/api/v1
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## Usage

### Default User Accounts

The system creates a default admin user on first startup:

- **Admin User**
  - Username: `admin`
  - Password: `Admin123!`

### User Roles

1. **Admin**
   - Full system access
   - User management
   - System statistics

2. **Security Guard** (Department = "Security")
   - Check-in and check-out visitors
   - Badge verification
   - Photo capture

3. **Faculty/Host** (Any department other than "Security")
   - Approve/reject visitors
   - Pre-register visitors
   - View visitor history

### Accessing the Application

- Backend API documentation: `http://localhost:8000/api/v1/docs`
- Frontend application: `http://localhost:3000`

## API Documentation

The API documentation is available through Swagger UI at `/api/v1/docs` when the backend is running.

## Directory Structure

```
visitor-management-system/
├── backend/
│   ├── auth.py                  # Authentication utilities
│   ├── config.py                # Configuration module
│   ├── db_connection.py         # Database connection
│   ├── db_models.py             # SQLAlchemy models
│   ├── error_handlers.py        # Error handling
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   ├── routes_auth.py           # Auth routes
│   ├── routes_badges.py         # Badge routes
│   ├── routes_photos.py         # Photo routes
│   ├── routes_stats.py          # Statistics routes
│   ├── routes_users.py          # User routes
│   ├── routes_visitors.py       # Visitor routes
│   └── schemas.py               # Pydantic schemas
│
└── frontend/
    ├── public/
    └── src/
        ├── components/          # UI components
        │   ├── admin/           # Admin-specific components
        │   ├── common/          # Shared components
        │   ├── faculty/         # Faculty-specific components
        │   └── guard/           # Guard-specific components
        ├── contexts/            # React contexts
        ├── pages/               # Page components
        ├── services/            # API services
        └── utils/               # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- FastAPI for the backend framework
- React and Material UI for frontend components
- SQLAlchemy for database ORM
- All other libraries that made this project possible

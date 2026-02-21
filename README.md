<<<<<<< HEAD
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6fae0293-ead0-4db6-bc79-15b611608c8f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
=======
# Iris Disease Detection System (IrisAI)

A production-ready medical SaaS application for iris disease screening using AI-powered analysis (Mocked) and professional clinical reporting.

## Tech Stack

- **Backend**: Python, Flask, SQLAlchemy, PostgreSQL, JWT, ReportLab.
- **Frontend**: React (Vite), Tailwind CSS v4, Axios, React Router v6, Context API.
- **Testing**: Pytest, Jest, React Testing Library.
- **CI/CD**: GitHub Actions.

## Project Structure

```text
backend/           # Flask Application
  app/             # Source code (Factory Pattern)
  tests/           # Backend test suite
  run.py           # Entry point
frontend/          # React Application (Vite)
  src/             # Components, Pages, Context, Hooks
  src/__tests__/   # Frontend test suite
```

## Setup Instructions (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or use a local instance)

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/scripts/activate  # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   - Copy `.env.example` to `.env`.
   - Update `DATABASE_URL` with your local PostgreSQL credentials.
   - Create the database locally: `CREATE DATABASE iris_db;`
5. Run migrations (or initialize DB):
   ```bash
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```
6. Start the server:
   ```bash
   python run.py
   ```
   *Backend will run at http://localhost:5000*

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *Frontend will run at http://localhost:5173*

## Running Tests

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Clinical Disclaimer
This system is for educational and screening assistance purposes only. It does not provide medical diagnoses. Always consult a medical professional.
>>>>>>> 2236385ea8c4866abc1516cc765d3e3d86cabedb

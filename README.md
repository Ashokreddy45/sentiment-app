# Sentiment Analysis Platform

A full-stack sentiment analysis application for evaluating text and customer reviews, exploring sentiment results, and reviewing previous analyses.

## Overview

The platform combines a React frontend with a FastAPI backend and a MySQL database. It supports manual text analysis, file-based analysis, sentiment history, and an aspect-oriented analysis workflow.

## Key Features

- **Manual sentiment analysis** — submit text and inspect the resulting sentiment.
- **File-based analysis** — upload supported files for batch analysis and summary results.
- **Aspect-oriented analysis** — evaluate text in relation to user-specified aspects.
- **Analysis history** — retrieve previously saved analysis results.
- **Multiple analysis methods** — includes TextBlob, VADER, and a transformer-based classifier when available.
- **REST API** — FastAPI endpoints connect the frontend to backend processing.
- **Configurable deployment** — frontend API URL and backend CORS origins are configured through environment variables.

> **Methodology note:** The aspect-oriented endpoint currently uses sentence matching and sentiment scoring as a heuristic. The transformer pipeline is a general sentiment classifier, not a dedicated aspect-based sentiment analysis model. Results should be interpreted accordingly.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, FastAPI, Uvicorn |
| Data processing | Pandas, NumPy, scikit-learn |
| NLP and sentiment | TextBlob, VADER, spaCy, Hugging Face Transformers |
| Database | MySQL, SQLAlchemy |
| API integration | REST, JSON, CORS |

## Architecture

```text
React + Vite frontend
        |
        | HTTP / JSON
        v
FastAPI backend
        |
        +---- Sentiment analysis and NLP
        |
        +---- SQLAlchemy
                    |
                    v
                 MySQL
```

## Project Structure

```text
sentiment-app/
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.12
- Node.js and npm
- A running MySQL instance
- Git

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Ashokreddy45/sentiment-app.git
cd sentiment-app
```

### 2. Configure the backend

Create and activate a virtual environment:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Create a local `.env` file in the repository root, using `.env.example` as a reference:

```dotenv
DB_USER=root
DB_PASSWORD=replace_with_your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sentiment_app
FRONTEND_URLS=http://localhost:5173
```

Replace the example database credentials with your own values. Create the configured MySQL database before starting the API.

Start the backend:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API documentation is available at `http://localhost:8000/docs` while the backend is running.

### 3. Configure the frontend

Open a second terminal:

```bash
cd sentiment-app/frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
VITE_API_URL=http://localhost:8000
```

Start the frontend development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Build the frontend

```bash
cd frontend
npm run build
```

The production build is generated in `frontend/dist/`.

## API Reference

The API exposes the following primary routes:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Root API response |
| POST | `/register` | Register an account |
| POST | `/login` | Login endpoint |
| GET | `/history` | Retrieve analysis history |
| POST | `/analyze-manual` | Analyze submitted text |
| POST | `/analyze-file` | Analyze an uploaded file |
| POST | `/aspect-sentiment` | Score text against specified aspects |

Interactive request and response schemas are available through FastAPI's `/docs` interface.

## Configuration

| Variable | Purpose |
|---|---|
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_HOST` | MySQL hostname |
| `DB_PORT` | MySQL port |
| `DB_NAME` | MySQL database name |
| `FRONTEND_URLS` | Comma-separated list of permitted frontend origins |
| `VITE_API_URL` | Backend API base URL used by the frontend |

Keep `.env` and all production credentials out of version control. Configure production variables through the hosting provider's environment settings.

## Security and Current Limitations

- The current login endpoint returns a placeholder token; it is not production-grade authentication.
- Analysis history should not be considered private or user-isolated until ownership and authorization checks are implemented.
- The password-reset frontend workflow requires a corresponding backend endpoint before it can work end to end.
- The aspect-oriented analysis endpoint is heuristic rather than a dedicated ABSA model.
- Transformer initialization and NLP model downloads can increase startup time and deployment resource requirements.

Do not use this project as a security-sensitive authentication system without implementing and testing the required safeguards.

## Development Checks

Frontend production build:

```bash
cd frontend
npm run build
```

Backend syntax check:

```bash
python -m py_compile backend/app/main.py
```

## Future Improvements

- Implement token-based authentication and per-user authorization.
- Add a complete password-reset workflow.
- Introduce a dedicated aspect-based sentiment model.
- Add automated backend and frontend tests.
- Improve model loading and production resource usage.
- Configure and verify production deployment.

## License

No license has been specified yet. Add a `LICENSE` file before distributing the project under an open-source license.

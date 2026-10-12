# Sentiment Analysis & Aspect-Based Sentiment Analysis Platform

An end-to-end sentiment analysis platform for analyzing customer feedback, classifying sentiment, and extracting insights from textual reviews. Built with React, FastAPI, Python, and MySQL.

## Live Application

| Resource | Link |
|---|---|
| Live Frontend | https://sentiment-app-frontend-d7n6.onrender.com |
| Backend API | https://sentiment-app-api-bvkc.onrender.com |
| Interactive API Documentation | https://sentiment-app-api-bvkc.onrender.com/docs |
| OpenAPI Specification | https://sentiment-app-api-bvkc.onrender.com/openapi.json |
| GitHub Repository | https://github.com/Ashokreddy45/sentiment-app |

## Overview

The platform provides a web interface for analyzing text and customer feedback through sentiment-analysis functionality. Its architecture separates the React frontend from the FastAPI backend, with MySQL providing persistent data storage.

## Key Features

- Manual text sentiment analysis
- File-based analysis
- Aspect-based sentiment analysis endpoint
- User registration and login endpoints
- Analysis history retrieval
- REST API with interactive Swagger documentation
- React-based frontend
- Independent cloud deployment for frontend and backend

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI, Uvicorn |
| Data Processing | Pandas |
| NLP and Sentiment Analysis | NLTK, VADER, TextBlob |
| Database | MySQL, SQLAlchemy, MySQL Connector |
| API Validation | Pydantic |
| Frontend and Backend Hosting | Render |
| Database Hosting | Aiven |

## System Architecture

\`\`\`text
User
 |
 v
React + Vite Frontend (Render)
 |
 v
FastAPI REST API (Render)
 |
 +---- Text and File Analysis
 |
 +---- Sentiment Analysis
 |
 +---- Authentication and History
 |
 v
MySQL Database (Aiven)
\`\`\`

## API Reference

Base URL: https://sentiment-app-api-bvkc.onrender.com

| Method | Endpoint | Description |
|---|---|---|
| GET | \`/\` | API status |
| POST | \`/register\` | User registration |
| POST | \`/login\` | User login |
| GET | \`/history\` | Retrieve analysis history |
| POST | \`/analyze-manual\` | Analyze submitted text |
| POST | \`/analyze-file\` | Analyze an uploaded file |
| POST | \`/aspect-sentiment\` | Aspect-based sentiment analysis |

See the [interactive API documentation](https://sentiment-app-api-bvkc.onrender.com/docs) for request schemas, parameters, and responses.

## Local Development

### Prerequisites

- Python compatible with the backend dependencies
- Node.js and npm
- MySQL
- Git

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/Ashokreddy45/sentiment-app.git
cd sentiment-app
\`\`\`

### 2. Set up the backend

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
\`\`\`

Configure the required database and application environment variables locally. Keep credentials and secrets out of source control.

Run the backend from the repository root:

\`\`\`bash
uvicorn backend.app.main:app --reload --port 8000
\`\`\`

Backend: http://127.0.0.1:8000
API documentation: http://127.0.0.1:8000/docs

### 3. Set up the frontend

Open another terminal:

\`\`\`bash
cd sentiment-app/frontend
npm install
\`\`\`

Create `frontend/.env` with:

\`\`\`env
VITE_API_URL=http://127.0.0.1:8000
\`\`\`

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

Open the local URL shown by Vite.

## Deployment

- **Frontend:** Production React/Vite application hosted on Render.
- **Backend:** FastAPI service hosted on Render.
- **Database:** MySQL hosted on Aiven.
- **Configuration:** Environment variables manage API connectivity and database access.

The frontend API URL must point to the backend service. The backend CORS configuration must allow the deployed frontend origin.

## Project Structure

\`\`\`text
sentiment-app/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── database.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── README.md
\`\`\`

This is a high-level overview of the main files; other application files may also be present.

## Engineering Highlights

- Full-stack application with a dedicated REST API
- Integration of NLP and sentiment-analysis libraries
- Endpoints for text analysis, file uploads, authentication, and history
- Cloud-hosted relational database integration
- Separate frontend and backend deployments
- Interactive API documentation

## Future Enhancements

- Sentiment trend visualizations and reporting
- Improved aspect-level sentiment presentation
- Expanded automated testing and validation
- Structured logging, monitoring, and performance optimization
- Model evaluation and benchmarking

## Author

**Ashok Reddy Damireddy**

B.Tech — Computer Science Engineering (Data Science)

[GitHub Profile](https://github.com/Ashokreddy45)

---

Developed as a portfolio project exploring Python, NLP, data science, API development, and full-stack deployment.

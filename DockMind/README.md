# 🐳 DockMind – AI Powered Docker Health Dashboard

DockMind is an AI-powered Docker management dashboard that lets you monitor, manage, and interact with your Docker containers using natural language.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Backend | FastAPI |
| AI Engine | Ollama + Llama 3.x |
| Database | PostgreSQL (Neon) |
| ORM | SQLAlchemy |
| Auth | JWT + Google OAuth |
| Docker | Docker SDK for Python |
| Server | Uvicorn |

---

## 📁 Project Structure

```
DockMind/
├── frontend/       # React + Vite UI
├── backend/        # FastAPI REST API
├── database/       # SQL scripts & migrations
├── docs/           # Documentation & UML diagrams
├── prompts/        # Ollama prompt templates
├── postman/        # API testing collections
├── docker-compose.yml
└── README.md
```

---

## 🛠️ Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

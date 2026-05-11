# 🛡️ SecureOpsAI — DevSecOps Security Automation Platform

**Agentic AI Framework for DevSecOps Security Automation**  
B.Tech Final Year Project — CSE, Tula's Institute Dehradun

---

## 📁 Project Structure

```
SecureOpsAI/
├── backend/
│   ├── main.py            ← FastAPI backend (scanner + API)
│   ├── requirements.txt   ← Python dependencies
│   ├── Dockerfile
│   └── .env.example       ← Environment variables template
├── frontend/
│   ├── src/
│   │   ├── App.jsx        ← React dashboard (main UI)
│   │   └── index.js
│   ├── public/index.html
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml     ← Run everything with 1 command
└── README.md
```

---

## ⚡ Local Setup (Step-by-Step)

### Method 1: Manual (Recommended for development)

#### Step 1 — Backend Setup

```bash
cd SecureOpsAI/backend

# Virtual environment banao
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# Dependencies install karo
pip install -r requirements.txt

# .env file banao
cp .env.example .env
# .env file mein apna OPENAI_API_KEY daalo (optional)

# Server start karo
uvicorn main:app --reload --port 8000
```

Backend will run at: **http://localhost:8000**  
API docs: **http://localhost:8000/docs**

---

#### Step 2 — Frontend Setup

```bash
cd SecureOpsAI/frontend

# Node packages install karo
npm install

# React app start karo
npm start
```

Frontend will run at: **http://localhost:3000**

---

### Method 2: Docker (Easiest)

```bash
cd SecureOpsAI

# .env file mein API key daalo
echo "OPENAI_API_KEY=sk-your-key-here" > .env

# Sab kuch ek command se start karo
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

---

## 🔑 OpenAI API Key Setup (AI Analysis ke liye)

1. https://platform.openai.com/api-keys pe jao
2. New API key banao
3. `backend/.env` file mein daalo:
   ```
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```

> **Note:** OpenAI key ke bina bhi scanner kaam karega, sirf AI analysis section blank rahega.

---

## 🧪 Test Files

### Test ke liye vulnerable Python file banao (`test_vuln.py`):
```python
import os
import subprocess

# Bandit will catch these:
password = "hardcoded_secret_123"    # B105: hardcoded password
os.system("ls " + input())           # B605: shell injection
eval(input("Enter code: "))          # B307: eval usage
```

### Test ke liye requirements.txt banao:
```
django==2.0.0
requests==2.6.0
flask==0.10.1
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scan/code` | Python file ko scan karo |
| POST | `/scan/dependencies` | requirements.txt scan karo |
| GET | `/history` | Sab scan history dekho |
| GET | `/stats` | Dashboard statistics |
| GET/POST | `/policy` | Policy config dekho/update karo |
| GET | `/docs` | Swagger API documentation |

---

## 🛠️ Technologies Used

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.11, FastAPI |
| Frontend | React.js 18 |
| Code Scanner | Bandit (SAST) |
| Dependency Scanner | Safety + PyUp CVE DB |
| AI Analysis | OpenAI GPT-3.5 API |
| Database | In-memory (MongoDB ready) |
| Containerization | Docker + Docker Compose |
| CI/CD Integration | GitHub Actions / Jenkins |

---

## 👥 Team

- Abhimanyu Kumar (730120101002)
- Ankit Kumar (730120101007)
- Prabha Shankar (730120101015)
- Prabhat Ranjan (730120101016)

**Supervisor:** Sharad Pratap Singh, Asst. Professor  
**Department:** CSE, Tula's Institute, Dehradun

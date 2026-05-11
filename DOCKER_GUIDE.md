# SecureOpsAI — Docker pe Run Karne ki Guide

## Pehle kya chahiye (Prerequisites)

- **Docker Desktop** install hona chahiye — https://www.docker.com/products/docker-desktop/
- **Docker Compose** (Docker Desktop ke saath automatically aata hai)
- **OpenAI API Key**

---

## Step 1 — Files Replace Karo

RAR ke andar jo files hain, unme ye 4 files **replace** karni hain:

| Yahan se download karo | Yahan copy karo (RAR folder mein) |
|---|---|
| `requirements.txt` | `SecureOpsAI/backend/requirements.txt` |
| `backend.Dockerfile` | `SecureOpsAI/backend/Dockerfile` (naam se "backend." hata do) |
| `frontend.Dockerfile` | `SecureOpsAI/frontend/Dockerfile` (naam se "frontend." hata do) |
| `docker-compose.yml` | `SecureOpsAI/docker-compose.yml` |

---

## Step 2 — .env File Banao

`SecureOpsAI/` folder mein `.env` naam ki file banao:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

> `.env.example` dekho reference ke liye.

---

## Step 3 — Frontend ka Proxy Fix Karo

`SecureOpsAI/frontend/package.json` kholo aur ye line **dhundho aur hatao**:

```json
"proxy": "http://localhost:8000",
```

> Docker mein frontend aur backend alag containers mein hote hain, isliye `localhost` kaam nahi karta. `REACT_APP_API_URL` environment variable use hoga.

---

## Step 4 — Docker Build aur Run Karo

Terminal/Command Prompt mein `SecureOpsAI/` folder mein jao:

```bash
cd path/to/SecureOpsAI
```

Pehli baar build karo (thoda time lagega):

```bash
docker compose up --build
```

Agar sab theek raha to dono containers start ho jayenge:
- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

---

## Step 5 — Browser mein kholo

http://localhost:3000

---

## Common Errors aur Fix

### ❌ `ModuleNotFoundError: No module named 'dotenv'`
**Fix:** `requirements.txt` replace nahi ki. Step 1 dobara karo.

### ❌ `proxy` error ya frontend backend se connect nahi ho raha
**Fix:** `package.json` se `"proxy"` line hatao (Step 3).

### ❌ `OPENAI_API_KEY not found`
**Fix:** `.env` file banao (Step 2).

### ❌ Port already in use
```bash
docker compose down
docker compose up --build
```

---

## Helpful Commands

```bash
# Containers band karo
docker compose down

# Logs dekhna (live)
docker compose logs -f

# Sirf backend ka log
docker compose logs -f backend

# Containers restart karo (rebuild ke bina)
docker compose restart

# Sab kuch saaf karo (fresh start)
docker compose down --volumes --rmi all
docker compose up --build
```

---

## Project Structure (Docker ke baad)

```
SecureOpsAI/
├── backend/
│   ├── Dockerfile          ← replaced ✅
│   ├── main.py
│   ├── requirements.txt    ← replaced ✅
│   └── ...
├── frontend/
│   ├── Dockerfile          ← replaced ✅
│   ├── src/
│   └── package.json        ← proxy line hatao ✅
├── docker-compose.yml      ← replaced ✅
├── .env                    ← naya banao ✅
└── ...
```

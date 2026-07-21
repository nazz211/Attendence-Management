from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from .auth import hash_password
from .config import CORS_ORIGINS
from .database import Base, SessionLocal, engine
from .models import Role, User
from .routes import router

def seed_admin():
    with SessionLocal() as db:
        if not db.scalar(select(User).where(User.email == "admin@example.com")):
            db.add(User(name="Administrator", email="admin@example.com", password_hash=hash_password("admin123"), role=Role.admin))
            db.commit()

@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_admin()
    yield

app = FastAPI(title="Employee Attendance Management API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.get("/health")
def health(): return {"status": "ok"}

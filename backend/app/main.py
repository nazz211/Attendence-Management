from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
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

def add_gps_columns():
    columns = ["check_in_latitude", "check_in_longitude", "check_out_latitude", "check_out_longitude"]
    with engine.begin() as connection:
        for column in columns:
            connection.execute(text(f"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS {column} DOUBLE PRECISION"))

def add_profile_columns():
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30)"))
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500)"))

@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    add_gps_columns()
    add_profile_columns()
    seed_admin()
    yield

app = FastAPI(title="Employee Attendance Management API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(router)

@app.get("/health")
def health(): return {"status": "ok"}

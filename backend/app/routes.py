from datetime import date, datetime
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from .auth import create_access_token, hash_password, verify_password
from .database import get_db
from .dependencies import get_current_user, require_admin
from .models import Attendance, AttendanceStatus, OfficeSettings, Role, User
from .schemas import AttendanceOut, DashboardStats, LocationPayload, LoginRequest, OfficeSettingsOut, OfficeSettingsUpdate, PasswordChange, ProfileUpdate, TokenResponse, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api")
PROFILE_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "profile"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}

def get_office_settings(db: Session) -> OfficeSettings:
    settings = db.get(OfficeSettings, 1)
    if not settings:
        settings = OfficeSettings(id=1, allowed_radius=50.0)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def is_within_office(location: LocationPayload, settings: OfficeSettings) -> bool:
    if settings.office_latitude is None or settings.office_longitude is None:
        raise HTTPException(status_code=400, detail="Office location has not been configured")
    earth_radius_m = 6_371_000
    lat1, lon1, lat2, lon2 = map(radians, [location.latitude, location.longitude, settings.office_latitude, settings.office_longitude])
    lat_delta, lon_delta = lat2 - lat1, lon2 - lon1
    haversine = sin(lat_delta / 2) ** 2 + cos(lat1) * cos(lat2) * sin(lon_delta / 2) ** 2
    return earth_radius_m * 2 * asin(sqrt(haversine)) <= settings.allowed_radius

@router.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return {"access_token": create_access_token(user.id, user.role.value), "user": user}

@router.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserOut)
def update_profile(data: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    current_user.name = data.name.strip()
    current_user.phone_number = data.phone_number.strip() if data.phone_number else None
    db.commit(); db.refresh(current_user)
    return current_user

@router.put("/profile/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()

@router.post("/profile/image", response_model=UserOut)
async def upload_profile_image(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    suffix = Path(file.filename or "").suffix.lower()
    if file.content_type not in ALLOWED_IMAGE_TYPES or suffix not in ALLOWED_IMAGE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, and PNG images are allowed")
    content = await file.read()
    if not content or len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Profile image must be 2 MB or smaller")
    is_jpeg = content.startswith(b"\xff\xd8\xff")
    is_png = content.startswith(b"\x89PNG\r\n\x1a\n")
    if not is_jpeg and not is_png:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid JPG or PNG image")
    PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{current_user.id}_{uuid4().hex}{suffix}"
    (PROFILE_UPLOAD_DIR / filename).write_bytes(content)
    current_user.profile_image = f"/uploads/profile/{filename}"
    db.commit(); db.refresh(current_user)
    return current_user

@router.get("/admin/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    today = date.today()
    total = db.scalar(select(func.count()).select_from(User).where(User.role == Role.employee)) or 0
    present = db.scalar(select(func.count()).select_from(Attendance).join(User).where(Attendance.date == today, User.role == Role.employee)) or 0
    return {"total_employees": total, "present_today": present, "absent_today": max(0, total - present)}

@router.get("/office-settings", response_model=OfficeSettingsOut)
def office_settings(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return get_office_settings(db)

@router.put("/office-settings", response_model=OfficeSettingsOut)
def update_office_settings(data: OfficeSettingsUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    settings = get_office_settings(db)
    settings.office_latitude = data.office_latitude
    settings.office_longitude = data.office_longitude
    settings.allowed_radius = data.allowed_radius
    db.commit(); db.refresh(settings)
    return settings

@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.scalars(select(User).where(User.role == Role.employee).order_by(User.name)).all()

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = User(name=data.name, email=data.email.lower(), password_hash=hash_password(data.password), phone_number=data.phone_number, role=Role.employee)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=409, detail="Email is already in use")
    db.refresh(user); return user

@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user or user.role != Role.employee: raise HTTPException(status_code=404, detail="Employee not found")
    user.name, user.email = data.name, data.email.lower()
    if data.password: user.password_hash = hash_password(data.password)
    if "phone_number" in data.model_fields_set: user.phone_number = data.phone_number
    try:
        db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=409, detail="Email is already in use")
    db.refresh(user); return user

@router.post("/users/{user_id}/image", response_model=UserOut)
async def upload_user_image(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user or user.role != Role.employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    suffix = Path(file.filename or "").suffix.lower()
    if file.content_type not in ALLOWED_IMAGE_TYPES or suffix not in ALLOWED_IMAGE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, and PNG images are allowed")
    content = await file.read()
    if not content or len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Profile image must be 2 MB or smaller")
    is_jpeg = content.startswith(b"\xff\xd8\xff")
    is_png = content.startswith(b"\x89PNG\r\n\x1a\n")
    if not is_jpeg and not is_png:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid JPG or PNG image")
    PROFILE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{user.id}_{uuid4().hex}{suffix}"
    (PROFILE_UPLOAD_DIR / filename).write_bytes(content)
    user.profile_image = f"/uploads/profile/{filename}"
    db.commit(); db.refresh(user)
    return user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user or user.role != Role.employee: raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(user); db.commit()

def attendance_query(db, user_id=None, search=None, attendance_date=None):
    statement = select(Attendance).options(joinedload(Attendance.user)).join(User)
    if user_id: statement = statement.where(Attendance.user_id == user_id)
    if attendance_date: statement = statement.where(Attendance.date == attendance_date)
    if search: statement = statement.where(or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    return db.scalars(statement.order_by(Attendance.date.desc(), Attendance.check_in.desc())).unique().all()

@router.get("/attendance", response_model=list[AttendanceOut])
def all_attendance(search: str | None = None, attendance_date: date | None = Query(None, alias="date"), db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return attendance_query(db, search=search, attendance_date=attendance_date)

@router.get("/attendance/me", response_model=list[AttendanceOut])
def my_attendance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return attendance_query(db, user_id=current_user.id)

@router.post("/attendance/check-in", response_model=AttendanceOut)
def check_in(location: LocationPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.employee: raise HTTPException(status_code=403, detail="Only employees can check in")
    today = date.today()
    if db.scalar(select(Attendance).where(Attendance.user_id == current_user.id, Attendance.date == today)):
        raise HTTPException(status_code=409, detail="You have already checked in today")
    if not is_within_office(location, get_office_settings(db)):
        raise HTTPException(status_code=403, detail="You are outside the office premises. Attendance cannot be marked.")
    record = Attendance(user_id=current_user.id, date=today, check_in=datetime.now(), check_in_latitude=location.latitude, check_in_longitude=location.longitude, status=AttendanceStatus.present)
    db.add(record); db.commit(); db.refresh(record); return record

@router.post("/attendance/check-out", response_model=AttendanceOut)
def check_out(location: LocationPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.employee: raise HTTPException(status_code=403, detail="Only employees can check out")
    record = db.scalar(select(Attendance).where(Attendance.user_id == current_user.id, Attendance.date == date.today()))
    if not record: raise HTTPException(status_code=400, detail="Check in before checking out")
    if record.check_out: raise HTTPException(status_code=409, detail="You have already checked out today")
    if not is_within_office(location, get_office_settings(db)):
        raise HTTPException(status_code=403, detail="You are outside the office premises. Attendance cannot be marked.")
    record.check_out = datetime.now()
    record.check_out_latitude, record.check_out_longitude = location.latitude, location.longitude
    db.commit(); db.refresh(record); return record

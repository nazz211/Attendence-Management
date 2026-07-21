from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from .auth import create_access_token, hash_password, verify_password
from .database import get_db
from .dependencies import get_current_user, require_admin
from .models import Attendance, AttendanceStatus, Role, User
from .schemas import AttendanceOut, DashboardStats, LoginRequest, TokenResponse, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api")

@router.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return {"access_token": create_access_token(user.id, user.role.value), "user": user}

@router.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/admin/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    today = date.today()
    total = db.scalar(select(func.count()).select_from(User).where(User.role == Role.employee)) or 0
    present = db.scalar(select(func.count()).select_from(Attendance).join(User).where(Attendance.date == today, User.role == Role.employee)) or 0
    return {"total_employees": total, "present_today": present, "absent_today": max(0, total - present)}

@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.scalars(select(User).where(User.role == Role.employee).order_by(User.name)).all()

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = User(name=data.name.strip(), email=data.email.lower(), password_hash=hash_password(data.password), role=Role.employee)
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
    user.name, user.email = data.name.strip(), data.email.lower()
    if data.password: user.password_hash = hash_password(data.password)
    try:
        db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=409, detail="Email is already in use")
    db.refresh(user); return user

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
def check_in(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.employee: raise HTTPException(status_code=403, detail="Only employees can check in")
    today = date.today()
    if db.scalar(select(Attendance).where(Attendance.user_id == current_user.id, Attendance.date == today)):
        raise HTTPException(status_code=409, detail="You have already checked in today")
    record = Attendance(user_id=current_user.id, date=today, check_in=datetime.now(), status=AttendanceStatus.present)
    db.add(record); db.commit(); db.refresh(record); return record

@router.post("/attendance/check-out", response_model=AttendanceOut)
def check_out(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.employee: raise HTTPException(status_code=403, detail="Only employees can check out")
    record = db.scalar(select(Attendance).where(Attendance.user_id == current_user.id, Attendance.date == date.today()))
    if not record: raise HTTPException(status_code=400, detail="Check in before checking out")
    if record.check_out: raise HTTPException(status_code=409, detail="You have already checked out today")
    record.check_out = datetime.now(); db.commit(); db.refresh(record); return record

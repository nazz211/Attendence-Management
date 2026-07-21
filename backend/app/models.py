import enum
from datetime import date, datetime
from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Role(str, enum.Enum):
    admin = "admin"
    employee = "employee"

class AttendanceStatus(str, enum.Enum):
    present = "Present"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role, name="user_role"), nullable=False, default=Role.employee)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    attendance: Mapped[list["Attendance"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_attendance_user_date"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_in: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # Kept as a nullable database column. Avoiding ``datetime | None`` here
    # maintains compatibility with SQLAlchemy 2.0.36 on Python 3.14.
    check_out: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus, name="attendance_status"), nullable=False, default=AttendanceStatus.present)
    user: Mapped[User] = relationship(back_populates="attendance")

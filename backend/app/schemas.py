from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from .models import Role, AttendanceStatus

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class UserUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str | None = Field(default=None, min_length=6, max_length=128)

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Role
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AttendanceOut(BaseModel):
    id: int
    user_id: int
    date: date
    check_in: datetime
    check_out: datetime | None
    status: AttendanceStatus
    user: UserOut | None = None
    model_config = ConfigDict(from_attributes=True)

class DashboardStats(BaseModel):
    total_employees: int
    present_today: int
    absent_today: int

TokenResponse.model_rebuild()

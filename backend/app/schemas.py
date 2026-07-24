from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
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
    phone_number: str | None = Field(default=None, max_length=30)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return value

    @field_validator("phone_number")
    @classmethod
    def normalize_phone_number(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None

class UserUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str | None = Field(default=None, min_length=6, max_length=128)
    phone_number: str | None = Field(default=None, max_length=30)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return value

    @field_validator("phone_number")
    @classmethod
    def normalize_phone_number(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Role
    phone_number: str | None
    profile_image: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AttendanceOut(BaseModel):
    id: int
    user_id: int
    date: date
    check_in: datetime
    check_out: datetime | None
    check_in_latitude: float | None
    check_in_longitude: float | None
    check_out_latitude: float | None
    check_out_longitude: float | None
    status: AttendanceStatus
    user: UserOut | None = None
    model_config = ConfigDict(from_attributes=True)

class DashboardStats(BaseModel):
    total_employees: int
    present_today: int
    absent_today: int

class LocationPayload(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

class OfficeSettingsUpdate(BaseModel):
    office_latitude: float = Field(ge=-90, le=90)
    office_longitude: float = Field(ge=-180, le=180)
    allowed_radius: float = Field(default=50, gt=0, le=100000)

class OfficeSettingsOut(BaseModel):
    office_latitude: float | None
    office_longitude: float | None
    allowed_radius: float
    model_config = ConfigDict(from_attributes=True)

class ProfileUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone_number: str | None = Field(default=None, max_length=30)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return value

    @field_validator("phone_number")
    @classmethod
    def normalize_phone_number(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)

TokenResponse.model_rebuild()

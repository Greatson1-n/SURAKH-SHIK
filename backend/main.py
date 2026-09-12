import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import PHOTOS_DIR
from app.models.database import init_db
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.cases import router as cases_router
from app.api.documents import router as documents_router
from app.api.sharing import router as sharing_router
from app.api.ledger_api import router as ledger_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database with WAL mode and pre-seed Indian geography and Admin identity
    init_db()
    yield

app = FastAPI(
    title="SURAKH-SHIK (सुरक्षा-साक्ष्य) API Gateway",
    description="Institutional-grade Zero-Trust Digital Evidence & Case Management System for NCRB/MHA",
    version="2.2",
    lifespan=lifespan
)

# CORS Configuration for frontend SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Photos directory for face verification
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

# Include Modular Routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(cases_router)
app.include_router(documents_router)
app.include_router(sharing_router)
app.include_router(ledger_router)

@app.get("/")
def root():
    return {
        "system": "SURAKH-SHIK (सुरक्षा-साक्ष्य)",
        "organization": "National Crime Records Bureau (NCRB) / Ministry of Home Affairs",
        "mandate": "Problem Statement 26190 - Secure Document Management System",
        "status": "OPERATIONAL",
        "statutory_compliance": ["BSA 2023 Sec 63", "BNS 2023 Sec 72", "DPDP Act 2023"],
        "security_gateways": ["Hardware Device Binding", "Face Biometrics 2FA", "Consortium Ledger Anchoring"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

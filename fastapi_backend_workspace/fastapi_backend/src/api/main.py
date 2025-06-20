import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from cryptography.fernet import Fernet, InvalidToken

# ========== ENV KEY SETUP ==========


# PUBLIC_INTERFACE
def get_fernet() -> Fernet:
    """
    PUBLIC_INTERFACE
    Get a Fernet object for encryption/decryption using key from environment variable.
    """
    key = os.getenv("SECRET_SHARING_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "SECRET_SHARING_ENCRYPTION_KEY not set in environment vars. "
            "You can generate one with: python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


# ========== IN-MEMORY DB STRUCTURE (for demonstration, replace with DB in production) ==========

secret_storage = {}  # Structure: {id: {ciphertext, created_at}}


# ========== PYDANTIC MODELS ==========

class SecretCreateRequest(BaseModel):
    secret_text: str = Field(..., description="The plaintext secret to store securely.")


class SecretCreateResponse(BaseModel):
    secret_id: str = Field(..., description="The unique identifier for retrieving the secret.")
    message: Optional[str] = Field(
        "Secret created successfully.", description="Status message."
    )


class SecretRetrieveResponse(BaseModel):
    secret_text: str = Field(..., description="The decrypted secret text.")


class SecretDeleteResponse(BaseModel):
    deleted: bool = Field(..., description="True if deletion succeeded.")
    message: str = Field(..., description="Status message about the operation.")


class ErrorResponse(BaseModel):
    detail: str


# ========== FASTAPI SETUP ==========

app = FastAPI(
    title="Secure Secret Sharing API",
    description=(
        "API for secure creation, retrieval, and deletion of secrets with encryption."
    ),
    version="1.0.0",
    openapi_tags=[
        {"name": "Secrets", "description": "Secret creation, fetch, and deletion APIs."}
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== UTILITY FUNCTIONS ==========

def store_secret(plaintext: str, fernet: Fernet) -> str:
    """Encrypt and store the secret, returning its unique ID."""
    secret_id = str(uuid.uuid4())
    ciphertext = fernet.encrypt(plaintext.encode())
    secret_storage[secret_id] = {
        "ciphertext": ciphertext,
        "created_at": datetime.utcnow(),
    }
    return secret_id


def fetch_secret(secret_id: str, fernet: Fernet) -> str:
    """Retrieve and decrypt the secret. Delete after first retrieval."""
    entry = secret_storage.get(secret_id)
    if not entry:
        raise KeyError("Secret not found")
    try:
        plaintext = fernet.decrypt(entry["ciphertext"]).decode()
    except InvalidToken:
        raise ValueError("Decryption failed. Invalid key or corrupt data.")
    return plaintext


def delete_secret(secret_id: str) -> bool:
    """Delete the secret by ID."""
    return bool(secret_storage.pop(secret_id, None))


# ========== ROUTES ==========

@app.get("/", tags=["Health"])
def health_check():
    """Simple readiness probe."""
    return {"message": "Healthy"}


# PUBLIC_INTERFACE
@app.post(
    "/secret",
    response_model=SecretCreateResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["Secrets"],
    summary="Create a new encrypted secret",
    description=(
        "Accepts plaintext secret, encrypts it, stores the ciphertext, "
        "and returns a one-time retrieval link ID."
    ),
)
def create_secret(payload: SecretCreateRequest):
    fernet = get_fernet()
    if not payload.secret_text or not payload.secret_text.strip():
        raise HTTPException(status_code=400, detail="Secret text cannot be empty.")
    secret_id = store_secret(payload.secret_text, fernet)
    return SecretCreateResponse(secret_id=secret_id)


# PUBLIC_INTERFACE
@app.get(
    "/secret/{secret_id}",
    response_model=SecretRetrieveResponse,
    responses={
        404: {"model": ErrorResponse},
        410: {"model": ErrorResponse},
    },
    tags=["Secrets"],
    summary="Retrieve and delete a secret",
    description=(
        "Returns the plaintext secret corresponding to secret_id and deletes it (one-time visibility)."
    ),
)
def get_secret(secret_id: str):
    fernet = get_fernet()
    try:
        plaintext = fetch_secret(secret_id, fernet)
        delete_secret(secret_id)
    except KeyError:
        raise HTTPException(
            status_code=404, detail="Secret not found or already retrieved."
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=410,
            detail=f"Failed to decrypt or secret is invalid: {ve}"
        )
    return SecretRetrieveResponse(secret_text=plaintext)


# PUBLIC_INTERFACE
@app.delete(
    "/secret/{secret_id}",
    response_model=SecretDeleteResponse,
    responses={
        404: {"model": ErrorResponse}
    },
    tags=["Secrets"],
    summary="Delete a secret by ID",
    description="Permanently removes the stored (ciphertext) secret by its ID.",
)
def delete_secret_api(secret_id: str):
    deleted = delete_secret(secret_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=(
                "Secret not found or already "
                "deleted."
            ),
        )
    return SecretDeleteResponse(deleted=True, message="Secret deleted successfully.")


# PUBLIC_INTERFACE
@app.get(
    "/secrets/exists/{secret_id}",
    response_model=bool,
    tags=["Secrets"],
    summary="Check if a secret exists",
    description="Returns True if the secret ID exists (ciphertext in storage).",
)
def secret_exists(secret_id: str):
    return secret_id in secret_storage


@app.get("/docs/fernet-key-help", tags=["Help"])
def encryption_key_instructions():
    """
    Returns help on generating and setting Fernet encryption environment key.
    """
    return {
        "instructions": [
            "Generate an encryption key: python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\"",
            "Set this in your environment: export SECRET_SHARING_ENCRYPTION_KEY=<generated key>",
            "Restart backend after setting for changes to take effect.",
        ]
    }

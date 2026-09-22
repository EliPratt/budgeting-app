from pydantic import BaseModel, ConfigDict

from app.schemas.transaction import TransactionOut


class ImportBatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    filename: str
    imported_count: int
    duplicate_count: int


class ImportResultOut(BaseModel):
    batch: ImportBatchOut
    created: list[TransactionOut]

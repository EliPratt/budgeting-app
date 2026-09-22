from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.schemas.import_batch import ImportResultOut
from app.services.imports import run_import

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("", response_model=ImportResultOut, status_code=status.HTTP_201_CREATED)
async def create_import(
    account_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    if db.get(Account, account_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    content = await file.read()
    try:
        result = run_import(db, account_id, file.filename or "import", content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"batch": result.batch, "created": result.created}

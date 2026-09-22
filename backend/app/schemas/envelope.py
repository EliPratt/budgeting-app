from pydantic import BaseModel, ConfigDict


class EnvelopeCreate(BaseModel):
    name: str
    group_name: str | None = None


class EnvelopeUpdate(BaseModel):
    name: str | None = None
    group_name: str | None = None


class EnvelopeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    group_name: str | None

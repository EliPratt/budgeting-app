from enum import Enum

from pydantic import BaseModel, ConfigDict


class MatchType(str, Enum):
    contains = "contains"
    regex = "regex"


class CategoryRuleCreate(BaseModel):
    envelope_id: int
    match_type: MatchType = MatchType.contains
    pattern: str
    priority: int = 0


class CategoryRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    envelope_id: int
    match_type: MatchType
    pattern: str
    priority: int

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.database import get_db
from app.parser import WaOrderParser

router = APIRouter(tags=["parse"])

class ParseRequest(BaseModel):
    raw_text: str
    id_po: int

@router.post("/parse")
def parse_text(req: ParseRequest, db = Depends(get_db)):
    aliases = db.table("alias_menu").select("*").execute().data
    alias_map = {a["kata_kunci"]: a for a in aliases}
    
    keywords = db.table("area_keywords").select("*").execute().data
    area_keywords = {k["keyword"]: k["area_tag"] for k in keywords}
    
    slots = db.table("delivery_slots").select("*").eq("id_po", req.id_po).execute().data
    
    parser = WaOrderParser(alias_map, area_keywords, slots)
    return parser.parse(req.raw_text)

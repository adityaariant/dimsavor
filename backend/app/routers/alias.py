from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import get_db

router = APIRouter(tags=["alias"])

class AliasCreate(BaseModel):
    kata_kunci: str
    nama_produk_baku: str
    kitchen_code: str

class AliasUpdate(BaseModel):
    kata_kunci: Optional[str] = None
    nama_produk_baku: Optional[str] = None
    kitchen_code: Optional[str] = None

class AreaKeywordCreate(BaseModel):
    keyword: str
    area_tag: str

@router.get("/alias")
def list_aliases(db = Depends(get_db)):
    res = db.table("alias_menu").select("*").execute()
    return res.data

@router.post("/alias")
def create_alias(alias: AliasCreate, db = Depends(get_db)):
    res = db.table("alias_menu").insert(alias.model_dump()).execute()
    return res.data[0]

@router.patch("/alias/{id_alias}")
def update_alias(id_alias: int, alias: AliasUpdate, db = Depends(get_db)):
    update_data = {k: v for k, v in alias.model_dump().items() if v is not None}
    res = db.table("alias_menu").update(update_data).eq("id_alias", id_alias).execute()
    return res.data[0]

@router.delete("/alias/{id_alias}")
def delete_alias(id_alias: int, db = Depends(get_db)):
    db.table("alias_menu").delete().eq("id_alias", id_alias).execute()
    return {"message": "Alias deleted"}

@router.get("/area-keywords")
def list_area_keywords(db = Depends(get_db)):
    res = db.table("area_keywords").select("*").execute()
    return res.data

@router.post("/area-keywords")
def create_area_keyword(ak: AreaKeywordCreate, db = Depends(get_db)):
    res = db.table("area_keywords").insert(ak.model_dump()).execute()
    return res.data[0]

@router.delete("/area-keywords/{id_keyword}")
def delete_area_keyword(id_keyword: int, db = Depends(get_db)):
    db.table("area_keywords").delete().eq("id_keyword", id_keyword).execute()
    return {"message": "Area keyword deleted"}

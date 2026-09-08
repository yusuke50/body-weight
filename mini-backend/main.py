from fastapi import FastAPI
from pydantic import BaseModel

class Record(BaseModel):
  date: str
  weight: int
  body_fat_percentage: float | None = None
  water_percentage: float | None = None
  muscle_mass: float | None = None
  id: int | None = None
  created_at: str

records = []

app = FastAPI()

@app.get("/ping")
def ping():
  return {"message": "pong"}

@app.get("/records")
def get_records():
  return records

@app.post("/records")
def add_record(record: Record):
  records.append(record)
  return {"message": "record added"}


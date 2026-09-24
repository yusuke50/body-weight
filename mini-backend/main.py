from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlite3
from datetime import datetime

class RecordCreate(BaseModel):
    date: str
    weight: float
    body_fat_percentage: float | None = None
    water_percentage: float | None = None
    muscle_mass: float | None = None

class RecordOut(RecordCreate):
    id: int
    created_at: str

con = sqlite3.connect('mini.db', check_same_thread=False)
con.row_factory = sqlite3.Row
cur = con.cursor()
cur.execute('''
    CREATE TABLE IF NOT EXISTS records (
        date TEXT NOT NULL,
        weight REAL NOT NULL,
        body_fat_percentage REAL,
        water_percentage REAL,
        muscle_mass REAL,
        id INTEGER PRIMARY KEY,
        created_at DATETIME NOT NULL
    )''')

app = FastAPI()

@app.get("/ping")
def ping():
    return {"message": "pong"}

@app.get("/records", response_model=list[RecordOut])
def get_records():
    return [dict(row) for row in cur.execute("SELECT * FROM records").fetchall()]

@app.get("/records/{record_id}", response_model=RecordOut)
def get_record(record_id: int):
    data = cur.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    if data:
        return dict(data)
    else:
        raise HTTPException(status_code=404, detail="Data not found")

@app.post("/records", status_code=201, response_model=RecordOut)
def add_record(record: RecordCreate):
    cur.execute("INSERT INTO records(date, weight, body_fat_percentage, water_percentage, muscle_mass, created_at) VALUES(?, ?, ?, ?, ?, ?)", (record.date, record.weight, record.body_fat_percentage, record.water_percentage, record.muscle_mass, datetime.now().isoformat()))
    con.commit()
    new_id = cur.lastrowid
    data = cur.execute("SELECT * FROM records WHERE id = ?", (new_id,)).fetchone()
    return dict(data)

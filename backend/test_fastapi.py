from fastapi import FastAPI
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, Session
from fastapi.testclient import TestClient

app = FastAPI()
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)

e = create_engine('sqlite:///:memory:')
Base.metadata.create_all(e)

with Session(e) as db:
    db.add(User(name="test"))
    db.commit()

@app.get("/user")
def get_user():
    with Session(e) as db:
        return db.query(User).first()

client = TestClient(app)
try:
    res = client.get("/user")
    print(res.status_code)
    print(res.json())
except Exception as ex:
    print(ex)

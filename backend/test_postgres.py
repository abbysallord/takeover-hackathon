import os
import urllib.parse
from sqlalchemy import create_engine, text, MetaData, Column, Integer, String
from sqlalchemy.orm import declarative_base

DATABASE_URL = "postgresql://postgres.adsnzcfkyiexmfrwoehv:connect%40hackarena.dev@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

engine = create_engine(DATABASE_URL)
Base = declarative_base()

class TestTable(Base):
    __tablename__ = 'test_table'
    id = Column(Integer, primary_key=True)
    name = Column(String(50))

try:
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS session_test"))
        tenant_conn = conn.execution_options(schema_translate_map={None: "session_test"})
        Base.metadata.create_all(bind=tenant_conn)
        print("Success!")
except Exception as e:
    print(f"Error: {e}")

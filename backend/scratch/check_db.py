import os
import psycopg2

db_url = "postgresql://postgres.adsnzcfkyiexmfrwoehv:connect%40hackarena.dev@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Check public schema workspaces
    try:
        cur.execute("SELECT company_name, business_email, google_redirect_uri, google_client_id FROM public.workspaces;")
        rows = cur.fetchall()
        print("PUBLIC WORKSPACES:")
        for r in rows:
            print(r)
    except Exception as e:
        print("Error checking public schema:", e)
        conn.rollback()
        
    # Check session schema workspaces
    try:
        cur.execute("SELECT company_name, business_email, google_redirect_uri, google_client_id FROM session_igxypfhvusfmhr7yu3zasa.workspaces;")
        rows = cur.fetchall()
        print("SESSION_IGXYPFHVUSFMHR7YU3ZASA WORKSPACES:")
        for r in rows:
            print(r)
    except Exception as e:
        print("Error checking session schema:", e)
        conn.rollback()
        
    # Check all schemas starting with session_ and their workspaces table
    cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'session_%';")
    schemas = [r[0] for r in cur.fetchall()]
    print("ALL SESSION SCHEMAS:")
    for s in schemas:
        try:
            cur.execute(f"SELECT google_redirect_uri FROM {s}.workspaces;")
            row = cur.fetchone()
            print(f"  {s}: {row[0] if row else 'No rows'}")
        except Exception:
            print(f"  {s}: Table workspaces not found or error")
            conn.rollback()

    cur.close()
    conn.close()
except Exception as e:
    print("Database connection error:", e)

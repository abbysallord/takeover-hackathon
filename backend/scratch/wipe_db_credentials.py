import psycopg2

db_url = "postgresql://postgres.adsnzcfkyiexmfrwoehv:connect%40hackarena.dev@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # 1. Update public schema workspaces
    try:
        cur.execute("""
            UPDATE public.workspaces 
            SET google_client_id = NULL, 
                google_client_secret = NULL, 
                google_redirect_uri = NULL;
        """)
        print("Cleared credentials in public schema workspaces table.")
        conn.commit()
    except Exception as e:
        print("Error clearing public schema:", e)
        conn.rollback()
        
    # 2. Get all session schemas
    cur.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'session_%';")
    schemas = [r[0] for r in cur.fetchall()]
    
    # 3. Clear credentials in all session schemas
    for s in schemas:
        try:
            # Check if table exists
            cur.execute(f"SELECT FROM information_schema.tables WHERE table_schema = '{s}' AND table_name = 'workspaces';")
            if cur.rowcount > 0:
                cur.execute(f"""
                    UPDATE {s}.workspaces 
                    SET google_client_id = NULL, 
                        google_client_secret = NULL, 
                        google_redirect_uri = NULL;
                """)
                print(f"Cleared credentials in {s}.workspaces table.")
            conn.commit()
        except Exception as e:
            print(f"Error clearing {s} schema:", e)
            conn.rollback()

    cur.close()
    conn.close()
    print("Database credentials cleanup completed successfully!")
except Exception as e:
    print("Database connection error:", e)

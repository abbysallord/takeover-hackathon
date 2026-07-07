from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer
e = create_engine('sqlite:///:memory:')
m = MetaData()
Table('foo', m, Column('id', Integer))
c = e.connect()

# In SQLite, schemas are not supported natively the same way, but it should output the table name with a prefix or something, or it might fail.
# Let's see what happens.
try:
    t = c.execution_options(schema_translate_map={None: 'my_schema'})
    m.create_all(bind=t)
    print(c.execute(text('SELECT name FROM sqlite_master WHERE type="table"')).fetchall())
except Exception as ex:
    print(ex)

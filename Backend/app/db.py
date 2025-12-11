import psycopg2
from urllib.parse import urlparse
from app.config import Config

result = urlparse(Config.DATABASE_URL)
conn = psycopg2.connect(
    host=result.hostname,
    database=result.path[1:],
    user=result.username,
    password=result.password,
    port=result.port
)


def get_cursor():
    return conn.cursor()

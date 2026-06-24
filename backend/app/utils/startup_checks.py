# app/utils/startup_checks.py
import os
import socket
from dotenv import load_dotenv

load_dotenv()

def check_neo4j():
    """Return True if Neo4j is reachable and authenticated, else False."""
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER")
    password = os.getenv("NEO4J_PASSWORD")

    if not uri or not password:
        print("⚠️  Neo4j not configured – skipping graph features")
        return False

    # 1. DNS check
    host = uri.replace("neo4j+s://", "").replace("bolt://", "").split(":")[0]
    try:
        socket.gethostbyname(host)
    except socket.gaierror:
        print(f"❌ Neo4j DNS resolution failed for {host} – database may be paused or deleted")
        return False

    # 2. Connection + authentication test
    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        # Quick write/read test
        with driver.session() as session:
            session.run("MERGE (t:TestNode {name: 'startup_check'})")
            result = session.run("MATCH (t:TestNode) RETURN count(t) as cnt")
            cnt = result.single()["cnt"]
        driver.close()
        print(f"✅ Neo4j Connected! (test node count: {cnt})")
        return True
    except Exception as e:
        print(f"❌ Neo4j connection failed: {e}")
        return False


def check_pinecone():
    """Return True if Pinecone is reachable, else False."""
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        indexes = pc.list_indexes()
        print(f"✅ Pinecone connected – {len(indexes)} index(es) found")
        return True
    except Exception as e:
        print(f"⚠️  Pinecone check skipped or failed: {e}")
        return False


def run_startup_checks():
    """Perform all health checks and print a summary."""
    print("\n" + "=" * 50)
    print("🔍 POLYNOUS STARTUP CHECKS")
    print("=" * 50)
    neo4j_ok = check_neo4j()
    pinecone_ok = check_pinecone()

    if not neo4j_ok:
        print("ℹ️  Knowledge Graph & Memory Bank will not be available")
    if not pinecone_ok:
        print("ℹ️  Vector search will use in‑memory fallback")

    print("=" * 50 + "\n")
    return neo4j_ok, pinecone_ok
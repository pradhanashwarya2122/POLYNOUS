"""
POLYNOUS Production System Test
Tests every component: Backend, Frontend, Database, Neo4j, Pinecone, Auth, Research
Run: python test_production.py
"""
import requests
import json
import time
import sys

# ============================================================
# CONFIG
# ============================================================
API = "https://polynous-api-production-000f.up.railway.app"
FRONTEND = "https://polynous.pages.dev"

PASS = "✅"
FAIL = "❌"
WARN = "⚠️"

results = []
TOKEN = None

def record(name, passed, detail=""):
    results.append((name, passed, detail))
    icon = PASS if passed else FAIL
    print(f"   {icon} {detail or ('passed' if passed else 'failed')}")

def print_header(title):
    print(f"\n{'='*60}")
    print(f"📌 {title}")
    print(f"{'='*60}")

print(f"\n{'='*60}")
print(f"🧪 POLYNOUS PRODUCTION SYSTEM TEST")
print(f"   API:      {API}")
print(f"   Frontend: {FRONTEND}")
print(f"{'='*60}")

# ============================================================
# TEST 1: Backend Health
# ============================================================
print_header("TEST 1: Backend Health")
try:
    r = requests.get(f"{API}/health", timeout=10)
    data = r.json()
    
    if data.get("status") == "healthy":
        record("Backend Health", True, f"Status: {data['status']}")
    else:
        record("Backend Health", False, f"Status: {data.get('status')}")
    
    if data.get("database") == "connected":
        record("Database", True, "PostgreSQL connected")
    else:
        record("Database", False, f"Database: {data.get('database', 'unknown')}")
    
    if data.get("agents") == 7:
        record("Agents", True, "All 7 agents ready")
    else:
        record("Agents", False, f"Agents: {data.get('agents', 0)}")
    
except Exception as e:
    record("Backend Health", False, f"Cannot connect: {str(e)[:80]}")
    record("Database", False, "Skipped")
    record("Agents", False, "Skipped")

# ============================================================
# TEST 2: Frontend Reachable
# ============================================================
print_header("TEST 2: Frontend")
try:
    r = requests.get(FRONTEND, timeout=10, allow_redirects=True)
    if r.status_code == 200:
        record("Frontend", True, "Reachable (200)")
    else:
        record("Frontend", False, f"Status: {r.status_code}")
except Exception as e:
    record("Frontend", False, f"Cannot reach: {str(e)[:80]}")

# ============================================================
# TEST 3: Authentication
# ============================================================
print_header("TEST 3: Authentication")

timestamp = int(time.time())

# Try register
try:
    r = requests.post(f"{API}/auth/register", json={
        "email": f"prodtest_{timestamp}@test.com",
        "username": f"prodtest_{timestamp}",
        "password": "TestPass!123"
    }, timeout=10)
    
    if r.status_code == 200 and "access_token" in r.json():
        TOKEN = r.json()["access_token"]
        record("Register", True, "New user created")
    elif r.status_code == 409:
        # Try login
        r = requests.post(f"{API}/auth/login", json={
            "email": f"prodtest_{timestamp}@test.com",
            "password": "TestPass!123"
        }, timeout=10)
        if r.status_code == 200 and "access_token" in r.json():
            TOKEN = r.json()["access_token"]
            record("Register", True, "Existing user, logged in")
        else:
            record("Register", False, f"Login failed: {r.status_code}")
    else:
        record("Register", False, f"Failed: {r.status_code} - {r.text[:100]}")
except Exception as e:
    record("Register", False, f"Error: {str(e)[:80]}")

# Test protected route
if TOKEN:
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {TOKEN}"}, timeout=10)
    if r.status_code == 200:
        user = r.json()
        record("Auth/Me", True, f"User: {user.get('username', '?')}")
    else:
        record("Auth/Me", False, f"Status: {r.status_code}")

# ============================================================
# TEST 4: Research Pipeline
# ============================================================
print_header("TEST 4: Research Pipeline (/ask)")
if TOKEN:
    try:
        r = requests.post(f"{API}/ask", json={
            "query": "What is artificial intelligence?",
            "debate_mode": False
        }, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=60)
        
        if r.status_code == 200:
            data = r.json()
            answer_len = len(data.get("answer", ""))
            sources = len(data.get("sources", []))
            confidence = data.get("confidence", 0)
            record("Research", True, f"Answer: {answer_len} chars, Sources: {sources}, Confidence: {confidence}%")
        else:
            record("Research", False, f"Status {r.status_code}: {r.text[:150]}")
    except Exception as e:
        record("Research", False, f"Error: {str(e)[:80]}")
else:
    record("Research", False, "No token")

# ============================================================
# TEST 5: Debate Pipeline
# ============================================================
print_header("TEST 5: Debate Pipeline")
if TOKEN:
    try:
        r = requests.post(f"{API}/ask", json={
            "query": "Should AI be regulated?",
            "debate_mode": True
        }, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=60)
        
        if r.status_code == 200:
            data = r.json()
            verdict = data.get("debate_verdict", {})
            winner = verdict.get("winner", "TIE")
            for_score = verdict.get("for_score", 0)
            against_score = verdict.get("against_score", 0)
            record("Debate", True, f"Winner: {winner} (FOR:{for_score}/10 vs AGAINST:{against_score}/10)")
        else:
            record("Debate", False, f"Status {r.status_code}: {r.text[:150]}")
    except Exception as e:
        record("Debate", False, f"Error: {str(e)[:80]}")
else:
    record("Debate", False, "No token")

# ============================================================
# TEST 6: Memory & Storage
# ============================================================
print_header("TEST 6: Memory & Storage")
if TOKEN:
    endpoints = [
        ("/memory/stats", "Memory Stats"),
        ("/memory/history", "Memory History"),
        ("/memory/interests", "Memory Interests"),
        ("/memory/debates", "Memory Debates"),
    ]
    
    for path, label in endpoints:
        try:
            r = requests.get(f"{API}{path}", headers={"Authorization": f"Bearer {TOKEN}"}, timeout=10)
            if r.status_code == 200:
                record(label, True, f"Working (200)")
            else:
                record(label, False, f"Status: {r.status_code}")
        except Exception as e:
            record(label, False, f"Error: {str(e)[:80]}")
else:
    record("Memory", False, "No token — skipping all memory tests")

# ============================================================
# TEST 7: Knowledge Graph
# ============================================================
print_header("TEST 7: Knowledge Graph")
if TOKEN:
    try:
        r = requests.get(f"{API}/knowledge/graph", headers={"Authorization": f"Bearer {TOKEN}"}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            nodes = len(data.get("nodes", []))
            edges = len(data.get("edges", []))
            if nodes > 0:
                record("Knowledge Graph", True, f"{nodes} nodes, {edges} edges")
            else:
                record("Knowledge Graph", True, "Connected but empty (Neo4j may be paused)")
        else:
            record("Knowledge Graph", False, f"Status: {r.status_code}")
    except Exception as e:
        record("Knowledge Graph", False, f"Error: {str(e)[:80]}")
else:
    record("Knowledge Graph", False, "No token")

# ============================================================
# TEST 8: Semantic Search
# ============================================================
print_header("TEST 8: Semantic Search")
if TOKEN:
    try:
        r = requests.get(f"{API}/search?query=AI", headers={"Authorization": f"Bearer {TOKEN}"}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            total = data.get("total_results", 0)
            record("Semantic Search", True, f"{total} results found")
        else:
            record("Semantic Search", False, f"Status: {r.status_code}")
    except Exception as e:
        record("Semantic Search", False, f"Error: {str(e)[:80]}")
else:
    record("Semantic Search", False, "No token")

# ============================================================
# TEST 9: Settings / API Keys
# ============================================================
print_header("TEST 9: Settings & API Keys")
if TOKEN:
    try:
        r = requests.get(f"{API}/settings/api-keys", headers={"Authorization": f"Bearer {TOKEN}"}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            has_anthropic = data.get("anthropic", {}).get("has_key", False)
            has_openai = data.get("openai", {}).get("has_key", False)
            record("API Keys", True, f"Anthropic: {has_anthropic}, OpenAI: {has_openai}")
        else:
            record("API Keys", False, f"Status: {r.status_code}")
    except Exception as e:
        record("API Keys", False, f"Error: {str(e)[:80]}")
else:
    record("API Keys", False, "No token")

# ============================================================
# TEST 10: Streaming Endpoint
# ============================================================
print_header("TEST 10: Streaming Endpoint")
if TOKEN:
    try:
        r = requests.post(f"{API}/ask-stream", json={
            "query": "test",
            "debate_mode": False
        }, headers={"Authorization": f"Bearer {TOKEN}"}, timeout=15, stream=True)
        
        chunks = 0
        for line in r.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data:'):
                    chunks += 1
        
        if chunks > 0:
            record("Streaming", True, f"{chunks} SSE events received")
        else:
            record("Streaming", False, "No SSE events")
    except Exception as e:
        record("Streaming", False, f"Error: {str(e)[:80]}")
else:
    record("Streaming", False, "No token")

# ============================================================
# SUMMARY
# ============================================================
print(f"\n{'='*60}")
print(f"📊 FINAL SUMMARY")
print(f"{'='*60}")

passed = sum(1 for _, p, _ in results if p)
total = len(results)

for name, p, detail in results:
    icon = PASS if p else FAIL
    print(f"   {icon} {name}{' — ' + detail if detail else ''}")

print(f"\n   {passed}/{total} tests passed")

if passed == total:
    print(f"\n   🎉 POLYNOUS IS FULLY OPERATIONAL!")
elif passed >= total * 0.8:
    print(f"\n   ⚠️  Minor issues detected — system mostly working")
else:
    print(f"\n   🔴 Significant issues — needs attention")

print(f"\n{'='*60}")

sys.exit(0 if passed == total else 1)
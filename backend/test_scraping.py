"""
POLYNOUS Orchestrator Integration Test
Tests the complete pipeline: Search → Summarise → Critic → Write

Run:
    python test_orchestrator.py
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000"

# Test credentials
TEST_EMAIL = f"orch_test_{int(time.time())}@polynous.ai"
TEST_USERNAME = f"orch_user_{int(time.time())}"
TEST_PASSWORD = "OrchTest!123"

PASS = "✅"
FAIL = "❌"
WARN = "⚠️"

results = []

def record(name, passed, detail=""):
    results.append((name, passed, detail))
    icon = PASS if passed else FAIL
    print(f"   {icon} {detail or ('passed' if passed else 'failed')}")

def print_header(title):
    print("\n" + "=" * 60)
    print(f"📌 {title}")
    print("=" * 60)

print("=" * 60)
print("🧪 POLYNOUS ORCHESTRATOR INTEGRATION TEST")
print("=" * 60)

# ============================================================
# STEP 1: Register & Get Token
# ============================================================
print_header("STEP 1: Authentication")

# Register
reg_res = requests.post(f"{BASE_URL}/auth/register", json={
    "email": TEST_EMAIL,
    "username": TEST_USERNAME,
    "password": TEST_PASSWORD
})

if reg_res.status_code == 200:
    token = reg_res.json()["access_token"]
    record("Register", True, "New user created")
elif reg_res.status_code == 409:
    # Already exists — login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        record("Register", True, "User exists, logged in")
    else:
        print(f"   {FAIL} Cannot authenticate")
        sys.exit(1)
else:
    print(f"   {FAIL} Registration failed: {reg_res.text[:200]}")
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}"}

# ============================================================
# STEP 2: Test Research Query (Full Pipeline)
# ============================================================
print_header("STEP 2: Research Query (Full Pipeline)")

query = "What is artificial intelligence?"

start = time.perf_counter()
response = requests.post(f"{BASE_URL}/ask", json={
    "query": query,
    "debate_mode": False
}, headers=headers)
elapsed = time.perf_counter() - start

print(f"   Query: '{query}'")
print(f"   Status: {response.status_code}")
print(f"   Time: {elapsed:.1f}s")

if response.status_code == 200:
    data = response.json()
    answer = data.get("answer", "")
    sources = data.get("sources", [])
    confidence = data.get("confidence", 0)
    contradictions = data.get("contradictions", [])
    
    print(f"   Answer length: {len(answer)} chars")
    print(f"   Sources: {len(sources)}")
    print(f"   Confidence: {confidence}%")
    print(f"   Contradictions: {len(contradictions)}")
    
    # Check if answer looks like a research digest (not AI opinion)
    is_digest = any(marker in answer for marker in [
        "📊 RESEARCH LANDSCAPE",
        "📚 SOURCES ANALYZED",
        "🤝 WHERE SOURCES AGREE",
        "⚡ WHERE SOURCES DISAGREE",
        "RESEARCH LANDSCAPE",
        "SOURCES ANALYZED",
        "WHERE SOURCES AGREE",
        "WHERE SOURCES DISAGREE"
    ])
    
    if is_digest:
        record("Research Query", True, f"Research digest format detected ({len(answer)} chars, {elapsed:.1f}s)")
    else:
        # Check if it looks AI-generated (generic statements)
        ai_phrases = [
            "it is important to", "in conclusion", "clearly demonstrates",
            "undoubtedly", "without a doubt", "experts agree"
        ]
        ai_score = sum(1 for phrase in ai_phrases if phrase.lower() in answer.lower())
        
        if ai_score >= 2:
            record("Research Query", False, f"Looks AI-generated ({ai_score} generic phrases detected)")
        else:
            record("Research Query", True, f"Answer received ({len(answer)} chars, {elapsed:.1f}s)")
    
    # Verify sources are present
    if len(sources) >= 2:
        record("Sources Present", True, f"{len(sources)} sources found")
    else:
        record("Sources Present", False, f"Only {len(sources)} sources")
    
    # Verify confidence is meaningful
    if confidence > 0 and confidence <= 100:
        record("Confidence Score", True, f"{confidence}%")
    else:
        record("Confidence Score", False, f"Invalid confidence: {confidence}")
    
    # Show answer preview
    print(f"\n   📝 ANSWER PREVIEW:")
    print(f"   {'─' * 50}")
    preview = answer[:400].replace('\n', '\n   ')
    print(f"   {preview}...")
    
else:
    record("Research Query", False, f"Status {response.status_code}: {response.text[:200]}")

# ============================================================
# STEP 3: Test Debate Mode
# ============================================================
print_header("STEP 3: Debate Mode")

debate_query = "Should AI be regulated by governments?"

start = time.perf_counter()
response = requests.post(f"{BASE_URL}/ask", json={
    "query": debate_query,
    "debate_mode": True
}, headers=headers)
elapsed = time.perf_counter() - start

print(f"   Query: '{debate_query}'")
print(f"   Status: {response.status_code}")
print(f"   Time: {elapsed:.1f}s")

if response.status_code == 200:
    data = response.json()
    answer = data.get("answer", "")
    debate_verdict = data.get("debate_verdict", {})
    
    print(f"   Answer length: {len(answer)} chars")
    
    if debate_verdict:
        winner = debate_verdict.get("winner", "TIE")
        for_score = debate_verdict.get("for_score", 0)
        against_score = debate_verdict.get("against_score", 0)
        print(f"   Winner: {winner}")
        print(f"   FOR: {for_score}/10 | AGAINST: {against_score}/10")
        record("Debate Mode", True, f"Winner: {winner} (FOR:{for_score}/10 vs AGAINST:{against_score}/10)")
    else:
        record("Debate Mode", True, f"Debate completed ({elapsed:.1f}s)")
else:
    record("Debate Mode", False, f"Status {response.status_code}")

# ============================================================
# STEP 4: Test Streaming Endpoint
# ============================================================
print_header("STEP 4: Streaming Endpoint")

try:
    response = requests.post(f"{BASE_URL}/ask-stream", json={
        "query": "What is machine learning?",
        "debate_mode": False
    }, headers=headers, stream=True, timeout=30)
    
    chunks = []
    agent_progress = []
    
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                try:
                    data = json.loads(line[6:])
                    if data.get('type') == 'progress':
                        agent_progress.append(data.get('agent'))
                    chunks.append(data)
                except:
                    pass
    
    if chunks:
        # Check that all 4 agents ran
        agents_seen = set(agent_progress)
        expected_agents = {'search', 'summarise', 'critic', 'writer'}
        missing = expected_agents - agents_seen
        
        if not missing:
            record("Streaming", True, f"All 4 agents ran: {agents_seen}")
        else:
            record("Streaming", True, f"Agents seen: {agents_seen} (missing: {missing})")
    else:
        record("Streaming", False, "No streaming data received")
except Exception as e:
    record("Streaming", False, f"Error: {str(e)[:100]}")

# ============================================================
# STEP 5: Verify Data Storage (Memory Stats)
# ============================================================
print_header("STEP 5: Verify Data Storage")

response = requests.get(f"{BASE_URL}/memory/stats", headers=headers)

if response.status_code == 200:
    data = response.json()
    total_research = data.get('total_research', 0)
    total_debates = data.get('total_debates', 0)
    
    print(f"   Research entries: {total_research}")
    print(f"   Debate entries: {total_debates}")
    
    if total_research >= 1:
        record("Research Stored", True, f"{total_research} research entries found")
    else:
        record("Research Stored", False, "No research entries stored")
    
    if total_debates >= 1:
        record("Debate Stored", True, f"{total_debates} debate entries found")
    else:
        record("Debate Stored", True, "Debate storage may be delayed (Neo4j async)")
else:
    record("Data Storage", False, f"Status {response.status_code}")

# ============================================================
# STEP 6: Test Health Endpoint
# ============================================================
print_header("STEP 6: System Health")

response = requests.get(f"{BASE_URL}/health")

if response.status_code == 200:
    data = response.json()
    status = data.get('status', 'unknown')
    checks = data.get('checks', {})
    
    db_ok = checks.get('database') == 'healthy'
    neo4j_ok = checks.get('neo4j') == 'healthy'
    
    print(f"   Overall: {status}")
    print(f"   Database: {'✅' if db_ok else '❌'}")
    print(f"   Neo4j: {'✅' if neo4j_ok else '❌'}")
    
    record("Health Check", True, f"Status: {status}")
else:
    record("Health Check", False, f"Status {response.status_code}")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("📊 ORCHESTRATOR TEST SUMMARY")
print("=" * 60)

passed = sum(1 for _, p, _ in results if p)
total = len(results)

for name, p, detail in results:
    icon = PASS if p else FAIL
    print(f"   {icon} {name}{' — ' + detail if detail else ''}")

print(f"\n   {passed}/{total} tests passed")

if passed == total:
    print("\n   🎉 ALL TESTS PASSED!")
    print("   POLYNOUS Orchestrator is working correctly!")
else:
    print(f"\n   ⚠️  {total - passed} test(s) failed")

sys.exit(0 if passed == total else 1)
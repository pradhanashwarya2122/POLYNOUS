"""
Full Neo4j Aura Connection Diagnostic
======================================
Run with:  railway run python test_neo4j_full.py

Checks, in order:
  1. Which env vars actually exist (all naming variants)
  2. Raw repr() of URI / username / password (catches whitespace, quotes, wrong scheme)
  3. DNS resolution of the Aura hostname
  4. Raw TCP connectivity to port 7687 (catches firewall/egress issues, separate from DNS)
  5. Neo4j driver connection + auth
  6. A real query, to confirm read/write access works end-to-end
"""

import os
import socket
import sys

print("=" * 60)
print("STEP 1: ENVIRONMENT VARIABLE INVENTORY")
print("=" * 60)

# Check every plausible variant of each var name, since naming
# mismatches (NEO4J_USER vs NEO4J_USERNAME) are a common cause of failure
candidates = {
    "URI":      ["NEO4J_URI", "NEO4J_URL", "NEO4J_CONNECTION_URI"],
    "USERNAME": ["NEO4J_USERNAME", "NEO4J_USER"],
    "PASSWORD": ["NEO4J_PASSWORD", "NEO4J_PASS"],
    "DATABASE": ["NEO4J_DATABASE", "NEO4J_DB"],
}

found = {}
for label, names in candidates.items():
    label_found = []
    for name in names:
        val = os.environ.get(name)
        if val is not None:
            label_found.append((name, val))
    found[label] = label_found
    if not label_found:
        print(f"❌ {label}: no matching env var found (checked {names})")
    else:
        for name, val in label_found:
            if label == "PASSWORD":
                display = repr(val[:4] + "..." + val[-2:]) if len(val) > 6 else "***"
            else:
                display = repr(val)
            print(f"✅ {label}: found under '{name}' -> {display}")
        if len(label_found) > 1:
            print(f"⚠️  WARNING: multiple env vars set for {label}: {[n for n, _ in label_found]}")
            print(f"   Your code must be reading the exact right one — check for stale duplicates.")

uri = next((v for _, v in found["URI"]), None)
user = next((v for _, v in found["USERNAME"]), None)
password = next((v for _, v in found["PASSWORD"]), None)
database = next((v for _, v in found["DATABASE"]), "neo4j")

print()
print("=" * 60)
print("STEP 2: RAW VALUE INSPECTION (whitespace / quote check)")
print("=" * 60)

for label, val in [("URI", uri), ("USERNAME", user)]:
    if val is None:
        continue
    issues = []
    if val != val.strip():
        issues.append("has leading/trailing whitespace")
    if val.startswith('"') or val.startswith("'"):
        issues.append("starts with a quote character (shouldn't be in the value)")
    if "\n" in val or "\r" in val:
        issues.append("contains a newline/carriage return")
    if label == "URI" and not val.startswith(("neo4j+s://", "neo4j://", "bolt://", "bolt+s://")):
        issues.append(f"doesn't start with a recognized scheme (got: {val[:15]}...)")
    if issues:
        print(f"❌ {label} value has problems: {', '.join(issues)}")
    else:
        print(f"✅ {label} value looks clean")

if password is not None:
    pw_issues = []
    if password != password.strip():
        pw_issues.append("has leading/trailing whitespace")
    if "\n" in password or "\r" in password:
        pw_issues.append("contains a newline/carriage return")
    if pw_issues:
        print(f"❌ PASSWORD value has problems: {', '.join(pw_issues)}")
    else:
        print(f"✅ PASSWORD value looks clean (length: {len(password)} chars)")

if uri is None or user is None or password is None:
    print()
    print("🛑 STOPPING: cannot proceed without URI, USERNAME, and PASSWORD all set.")
    sys.exit(1)

print()
print("=" * 60)
print("STEP 3: DNS RESOLUTION")
print("=" * 60)

hostname = uri.split("://")[-1].split("/")[0].split(":")[0]
print(f"Extracted hostname: {hostname}")
try:
    ip = socket.gethostbyname(hostname)
    print(f"✅ Resolved to: {ip}")
except Exception as e:
    print(f"❌ DNS resolution FAILED: {type(e).__name__}: {e}")
    print("   -> This means the container's network/DNS can't reach the internet at all.")
    print("   -> Check Railway service networking settings for public egress.")
    sys.exit(1)

print()
print("=" * 60)
print("STEP 4: RAW TCP CONNECTIVITY (port 7687)")
print("=" * 60)

try:
    sock = socket.create_connection((hostname, 7687), timeout=10)
    print(f"✅ TCP connection to {hostname}:7687 succeeded")
    sock.close()
except Exception as e:
    print(f"❌ TCP connection FAILED: {type(e).__name__}: {e}")
    print("   -> DNS works but the port is blocked — likely an egress/firewall rule")
    print("      blocking outbound traffic on 7687 from this Railway service.")
    sys.exit(1)

print()
print("=" * 60)
print("STEP 5: NEO4J DRIVER CONNECTION + AUTH")
print("=" * 60)

try:
    from neo4j import GraphDatabase
except ImportError:
    print("❌ 'neo4j' package not installed in this Python environment.")
    print("   -> Run: pip install neo4j")
    sys.exit(1)

driver = None
try:
    driver = GraphDatabase.driver(uri, auth=(user, password))
    driver.verify_connectivity()
    print("✅ Connected and authenticated successfully!")
except Exception as e:
    print(f"❌ Connection/auth FAILED: {type(e).__name__}: {e}")
    print()
    print("   Common causes for this specific error:")
    print("   - Wrong username (should almost always be 'neo4j', not the instance ID)")
    print("   - Wrong/stale password (was it reset in the Aura console after this was saved?)")
    print("   - Right credentials but pointed at the wrong Aura instance URI")
    if driver:
        driver.close()
    sys.exit(1)

print()
print("=" * 60)
print("STEP 6: REAL QUERY TEST (read + write)")
print("=" * 60)

try:
    with driver.session(database=database) as session:
        # Simple read
        result = session.run("RETURN 1 AS test_value")
        record = result.single()
        print(f"✅ Read query succeeded: test_value = {record['test_value']}")

        # Simple write + cleanup, to confirm write permissions too
        session.run(
            "MERGE (n:DiagnosticCheck {id: 'diagnostic_test'}) "
            "SET n.last_checked = timestamp() "
            "RETURN n"
        )
        print("✅ Write query succeeded (created/updated a test node)")

        session.run("MATCH (n:DiagnosticCheck {id: 'diagnostic_test'}) DELETE n")
        print("✅ Cleanup query succeeded (deleted the test node)")

except Exception as e:
    print(f"❌ Query FAILED: {type(e).__name__}: {e}")
    print("   -> Connection/auth worked, but this user may lack read/write")
    print("      permissions on the target database, or the database name is wrong.")
    print(f"   -> Database used: {repr(database)} (check this matches your Aura instance's DB name)")
finally:
    if driver:
        driver.close()

print()
print("=" * 60)
print("✅ ALL CHECKS PASSED — Neo4j connection is fully working.")
print("=" * 60)
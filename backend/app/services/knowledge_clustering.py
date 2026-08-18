"""
Phase E — knowledge clustering & the semantic map.

Fetches the user's research embeddings from the semantic-memory Pinecone index,
projects them to 2D (PCA) and clusters them (KMeans), then labels each cluster
by its most distinctive terms. Powers the "semantic constellation" map.

Uses numpy + scikit-learn (both already installed). UMAP/HDBSCAN would be a drop-in
upgrade if those wheels are ever added; PCA+KMeans needs no extra deps and runs
fine on CPU.
"""
import re
from typing import Dict, List

_STOP = set(
    "the a an and or of to in is are was were be for with on at by from that this these those it "
    "its as not but if then than so what which who how does do did have has had will can could would "
    "should about into over under between after before during each all any some more most other your "
    "you i we they he she their our my his her".split()
)


def _terms(text: str) -> List[str]:
    return [w for w in re.findall(r"[a-z][a-z\-]{2,}", (text or "").lower()) if w not in _STOP]


def cluster_research(user, user_id: str = "guest", max_points: int = 400) -> Dict:
    """Return {points:[{x,y,cluster,query,id}], clusters:[{id,label,size}]}."""
    empty = {"points": [], "clusters": [], "count": 0}
    try:
        import numpy as np
        from sklearn.decomposition import PCA
        from sklearn.cluster import KMeans
        from app.semantic_search import semantic_search, EMBEDDING_DIM
    except Exception as e:
        print(f"⚠️ clustering deps unavailable: {e}")
        return empty

    if not getattr(semantic_search, "use_pinecone", False) or not semantic_search.index:
        return empty

    try:
        namespace = f"user_{user_id}"
        res = semantic_search.index.query(
            vector=[0.0] * EMBEDDING_DIM, top_k=max_points,
            include_metadata=True, include_values=True, namespace=namespace,
        )
        matches = res.get("matches", []) or []
    except Exception as e:
        print(f"⚠️ cluster fetch failed: {e}")
        return empty

    pts = [(m.id, (m.values or []), (m.metadata or {})) for m in matches if m.values]
    n = len(pts)
    if n < 3:
        # Not enough to cluster meaningfully.
        return {"points": [{"id": i, "x": 0.0, "y": 0.0, "cluster": 0,
                            "query": (md.get("query") or "")[:80]} for i, (_id, _v, md) in enumerate(pts)],
                "clusters": [{"id": 0, "label": "Your research", "size": n}], "count": n}

    X = np.array([v for _, v, _ in pts], dtype=float)
    coords = PCA(n_components=2, random_state=42).fit_transform(X)
    # normalize coords to a friendly -1..1 range for the client
    span = np.max(np.abs(coords)) or 1.0
    coords = coords / span

    k = max(2, min(8, n // 5))
    labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X)

    # Label each cluster by its most distinctive query terms (TF within cluster
    # vs global), a lightweight, dependency-free cluster labeller.
    global_df: Dict[str, int] = {}
    per_cluster_terms: Dict[int, Dict[str, int]] = {}
    for (_, _, md), c in zip(pts, labels):
        seen = set()
        for t in _terms(md.get("query", "") + " " + md.get("answer", "")[:200]):
            per_cluster_terms.setdefault(int(c), {})
            per_cluster_terms[int(c)][t] = per_cluster_terms[int(c)].get(t, 0) + 1
            if t not in seen:
                global_df[t] = global_df.get(t, 0) + 1
                seen.add(t)

    cluster_meta = []
    for c in sorted(per_cluster_terms.keys()):
        tf = per_cluster_terms[c]
        # distinctiveness = local frequency / (1 + global document frequency)
        ranked = sorted(tf.items(), key=lambda kv: kv[1] / (1 + global_df.get(kv[0], 0)), reverse=True)
        label = ", ".join(w for w, _ in ranked[:3]) or f"Cluster {c + 1}"
        cluster_meta.append({"id": c, "label": label, "size": int((labels == c).sum())})

    points = []
    for i, ((_id, _v, md), (x, y), c) in enumerate(zip(pts, coords, labels)):
        points.append({"id": _id, "x": round(float(x), 4), "y": round(float(y), 4),
                       "cluster": int(c), "query": (md.get("query") or "")[:80],
                       "mode": md.get("mode", "research")})
    return {"points": points, "clusters": cluster_meta, "count": n}


def find_duplicates(user, user_id: str = "guest", threshold: float = 0.92, max_points: int = 400) -> Dict:
    """Phase F (Memory Bank): group near-duplicate research entries by cosine
    similarity of their embeddings, so the user can merge/prune redundancy."""
    empty = {"groups": [], "count": 0}
    try:
        import numpy as np
        from app.semantic_search import semantic_search, EMBEDDING_DIM
    except Exception:
        return empty
    pts = []
    if getattr(semantic_search, "use_pinecone", False) and getattr(semantic_search, "index", None):
        # Legacy Pinecone path
        try:
            res = semantic_search.index.query(
                vector=[0.0] * EMBEDDING_DIM, top_k=max_points,
                include_metadata=True, include_values=True, namespace=f"user_{user_id}")
            pts = [(m.id, m.values, (m.metadata or {})) for m in res.get("matches", []) if m.values]
        except Exception as e:
            print(f"⚠️ dedup fetch failed: {e}")
            return empty
    else:
        # Postgres/pgvector path — fetch the user's semantic entries + vectors.
        try:
            import json as _json
            from sqlalchemy import text as _sql
            from app.database import engine as _engine
            with _engine.connect() as conn:
                rows = conn.execute(_sql("""
                    SELECT entry_id, query, mode, embedding::text
                    FROM semantic_entries
                    WHERE user_id = :u AND embedding IS NOT NULL
                    ORDER BY created_at DESC LIMIT :n
                """), {"u": user_id, "n": max_points}).fetchall()
            for (eid, q, mode, emb_txt) in rows:
                try:
                    vals = _json.loads(emb_txt) if emb_txt else None
                except Exception:
                    vals = None
                if vals:
                    pts.append((eid or q, vals, {"query": q or "", "mode": mode or "research"}))
        except Exception as e:
            print(f"⚠️ pg dedup fetch failed: {e}")
            return empty
    n = len(pts)
    if n < 2:
        return empty

    import numpy as np
    X = np.array([v for _, v, _ in pts], dtype=float)
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    Xn = X / norms
    sim = Xn @ Xn.T

    # union-find over pairs above threshold
    parent = list(range(n))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb: parent[ra] = rb
    for i in range(n):
        for j in range(i + 1, n):
            if sim[i, j] >= threshold:
                union(i, j)

    groups: Dict[int, list] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    out = []
    for members in groups.values():
        if len(members) < 2:
            continue
        out.append([{"id": pts[i][0], "query": (pts[i][2].get("query") or "")[:100],
                     "mode": pts[i][2].get("mode", "research")} for i in members])
    out.sort(key=len, reverse=True)
    return {"groups": out, "count": sum(len(g) for g in out)}

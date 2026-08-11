"""
Pure-Python graph algorithms (no Neo4j GDS, no external services).

These run on the small personal knowledge graphs here (hundreds of nodes) in
milliseconds, so they replace Neo4j's Graph Data Science library entirely for
free. Every function takes a node list + an edge list of (source, target) name
tuples and returns plain dicts/lists.
"""
from collections import deque
import math


def pagerank(node_ids, edges, damping: float = 0.85, iters: int = 50):
    """Undirected PageRank via power iteration (edges counted both ways)."""
    n = len(node_ids)
    if n == 0:
        return {}
    out = {x: [] for x in node_ids}
    for s, t in edges:
        out[s].append(t); out[t].append(s)
    outdeg = {x: len(out[x]) for x in node_ids}
    pr = {x: 1.0 / n for x in node_ids}
    for _ in range(iters):
        new = {x: (1 - damping) / n for x in node_ids}
        dangling = damping * sum(pr[x] for x in node_ids if outdeg[x] == 0) / n
        for x in node_ids:
            new[x] += dangling
        for s in node_ids:
            if outdeg[s]:
                share = damping * pr[s] / outdeg[s]
                for d in out[s]:
                    new[d] += share
        pr = new
    return pr


def louvain(node_ids, edges):
    """Communities via one level of Louvain modularity optimization."""
    m = len(edges)
    if m == 0:
        return {x: i for i, x in enumerate(node_ids)}
    adj = {x: {} for x in node_ids}
    for s, t in edges:
        adj[s][t] = adj[s].get(t, 0) + 1
        adj[t][s] = adj[t].get(s, 0) + 1
    k = {x: sum(adj[x].values()) for x in node_ids}
    two_m = 2.0 * m
    comm = {x: x for x in node_ids}
    sigma_tot = {x: k[x] for x in node_ids}
    improved, passes = True, 0
    while improved and passes < 30:
        improved, passes = False, passes + 1
        for node in node_ids:
            c_old = comm[node]
            sigma_tot[c_old] -= k[node]
            neigh_w = {}
            for nb, w in adj[node].items():
                neigh_w[comm[nb]] = neigh_w.get(comm[nb], 0) + w
            best_c = c_old
            best_gain = neigh_w.get(c_old, 0) - sigma_tot.get(c_old, 0) * k[node] / two_m
            for c, w_in in neigh_w.items():
                gain = w_in - sigma_tot.get(c, 0) * k[node] / two_m
                if gain > best_gain:
                    best_gain, best_c = gain, c
            comm[node] = best_c
            sigma_tot[best_c] = sigma_tot.get(best_c, 0) + k[node]
            if best_c != c_old:
                improved = True
    remap, nxt = {}, 0
    for x in node_ids:
        if comm[x] not in remap:
            remap[comm[x]] = nxt; nxt += 1
        comm[x] = remap[comm[x]]
    return comm


def betweenness(node_ids, edges):
    """Brandes' betweenness centrality (undirected, unweighted)."""
    adj = {x: set() for x in node_ids}
    for s, t in edges:
        if s != t:
            adj[s].add(t); adj[t].add(s)
    cb = {x: 0.0 for x in node_ids}
    for s in node_ids:
        stack, pred = [], {w: [] for w in node_ids}
        sigma = {w: 0.0 for w in node_ids}; sigma[s] = 1.0
        dist = {w: -1 for w in node_ids}; dist[s] = 0
        q = deque([s])
        while q:
            v = q.popleft(); stack.append(v)
            for w in adj[v]:
                if dist[w] < 0:
                    dist[w] = dist[v] + 1; q.append(w)
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]; pred[w].append(v)
        delta = {w: 0.0 for w in node_ids}
        while stack:
            w = stack.pop()
            for v in pred[w]:
                if sigma[w] > 0:
                    delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
            if w != s:
                cb[w] += delta[w]
    for w in node_ids:
        cb[w] /= 2.0
    return cb


def link_predict(node_ids, edges, top_n: int = 8):
    """Adamic-Adar + common-neighbour link prediction over non-adjacent pairs."""
    adj = {x: set() for x in node_ids}
    for s, t in edges:
        adj[s].add(t); adj[t].add(s)
    existing = {frozenset((s, t)) for s, t in edges}
    deg = {x: len(adj[x]) for x in node_ids}
    cand = {}
    for w in node_ids:
        nbrs = list(adj[w])
        for i in range(len(nbrs)):
            for j in range(i + 1, len(nbrs)):
                u, v = nbrs[i], nbrs[j]
                if u == v or frozenset((u, v)) in existing:
                    continue
                key = frozenset((u, v))
                aa = 1.0 / math.log(deg[w]) if deg[w] > 1 else 0.0
                slot = cand.setdefault(key, {"aa": 0.0, "cn": 0})
                slot["aa"] += aa; slot["cn"] += 1
    ranked = sorted(cand.items(), key=lambda kv: (kv[1]["aa"], kv[1]["cn"]), reverse=True)[:top_n]
    out = []
    for key, sc in ranked:
        a, b = tuple(key)
        out.append({"source": a, "target": b, "score": round(sc["aa"], 3),
                    "common_neighbors": sc["cn"]})
    return out


def jaccard_similar(node_ids, edges, node, top_n: int = 8):
    """Topological node similarity: Jaccard over neighbourhoods."""
    if node not in node_ids:
        return []
    adj = {x: set() for x in node_ids}
    for s, t in edges:
        adj[s].add(t); adj[t].add(s)
    base = adj[node] | {node}
    sims = []
    for other in node_ids:
        if other == node:
            continue
        ns = adj[other] | {other}
        inter = len(base & ns); union = len(base | ns)
        if inter and union:
            sims.append({"name": other, "score": round(inter / union, 3), "shared": inter})
    sims.sort(key=lambda x: x["score"], reverse=True)
    return sims[:top_n]


def shortest_path(node_ids, edges, a, b):
    """Unweighted shortest path (BFS) between two nodes; [] if unreachable."""
    if a not in node_ids or b not in node_ids:
        return []
    adj = {x: set() for x in node_ids}
    for s, t in edges:
        adj[s].add(t); adj[t].add(s)
    prev = {a: None}
    q = deque([a])
    while q:
        cur = q.popleft()
        if cur == b:
            path = []
            while cur is not None:
                path.append(cur); cur = prev[cur]
            return path[::-1]
        for nb in adj[cur]:
            if nb not in prev:
                prev[nb] = cur; q.append(nb)
    return []


# ═══════════════════════════════════════════════════════════════════════
# PHASE 3 — advanced (Leiden, structural embeddings, ML link prediction)
# Uses python-igraph if available (Leiden) and scikit-learn/numpy otherwise.
# ═══════════════════════════════════════════════════════════════════════

def leiden(node_ids, edges):
    """Leiden community detection (better-behaved than Louvain). Falls back to
    the pure-Python Louvain if python-igraph isn't installed."""
    if len(edges) == 0:
        return {x: i for i, x in enumerate(node_ids)}
    try:
        import igraph as ig
        idx = {n: i for i, n in enumerate(node_ids)}
        g = ig.Graph(n=len(node_ids), edges=[(idx[s], idx[t]) for s, t in edges if s in idx and t in idx])
        part = g.community_leiden(objective_function="modularity")
        return {node_ids[i]: part.membership[i] for i in range(len(node_ids))}
    except Exception:
        return louvain(node_ids, edges)


def _adjacency(node_ids, edges):
    import numpy as np
    idx = {n: i for i, n in enumerate(node_ids)}
    n = len(node_ids)
    A = np.zeros((n, n), dtype="float32")
    for s, t in edges:
        if s in idx and t in idx:
            i, j = idx[s], idx[t]
            A[i, j] = 1.0; A[j, i] = 1.0
    return A, idx


def structural_embeddings(node_ids, edges, dim: int = 16):
    """Structural node embeddings via truncated SVD of the adjacency matrix
    (a fast, dependency-light stand-in for node2vec that captures a node's
    position/role in the graph). Returns {node_name: vector}."""
    import numpy as np
    if len(node_ids) < 3 or len(edges) == 0:
        return {}
    try:
        from sklearn.decomposition import TruncatedSVD
        from sklearn.preprocessing import normalize
        A, idx = _adjacency(node_ids, edges)
        # Add self-loops + row-normalize so the embedding reflects neighbourhoods.
        A = A + np.eye(A.shape[0], dtype="float32")
        A = normalize(A, norm="l1", axis=1)
        k = min(dim, A.shape[0] - 1)
        svd = TruncatedSVD(n_components=max(2, k), random_state=42)
        emb = svd.fit_transform(A)
        emb = normalize(emb, norm="l2", axis=1)
        return {node_ids[i]: emb[i] for i in range(len(node_ids))}
    except Exception:
        return {}


def embedding_similar(node_ids, edges, node, top_n: int = 8):
    """Concepts structurally similar to `node` by embedding cosine (role-based,
    complements the neighbourhood Jaccard measure)."""
    import numpy as np
    emb = structural_embeddings(node_ids, edges)
    if node not in emb:
        return []
    base = emb[node]
    sims = []
    for other, v in emb.items():
        if other == node:
            continue
        sims.append({"name": other, "score": round(float(np.dot(base, v)), 3)})
    sims.sort(key=lambda x: x["score"], reverse=True)
    return sims[:top_n]


def _pair_features(adj, deg, u, v):
    import math as _m
    cn = adj[u] & adj[v]
    ncn = len(cn)
    aa = sum(1.0 / _m.log(deg[w]) for w in cn if deg[w] > 1)
    ra = sum(1.0 / deg[w] for w in cn if deg[w] > 0)
    union = len(adj[u] | adj[v])
    jac = ncn / union if union else 0.0
    pa = deg[u] * deg[v]
    return [ncn, aa, ra, jac, pa]


def ml_link_predict(node_ids, edges, top_n: int = 8):
    """Machine-learned link prediction: train logistic regression on graph
    features (common neighbours, Adamic-Adar, resource allocation, Jaccard,
    preferential attachment) using existing edges as positives and sampled
    non-edges as negatives, then score candidate pairs. Falls back to
    Adamic-Adar heuristic if scikit-learn/training isn't viable."""
    import random
    adj = {x: set() for x in node_ids}
    for s, t in edges:
        if s != t:
            adj[s].add(t); adj[t].add(s)
    deg = {x: len(adj[x]) for x in node_ids}
    existing = {frozenset((s, t)) for s, t in edges if s != t}
    if len(existing) < 6 or len(node_ids) < 6:
        return link_predict(node_ids, edges, top_n)
    try:
        from sklearn.linear_model import LogisticRegression
        pos = [tuple(p) for p in existing]
        # sample negatives (non-adjacent pairs sharing at least one neighbour)
        cand = set()
        for w in node_ids:
            nb = list(adj[w])
            for i in range(len(nb)):
                for j in range(i + 1, len(nb)):
                    key = frozenset((nb[i], nb[j]))
                    if nb[i] != nb[j] and key not in existing:
                        cand.add(tuple(key))
        cand = list(cand)
        random.seed(42); random.shuffle(cand)
        neg = cand[:max(len(pos), 10)]
        if not neg:
            return link_predict(node_ids, edges, top_n)
        X = [_pair_features(adj, deg, u, v) for (u, v) in pos + neg]
        y = [1] * len(pos) + [0] * len(neg)
        clf = LogisticRegression(max_iter=500).fit(X, y)
        scored = []
        for (u, v) in cand:
            p = clf.predict_proba([_pair_features(adj, deg, u, v)])[0][1]
            scored.append({"source": u, "target": v, "score": round(float(p), 3),
                           "common_neighbors": len(adj[u] & adj[v])})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_n]
    except Exception:
        return link_predict(node_ids, edges, top_n)

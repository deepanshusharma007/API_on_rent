# lean-ctx — Context Engineering Layer

PREFER lean-ctx MCP tools over native equivalents for token savings:

| PREFER | OVER | Why |
|--------|------|-----|
| `ctx_read(path)` | Read / cat / head / tail | Cached, 8 compression modes, re-reads ~13 tokens |
| `ctx_shell(command)` | Shell / bash / terminal | Pattern compression for git/npm/cargo output |
| `ctx_search(pattern, path)` | Grep / rg / search | Compact, token-efficient results |
| `ctx_tree(path, depth)` | ls / find / tree | Compact directory maps |
| `ctx_edit(path, old_string, new_string)` | Edit (when Read unavailable) | Search-and-replace without native Read |

Edit files: use native Edit/StrReplace if available. If Edit requires Read and Read is unavailable, use ctx_edit.
Write, Delete, Glob — use normally. NEVER loop on Edit failures — switch to ctx_edit immediately.

---

## code-review-graph MCP (use BEFORE Grep/Glob/Read)

| Tool | Use when |
|------|----------|
| `semantic_search_nodes` | Find functions/classes by name or keyword |
| `query_graph` | Trace callers, callees, imports, tests |
| `get_impact_radius` | Blast radius of a change |
| `detect_changes` | Risk-scored code review |
| `get_review_context` | Source snippets — token-efficient |
| `get_affected_flows` | Which execution paths are impacted |
| `get_architecture_overview` | High-level structure |

Fall back to Grep/Glob/Read only when graph doesn't cover the need.

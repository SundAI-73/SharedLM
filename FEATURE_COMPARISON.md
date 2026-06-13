# SharedLM vs ChatGPT vs Claude — Exhaustive Feature Audit

> June 2026. Legend: ✅ have · 🟡 partial/stub · ❌ missing · ⭐ SharedLM-only edge.
> Reflects current (2026) ChatGPT/Claude feature sets, not historical.

## A. Core chat
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| Streaming responses | ✅ | ✅ |
| Stop generation | ✅ | ✅ |
| Regenerate | ✅ | ✅ |
| Copy message / code | ✅ | ✅ |
| Multi-line composer | ✅ | ✅ |
| Conversation history passed to model | ✅ | ✅ |
| Edit a previous message | ❌ | ✅ both |
| Branch / fork conversation | ❌ | ✅ both |
| Prompt starters on empty state | ✅ (added) | ✅ both |
| Scroll-to-bottom button | ❌ | ✅ both |
| Per-message token/cost display | 🟡 tracked in DB, not shown | ✅ |

## B. Content rendering & artifacts
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| Markdown (lists/tables/headings) | ✅ | ✅ |
| Code syntax highlighting + copy | ✅ | ✅ |
| Artifacts / Canvas (live runnable code/docs/UI) | ❌ | ✅ — major differentiator |
| Code execution / data analysis | ❌ | ✅ both |
| Math / LaTeX rendering | ❌ | ✅ both |

## C. Multimodal
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| File upload | ✅ text-extraction only | ✅ |
| Vision / image understanding | ❌ (images uploaded but not sent as images) | ✅ both |
| Image / video generation | ❌ | ✅ ChatGPT |
| Voice input (dictation) | ✅ | ✅ both |
| Read-aloud output | ✅ | ✅ both |
| Real-time voice conversation mode | ❌ | ✅ ChatGPT Advanced Voice / Record Mode |

## D. Knowledge & memory
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| Cross-conversation memory | ✅ (Mem0) | ✅ both |
| Memory ACROSS different model vendors | ⭐ unique | ❌ |
| Memory management UI (view/edit/delete) | ❌ (debug endpoint only) | ✅ both |
| Custom instructions / system persona | ❌ | ✅ both |
| Projects with files + knowledge | ✅ | ✅ both |
| Sovereign / local-first memory | ⭐ planned | ❌ impossible for them |

## E. Web & tools
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| Real web search with citations | 🟡 toggle exists, does nothing | ✅ both |
| Research / Extended-thinking toggles | 🟡 decorative (localStorage only) | ✅ real |
| Reasoning-effort control | ❌ (OpenRouter supports it; not wired) | ✅ both |
| Connectors (Drive, GitHub, MCP) | 🟡 placeholder modal | ✅ both |
| Agentic / computer use / skills | ❌ | ✅ Claude |

## F. Organization & history
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| Conversation list | 🟡 separate /history page → now also inline in sidebar | ✅ inline in sidebar |
| Content search across chats | ✅ | ✅ both |
| Star / rename / delete | ✅ | ✅ both |
| Folders for chats | ❌ (Projects only) | ✅ both |
| Export conversation | ✅ (Markdown) | 🟡 varies |

## G. Collaboration & sharing
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| Share link / public conversation | ❌ | ✅ both |
| Team / workspace | ❌ | ✅ both |

## H. Models & flexibility — SharedLM's edge ⭐
| Capability | SharedLM | ChatGPT / Claude |
|---|---|---|
| Switch model mid-conversation | ⭐ ✅ | ❌ single vendor |
| 400+ models (OpenRouter) | ⭐ ✅ | ❌ |
| Bring-your-own API key | ⭐ ✅ | ❌ |
| Run fully local (Ollama) | ⭐ ✅ | ❌ |
| Provider-neutral | ⭐ ✅ | ❌ |

## I. Platform
| | SharedLM | ChatGPT / Claude |
|---|---|---|
| Web | ✅ | ✅ |
| Desktop | ✅ Electron | ✅ |
| Native mobile apps | ❌ responsive web only | ✅ both |

## J. UX / UI gaps still open vs ChatGPT/Claude
1. Sidebar recent-chats list — addressed (inline recents added).
2. Dead toggles (Extended thinking / Research / Web search) — still decorative; wire or hide.
3. Prompt starters on empty state — addressed.
4. No image input despite image attachments being accepted (silently text-extracted).
5. No message editing, no branching, no scroll-to-bottom affordance.
6. No drag-and-drop upload; attachments show a filename chip, no thumbnail.
7. No reasoning/"thinking" indicator for reasoning models.
8. Settings → Usage tab still hardcoded; per-message token counts exist server-side but unshown.
9. No keyboard shortcuts.

## Where SharedLM genuinely wins
One app, 400+ models, switchable mid-thread, with shared memory that follows the user across vendors, their own API keys, and a fully-local option — none of which ChatGPT or Claude can offer because their model is single-vendor lock-in. The planned sovereign local-first memory doubles down on this moat.

## Recommended priority to close gaps
1. Sidebar recent-chats list ✅ (done)
2. Wire or remove dead toggles; wire real web search + reasoning-effort (OpenRouter supports both)
3. Vision / image input (multimodal models already support it via OpenRouter)
4. Custom instructions + memory management UI
5. Artifacts-style live preview, message editing, share links (bigger lifts)

## Sources
- ChatGPT 2026 features: https://www.gend.co/blog/chatgpt-2026-latest-features
- Claude 2026 features: https://suprmind.ai/hub/claude/features/
- Claude shipped-in-2026 reference: https://www.the-ai-corner.com/p/everything-claude-shipped-2026-complete-guide

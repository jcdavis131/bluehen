# ArXivIQ — retrieval that beats the big-name embeddings, live

**A research-literature assistant that is also our standing proof: the
deployed model outperforms the commercial zero-shot panel on its own
corpus.**

Search ML literature at arxiviq.com and you're using a Blue Hen
domain-tuned model in production. On the hard evaluation slice, it
scores nDCG@10 **0.8847** vs bge-small 0.827, e5-small 0.8385, gte
0.827 (same slice, same metric code — EVIDENCE §3.12). Under the harder
pool-of-16 protocol, trained heads hold the lead over all commercial
zero-shots (§3.15).

**What that means for your corpus:** the same pipeline that tuned this
model on research abstracts tunes one on your documents — listings,
catalogs, docs, tickets — with the same gates deciding whether the
result is good enough to ship.

**For researchers:** the methods registry publishes what we tested and
what we rejected, including the honest nulls. Evidence over hype.

**Try the live search:** arxiviq.com · Method registry: arxiviq.com/methods

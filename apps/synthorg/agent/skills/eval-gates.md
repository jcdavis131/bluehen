# Skill: Evaluation Gates

Load this when deciding whether a model may advance. A candidate passes only if ALL hold
(see `/WHITEPAPER.md` §8):

1. **Effective rank** of held-out encoder embeddings stays **above** the plain-InfoNCE
   baseline.
2. **nDCG@10** is equal-or-better than baseline on the rotating eval slice.
3. **Matryoshka truncation** to 256/128/64 dims degrades nDCG@10 by less than the stated
   tolerance.
4. Training and evaluation slices are **disjoint** (no leakage).

If any gate fails or cannot be verified, reject and return the failing numbers. Gates are
also enforced in CI; an agent's promote decision must agree with the CI gate result.

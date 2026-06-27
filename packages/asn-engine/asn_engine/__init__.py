"""AwakenedSleepNet (ASN) engine.

Collapse-resistant contrastive embedding training. Inspired by — not equivalent to —
sleep-driven synaptic homeostasis. See ../../SCIENCE_REVIEW.md for the integrity audit.
"""

from asn_engine.spectral import effective_rank, newton_schulz, three_tier_surgery
from asn_engine.losses import info_nce, cosine_contrastive
from asn_engine.align import procrustes

__all__ = [
    "effective_rank",
    "newton_schulz",
    "three_tier_surgery",
    "info_nce",
    "cosine_contrastive",
    "procrustes",
]
__version__ = "0.1.0"

export type PriorPick = { round: number; id: string; text: string };

export type LayerStack = {
  personal: number;
  query: number;
  boosts: number;
  lit: string[];
};

export type RoundResponse = {
  predictedId: string;
  confidence: number;
  scores: Record<string, number>;
  personalized: boolean;
  layerStack: LayerStack;
  shapley: {
    factors: Record<string, number>;
    picks: { round: number | null; id: string; phi: number }[];
  };
  note: string | null;
  correct?: boolean;
  layerStackBefore?: LayerStack;
  layerStackAfter?: LayerStack;
};

export type SessionStats = {
  matches: number;
  total: number;
  picks: PriorPick[];
};

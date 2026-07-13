import { useMemo } from "react";
import { useDebtSummaries, type DebtItem } from "./use-debt-summaries";

export type FriendBalance = {
  userId: string;
  /** Total I owe this person (outstanding). */
  totalIOwe: number;
  /** Total this person owes me (outstanding). */
  totalOwedToMe: number;
  /** Positive when they owe me, negative when I owe them. */
  net: number;
  /** Expenses I owe this person. */
  iOweItems: DebtItem[];
  /** Expenses this person owes me. */
  owedToMeItems: DebtItem[];
};

const EPS = 0.005;

function aggregate(iOwe: DebtItem[], owedToMe: DebtItem[]): FriendBalance[] {
  const byUser = new Map<string, FriendBalance>();

  const get = (userId: string): FriendBalance => {
    let f = byUser.get(userId);
    if (!f) {
      f = {
        userId,
        totalIOwe: 0,
        totalOwedToMe: 0,
        net: 0,
        iOweItems: [],
        owedToMeItems: [],
      };
      byUser.set(userId, f);
    }
    return f;
  };

  for (const d of iOwe) {
    const f = get(d.otherUserId);
    f.iOweItems.push(d);
    f.totalIOwe += d.amount;
  }
  for (const d of owedToMe) {
    const f = get(d.otherUserId);
    f.owedToMeItems.push(d);
    f.totalOwedToMe += d.amount;
  }

  const list: FriendBalance[] = [];
  for (const f of byUser.values()) {
    f.net = f.totalOwedToMe - f.totalIOwe;
    list.push(f);
  }
  return list;
}

/** Per-person balances aggregated across all groups, biggest |net| first. */
export function useFriendBalances() {
  const { iOwe, owedToMe, net, isLoading, refetch } = useDebtSummaries();

  const friends = useMemo(() => {
    return aggregate(iOwe, owedToMe)
      .filter((f) => Math.abs(f.net) >= EPS)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(iOwe), JSON.stringify(owedToMe)]);

  return { friends, net, isLoading, refetch };
}

/** Full (unfiltered) balance for a single person, for the detail screen. */
export function useFriendBalance(userId: string | undefined) {
  const { iOwe, owedToMe, isLoading, refetch } = useDebtSummaries();

  const friend = useMemo(() => {
    if (!userId) return undefined;
    const mine = iOwe.filter((d) => d.otherUserId === userId);
    const theirs = owedToMe.filter((d) => d.otherUserId === userId);
    const totalIOwe = mine.reduce((s, d) => s + d.amount, 0);
    const totalOwedToMe = theirs.reduce((s, d) => s + d.amount, 0);
    return {
      userId,
      totalIOwe,
      totalOwedToMe,
      net: totalOwedToMe - totalIOwe,
      iOweItems: mine,
      owedToMeItems: theirs,
    } satisfies FriendBalance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, JSON.stringify(iOwe), JSON.stringify(owedToMe)]);

  return { friend, isLoading, refetch };
}

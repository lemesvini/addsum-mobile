import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function computeOnline(state: NetInfoState): boolean {
  return !!(state.isConnected && state.isInternetReachable !== false);
}

export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = (state: NetInfoState) => {
      if (!cancelled) setIsOnline(computeOnline(state));
    };
    void NetInfo.fetch().then(sync);
    const unsub = NetInfo.addEventListener(sync);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return isOnline;
}

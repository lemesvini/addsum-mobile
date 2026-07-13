import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/hooks/use-theme";
import { Wallet } from "lucide-react-native";
import { View } from "react-native";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

/**
 * Net-balance card: a wallet icon and the amount, colored green when positive
 * (in your favor) and red when negative. Shared by the Amigos list (overall
 * net) and each friend's detail (that person's net).
 */
export function BalanceCard({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  const theme = useTheme();
  const positive = amount >= 0;
  return (
    <Card
      className={`bg-transparent flex-row items-center justify-between rounded-3xl px-6 py-6 ${
        className ?? ""
      }`}
    >
      <Wallet size={34} color={positive ? theme.primary : theme.destructive} />
      <View className="items-end">
        <Text
          className={`text-3xl font-extrabold ${
            positive ? "text-primary" : "text-destructive"
          }`}
        >
          {formatBRL(Math.abs(amount))}
        </Text>
      </View>
    </Card>
  );
}

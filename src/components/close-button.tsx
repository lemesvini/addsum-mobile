import { router } from "expo-router";
import { ArrowLeft, X } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

export default function BackButton() {
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <X size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

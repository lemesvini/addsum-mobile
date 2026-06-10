import { Text } from "@/components/ui/text";
import type { LoginInput } from "@/features/auth/api/auth-schemas";
import {
  Controller,
  type Control,
  type FieldErrors,
} from "react-hook-form";
import { useState } from "react";
import { Platform, TextInput, View } from "react-native";

type LoginFormFieldsProps = {
  control: Control<LoginInput>;
  errors: FieldErrors<LoginInput>;
  rootError?: string | null;
};

export function LoginFormFields({
  control,
  errors,
  rootError,
}: LoginFormFieldsProps) {
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  return (
    <>
      <View
        className="rounded-[14px] bg-[#F5F5F7] overflow-hidden"
        style={{
          marginBottom: 14,
          borderWidth: emailFocused ? 1.5 : 0,
          borderColor: emailFocused ? "#2C67CA" : "transparent",
        }}
      >
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={() => {
                onBlur();
                setEmailFocused(false);
              }}
              onFocus={() => setEmailFocused(true)}
              placeholder="E-mail"
              placeholderTextColor="#AEAEB2"
              style={{
                paddingHorizontal: 18,
                paddingVertical: Platform.OS === "ios" ? 17 : 15,
                fontSize: 17,
                color: "#1D1D1F",
              }}
            />
          )}
        />
      </View>
      {errors.email ? (
        <Text
          className="text-[#FF3B30]"
          style={{ fontSize: 14, lineHeight: 20, marginTop: -8, marginBottom: 8 }}
        >
          {errors.email.message}
        </Text>
      ) : null}

      <View
        className="rounded-[14px] bg-[#F5F5F7] overflow-hidden"
        style={{
          borderWidth: passwordFocused ? 1.5 : 0,
          borderColor: passwordFocused ? "#2C67CA" : "transparent",
        }}
      >
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={() => {
                onBlur();
                setPasswordFocused(false);
              }}
              onFocus={() => setPasswordFocused(true)}
              placeholder="Senha"
              placeholderTextColor="#AEAEB2"
              style={{
                paddingHorizontal: 18,
                paddingVertical: Platform.OS === "ios" ? 17 : 15,
                fontSize: 17,
                color: "#1D1D1F",
              }}
            />
          )}
        />
      </View>
      {errors.password ? (
        <Text
          className="text-[#FF3B30]"
          style={{ fontSize: 14, lineHeight: 20, marginTop: 8 }}
        >
          {errors.password.message}
        </Text>
      ) : null}

      {rootError ? (
        <Text
          className="text-[#FF3B30]"
          style={{ fontSize: 14, lineHeight: 20, marginTop: 12 }}
        >
          {rootError}
        </Text>
      ) : null}
    </>
  );
}

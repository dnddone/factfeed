import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import type { Post } from "@factfeed/contract";

import { getFactGradient } from "@/utils/gradient";

type Props = {
  post: Post;
};

/**
 * Full-bleed card: a gradient seeded from `post.id` (same fact always looks
 * the same), native text over it, and a top/bottom darken overlay so the
 * warm-white text stays legible on any gradient (design doc: "Fact
 * gradients"). `post.imageUrl` is a share/OG asset, not the in-feed face —
 * intentionally unused here (ADR 0006).
 */
const FactCardBase: React.FC<Props> = ({ post }) => {
  const { t } = useTranslation();
  const gradient = getFactGradient(post.id);

  return (
    <View className="absolute inset-0 overflow-hidden">
      {/**
       * LinearGradient isn't NativeWind-interop'd (only core RN primitives
       * are), so it takes plain `style` for position instead of `className`,
       * same as GestureHandlerRootView in `_layout.tsx`.
       */}
      <LinearGradient
        colors={gradient.colors}
        locations={gradient.locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.28)",
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0.42)",
        ]}
        locations={[0, 0.26, 0.55, 1]}
        style={{ position: "absolute", inset: 0 }}
      />
      <View className="flex-1 justify-end px-6 pb-32">
        <Text className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-cream opacity-[0.78]">
          {t("Did you know")}
        </Text>
        <Text className="text-[29px] font-semibold leading-[1.22] tracking-[-0.022em] text-cream">
          {post.content}
        </Text>
        <View className="mt-4.5 flex-row items-center gap-3.5">
          <Text className="font-mono text-[11px] uppercase text-cream opacity-70">
            {post.locale}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const FactCard = React.memo(FactCardBase);

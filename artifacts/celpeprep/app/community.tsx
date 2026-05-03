import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function getApiUrl(path: string) {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}${path}` : path;
}

type Post = {
  id: string; deviceToken: string; authorName: string; authorEmoji: string;
  content: string; topic: string; likesCount: number;
  isPinned: boolean; createdAt: string; liked?: boolean;
};

const TOPICS = [
  { key: "todos", label: "Todos", color: "#185FA5" },
  { key: "geral", label: "Geral", color: "#185FA5" },
  { key: "gramatica", label: "Gramática", color: "#6B21A8" },
  { key: "vocabulario", label: "Vocabulário", color: "#1D9E75" },
  { key: "escrita", label: "Escrita", color: "#D85A30" },
  { key: "pronuncia", label: "Pronúncia", color: "#BA7517" },
  { key: "exame", label: "Exame", color: "#0891B2" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("todos");
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newTopic, setNewTopic] = useState("geral");
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState<string | null>(null);

  const load = async (t: string) => {
    setLoading(true);
    try {
      const url = getApiUrl(`/api/content/community-posts?topic=${t}`);
      const res = await fetch(url, { headers: { "x-device-token": profile.deviceToken ?? "" } });
      if (res.ok) setPosts(await res.json() as Post[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (profile.deviceToken) load(topic); }, [topic, profile.deviceToken]);

  const handleLike = async (postId: string) => {
    if (!profile.deviceToken || liking) return;
    setLiking(postId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(getApiUrl(`/api/content/community-posts/${postId}/like`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken: profile.deviceToken }),
      });
      if (res.ok) {
        const { liked } = await res.json() as { liked: boolean };
        setPosts((prev) => prev.map((p) =>
          p.id === postId ? { ...p, liked, likesCount: p.likesCount + (liked ? 1 : -1) } : p
        ));
      }
    } catch {}
    setLiking(null);
  };

  const handlePost = async () => {
    if (!newContent.trim() || !profile.deviceToken) return;
    setPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(getApiUrl("/api/content/community-posts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceToken: profile.deviceToken,
          authorName: profile.name || "Estudante",
          authorEmoji: profile.avatarEmoji || "🎓",
          content: newContent.trim(),
          topic: newTopic,
        }),
      });
      if (res.ok) {
        const post = await res.json() as Post;
        if (topic === "todos" || topic === newTopic) {
          setPosts((prev) => [{ ...post, liked: false }, ...prev]);
        }
        setNewContent("");
        setShowCompose(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    setPosting(false);
  };

  const topicColor = (t: string) => TOPICS.find((x) => x.key === t)?.color ?? "#185FA5";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Comunidade</Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCompose(true); }}
          style={[styles.composeBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="edit" size={14} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.topicScroll, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.topicList}
      >
        {TOPICS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTopic(t.key)}
            style={[
              styles.topicChip,
              { backgroundColor: topic === t.key ? t.color : colors.muted, borderColor: topic === t.key ? t.color : "transparent" },
            ]}
          >
            <Text style={[styles.topicChipText, { color: topic === t.key ? "#fff" : colors.mutedForeground }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.feed}
          contentContainerStyle={[styles.feedContent, { paddingBottom: Platform.OS === "web" ? 40 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {posts.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="message-circle" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Seja o primeiro!</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nenhuma publicação ainda. Compartilhe uma dúvida ou dica com a comunidade.
              </Text>
            </View>
          ) : (
            posts.map((post) => {
              const tc = topicColor(post.topic);
              const topicLabel = TOPICS.find((x) => x.key === post.topic)?.label ?? post.topic;
              return (
                <View
                  key={post.id}
                  style={[
                    styles.postCard,
                    { backgroundColor: colors.card, borderColor: post.isPinned ? colors.primary + "50" : colors.border },
                  ]}
                >
                  {post.isPinned && (
                    <View style={[styles.pinnedRow, { borderBottomColor: colors.border }]}>
                      <Feather name="bookmark" size={11} color={colors.primary} />
                      <Text style={[styles.pinnedText, { color: colors.primary }]}>Fixado</Text>
                    </View>
                  )}
                  <View style={styles.postHeader}>
                    <View style={[styles.authorAvatar, { backgroundColor: tc + "20" }]}>
                      <Text style={styles.authorEmoji}>{post.authorEmoji}</Text>
                    </View>
                    <View style={styles.authorMeta}>
                      <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
                      <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{timeAgo(post.createdAt)}</Text>
                    </View>
                    <View style={[styles.topicBadge, { backgroundColor: tc + "18" }]}>
                      <Text style={[styles.topicBadgeText, { color: tc }]}>{topicLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>
                  <Pressable
                    onPress={() => handleLike(post.id)}
                    style={styles.likeRow}
                    disabled={liking === post.id}
                  >
                    <Feather
                      name="heart"
                      size={14}
                      color={post.liked ? "#EF4444" : colors.mutedForeground}
                    />
                    <Text style={[styles.likeCount, { color: post.liked ? "#EF4444" : colors.mutedForeground }]}>
                      {post.likesCount}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={showCompose} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCompose(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowCompose(false)}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancelar</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Publicação</Text>
              <Pressable onPress={handlePost} disabled={posting || !newContent.trim()}>
                <Text style={[styles.modalPost, { color: newContent.trim() && !posting ? colors.primary : colors.mutedForeground }]}>
                  {posting ? "..." : "Publicar"}
                </Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.authorRow}>
                <Text style={styles.authorEmojiLarge}>{profile.avatarEmoji || "🎓"}</Text>
                <Text style={[styles.authorNameMy, { color: colors.text }]}>{profile.name || "Você"}</Text>
              </View>
              <TextInput
                style={[styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.muted + "40" }]}
                placeholder="Compartilhe uma dúvida, dica ou reflexão sobre o Celpe-Bras..."
                placeholderTextColor={colors.mutedForeground}
                value={newContent}
                onChangeText={setNewContent}
                multiline maxLength={500}
                autoFocus
              />
              <Text style={[styles.charCount, { color: newContent.length > 450 ? "#EF4444" : colors.mutedForeground }]}>
                {newContent.length}/500
              </Text>
              <Text style={[styles.topicLabel, { color: colors.text }]}>Tópico</Text>
              <View style={styles.topicPicker}>
                {TOPICS.filter((t) => t.key !== "todos").map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => setNewTopic(t.key)}
                    style={[
                      styles.topicChip,
                      { backgroundColor: newTopic === t.key ? t.color : colors.muted, marginBottom: 6 },
                    ]}
                  >
                    <Text style={[styles.topicChipText, { color: newTopic === t.key ? "#fff" : colors.mutedForeground }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  composeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topicScroll: { borderBottomWidth: 1, maxHeight: 52 },
  topicList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  topicChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "transparent" },
  topicChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  empty: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 10, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  postCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  pinnedRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1 },
  pinnedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 8 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  authorEmoji: { fontSize: 18 },
  authorMeta: { flex: 1 },
  authorName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  postTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  topicBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  topicBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  postContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, paddingHorizontal: 14, paddingBottom: 10 },
  likeRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)" },
  likeCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalPost: { fontSize: 14, fontFamily: "Inter_700Bold" },
  modalBody: { padding: 16, gap: 12 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorEmojiLarge: { fontSize: 28 },
  authorNameMy: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  textarea: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22,
    minHeight: 120, textAlignVertical: "top",
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -8 },
  topicLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  topicPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type WordEntry = {
  id: string;
  word: string;
  ipa: string;
  tip: string;
  example: string;
};

type Category = {
  id: string;
  title: string;
  icon: string;
  color: string;
  words: WordEntry[];
};

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "nasais",
    title: "Vogais Nasais",
    icon: "wind",
    color: "#185FA5",
    words: [
      { id: "w1", word: "irmã", ipa: "/iɾˈmɐ̃/", tip: "O til nasaliza a vogal. Não pronuncie o 'n'.", example: "Minha irmã mora em São Paulo." },
      { id: "w2", word: "pão", ipa: "/ˈpɐ̃w/", tip: "Ditongo nasal -ão: soa como 'oun' em português.", example: "Eu gosto de pão de queijo." },
      { id: "w3", word: "campo", ipa: "/ˈkɐ̃pu/", tip: "O 'am' antes de consoante é vogal nasal.", example: "O campo está verde hoje." },
      { id: "w4", word: "mente", ipa: "/ˈmẽtʃi/", tip: "-ente: 'e' nasal + 'tchi' no final (Brasil).", example: "Ela é muito inteligente." },
      { id: "w5", word: "limão", ipa: "/liˈmɐ̃w/", tip: "Ditongo -ão no final: sons nasalizados.", example: "Quero suco de limão." },
    ],
  },
  {
    id: "sibilantes",
    title: "Sibilantes S e Z",
    icon: "zap",
    color: "#1D9E75",
    words: [
      { id: "w6", word: "casa", ipa: "/ˈkazɐ/", tip: "S entre vogais soa como Z em PT-BR.", example: "A casa é bonita." },
      { id: "w7", word: "mesa", ipa: "/ˈmezɐ/", tip: "Mesmo que 'casa': S intervocálico = /z/.", example: "Coloque na mesa, por favor." },
      { id: "w8", word: "fase", ipa: "/ˈfazɪ/", tip: "S depois de vogal = /z/ sonoro.", example: "Estamos na fase final." },
      { id: "w9", word: "passe", ipa: "/ˈpasɪ/", tip: "SS entre vogais = /s/ surdo.", example: "Me dê um passe de ônibus." },
      { id: "w10", word: "zero", ipa: "/ˈzeɾu/", tip: "Z inicial = /z/ sonoro, como em 'zebra'.", example: "O resultado foi zero a zero." },
    ],
  },
  {
    id: "rr",
    title: "R e RR",
    icon: "radio",
    color: "#6B21A8",
    words: [
      { id: "w11", word: "rato", ipa: "/ˈhatu/", tip: "R no início = /h/ fricativo velar (como 'h' em ingl.).", example: "O rato comeu o queijo." },
      { id: "w12", word: "caro", ipa: "/ˈkaɾu/", tip: "R entre vogais = /ɾ/ tap (vibração única, suave).", example: "Este carro é caro." },
      { id: "w13", word: "carro", ipa: "/ˈkaʁu/", tip: "RR = /h/ fricativo, igual ao R inicial.", example: "O carro está na garagem." },
      { id: "w14", word: "porta", ipa: "/ˈpɔʁtɐ/", tip: "R antes de consoante = /h/ ou /ʁ/ dependendo do dialeto.", example: "Abra a porta, por favor." },
      { id: "w15", word: "mar", ipa: "/ˈmaʁ/", tip: "R no final = apagado ou /ʁ/ fraco no Brasil.", example: "O mar está calmo hoje." },
    ],
  },
  {
    id: "lhnh",
    title: "LH e NH",
    icon: "feather",
    color: "#BA7517",
    words: [
      { id: "w16", word: "filha", ipa: "/ˈfiʎɐ/", tip: "LH = /ʎ/ palatal lateral. Como 'gli' em italiano.", example: "Minha filha estuda muito." },
      { id: "w17", word: "folha", ipa: "/ˈfoʎɐ/", tip: "LH nunca é /lh/ separados. Sempre um som só.", example: "A folha caiu da árvore." },
      { id: "w18", word: "vinha", ipa: "/ˈviɲɐ/", tip: "NH = /ɲ/ nasal palatal. Como 'gn' em francês.", example: "Ela vinha todo dia." },
      { id: "w19", word: "sonho", ipa: "/ˈsoɲu/", tip: "NH soa como o 'nh' em 'manhã'.", example: "Tive um sonho estranho." },
      { id: "w20", word: "julho", ipa: "/ˈʒuʎu/", tip: "Julho: J=/ʒ/ + LH=/ʎ/.", example: "Julho é um mês de festa." },
    ],
  },
  {
    id: "finais",
    title: "Sílabas Finais",
    icon: "corner-down-right",
    color: "#D85A30",
    words: [
      { id: "w21", word: "fácil", ipa: "/ˈfasil/", tip: "-il no final é pronunciado /il/ ou /iw/ no Sul.", example: "O exercício é fácil." },
      { id: "w22", word: "ótimo", ipa: "/ˈotimu/", tip: "Palavras proparoxítonas: acento na antepenúltima.", example: "O resultado foi ótimo!" },
      { id: "w23", word: "também", ipa: "/tɐ̃ˈbẽ/", tip: "-ém final: ditongo nasal.", example: "Eu também quero ir." },
      { id: "w24", word: "estudante", ipa: "/estuˈdɐ̃tʃɪ/", tip: "-te no final = /tʃɪ/ em PT-BR.", example: "Sou estudante de português." },
      { id: "w25", word: "grande", ipa: "/ˈɡɾɐ̃dʒɪ/", tip: "-de no final = /dʒɪ/ em PT-BR.", example: "São Paulo é uma cidade grande." },
    ],
  },
];

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

export default function PronunciationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch(getApiUrl("/api/content/pronunciation"))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.length > 0) setCategories(data); })
      .catch(() => {})
      .finally(() => setLoadingCats(false));
  }, []);

  const speak = async (text: string) => {
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    setSpeaking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Speech.speak(text, {
      language: "pt-BR",
      rate: 0.85,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const selectCat = (cat: Category) => {
    setSelectedCat(cat);
    setCurrentIdx(0);
    setRevealed(false);
  };

  const nextWord = () => {
    if (!selectedCat) return;
    if (currentIdx < selectedCat.words.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setRevealed(false);
    } else {
      setSelectedCat(null);
    }
  };

  if (!selectedCat) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Pronúncia</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Ouça, repita e aprenda os sons do português brasileiro com dicas fonéticas.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Feather name="volume-2" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Toque no ícone de som para ouvir a palavra. Repita em voz alta e compare com o áudio de referência.
          </Text>
        </View>

        {loadingCats ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => selectCat(cat)}
              style={({ pressed }) => [
                styles.catCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + "18" }]}>
                <Feather name={cat.icon as any} size={22} color={cat.color} />
              </View>
              <View style={styles.catMeta}>
                <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
                <Text style={[styles.catCount, { color: colors.mutedForeground }]}>{cat.words.length} palavras</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))
        )}
      </ScrollView>
    );
  }

  const word = selectedCat.words[currentIdx]!;
  const progress = (currentIdx + 1) / selectedCat.words.length;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.quizHeader}>
        <Pressable onPress={() => setSelectedCat(null)} style={styles.backBtn}>
          <Feather name="x" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.catLabel, { color: selectedCat.color }]}>{selectedCat.title}</Text>
        <Text style={[styles.progress, { color: colors.mutedForeground }]}>
          {currentIdx + 1}/{selectedCat.words.length}
        </Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: selectedCat.color }]} />
      </View>

      <View style={[styles.wordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.wordText, { color: colors.text }]}>{word.word}</Text>
        <Text style={[styles.ipaText, { color: colors.mutedForeground }]}>{word.ipa}</Text>

        <Pressable
          onPress={() => speak(word.word)}
          style={[styles.speakBtn, { backgroundColor: selectedCat.color + "18", borderColor: selectedCat.color + "40" }]}
        >
          <Feather name={speaking ? "volume-x" : "volume-2"} size={20} color={selectedCat.color} />
          <Text style={[styles.speakBtnText, { color: selectedCat.color }]}>
            {speaking ? "Parar" : "Ouvir pronunciação"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => speak(word.example)}
          style={[styles.speakBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Feather name="play-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.speakBtnText, { color: colors.mutedForeground }]}>Ouvir exemplo</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setRevealed(true)}
        style={[
          styles.tipCard,
          {
            backgroundColor: revealed ? colors.card : colors.muted,
            borderColor: revealed ? selectedCat.color + "40" : colors.border,
          },
        ]}
      >
        {revealed ? (
          <>
            <Text style={[styles.tipLabel, { color: selectedCat.color }]}>Dica Fonética</Text>
            <Text style={[styles.tipText, { color: colors.text }]}>{word.tip}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.tipLabel, { color: colors.mutedForeground }]}>Exemplo</Text>
            <Text style={[styles.exampleText, { color: colors.text }]}>"{word.example}"</Text>
          </>
        ) : (
          <View style={styles.revealPrompt}>
            <Feather name="eye" size={18} color={colors.mutedForeground} />
            <Text style={[styles.revealText, { color: colors.mutedForeground }]}>Toque para ver dica e exemplo</Text>
          </View>
        )}
      </Pressable>

      <Pressable style={[styles.nextBtn, { backgroundColor: selectedCat.color }]} onPress={nextWord}>
        <Text style={styles.nextBtnText}>
          {currentIdx < selectedCat.words.length - 1 ? "Próxima palavra" : "Concluir"}
        </Text>
        <Feather name="arrow-right" size={16} color="#fff" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: -6 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  catCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catMeta: { flex: 1, gap: 3 },
  catTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  catCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  quizHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  catLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  progress: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  wordCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 16 },
  wordText: { fontSize: 40, fontFamily: "Inter_700Bold" },
  ipaText: { fontSize: 18, fontFamily: "Inter_400Regular" },
  speakBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  speakBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tipCard: { borderRadius: 14, borderWidth: 1, padding: 18 },
  tipLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  tipText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  divider: { height: 1, marginVertical: 14 },
  exampleText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20, fontStyle: "italic" as any },
  revealPrompt: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  revealText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  nextBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});

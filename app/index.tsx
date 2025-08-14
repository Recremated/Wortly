import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Alert,
  Animated,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { kelimeler as kelimelerData } from "../data/kelimeler";
import type { Kelime } from "../types/kelime";

interface Question {
  type: "kelime-anlam" | "anlam-kelime" | "çekim" | "perfekt";
  question: string;
  correctAnswer: string;
  options: string[];
  typeText: string;
  verb?: string;
}

// Soru tipleri ve kişi zamirleri component dışında sabit tutulur
const QUESTION_TYPES = [
  "kelime-anlam",
  "anlam-kelime",
  "çekim",
  "perfekt",
] as const;
const KISILER = ["ich", "du", "er_sie_es", "wir", "ihr", "sie_Sie"] as const;
const KISI_LABELS: Record<(typeof KISILER)[number], string> = {
  ich: "ich",
  du: "du",
  er_sie_es: "er/sie/es",
  wir: "wir",
  ihr: "ihr",
  sie_Sie: "sie/Sie",
};

// Dark mode renk paleti
const COLORS = {
  light: {
    background: "#f0f8ff",
    surface: "#ffffff",
    primary: "#2563eb",
    secondary: "#10b981",
    text: "#1f2937",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    success: "#10b981",
    error: "#ef4444",
    warning: "#ea580c",
  },
  dark: {
    background: "#0f172a",
    surface: "#1e293b",
    primary: "#3b82f6",
    secondary: "#22c55e",
    text: "#f8fafc",
    textSecondary: "#94a3b8",
    border: "#334155",
    success: "#22c55e",
    error: "#f87171",
    warning: "#fb923c",
  },
};

// Şık seçeneklerini oluşturucu helper (kelimeler parametre olarak alınır)
const generateOptions = (
  kelimeler: Kelime[],
  correctAnswer: string,
  type: string,
  verb: string | null = null
): string[] => {
  let options = [correctAnswer];
  let attempts = 0;
  const maxAttempts = 20;

  while (options.length < 4 && attempts < maxAttempts) {
    attempts++;
    let wrongOption: string | undefined;

    switch (type) {
      case "anlam": {
        const randomKelime =
          kelimeler[Math.floor(Math.random() * kelimeler.length)];
        wrongOption = randomKelime.anlam;
        break;
      }
      case "kelime": {
        const randomKelime2 =
          kelimeler[Math.floor(Math.random() * kelimeler.length)];
        wrongOption = randomKelime2.kelime;
        break;
      }
      case "çekim": {
        const verbKelimeler = kelimeler.filter(
          (k) => k.tür === "verb" && k.kelime !== verb && k.çekimler
        );
        if (verbKelimeler.length > 0) {
          const randomVerb =
            verbKelimeler[Math.floor(Math.random() * verbKelimeler.length)];
          const randomKişi =
            KISILER[Math.floor(Math.random() * KISILER.length)];
          if (randomVerb.çekimler) {
            wrongOption = randomVerb.çekimler[randomKişi];
          }
        }
        break;
      }
      case "perfekt": {
        const verbKelimeler2 = kelimeler.filter(
          (k) => k.tür === "verb" && k.perfekt && k.kelime !== verb
        );
        if (verbKelimeler2.length > 0) {
          const randomVerb =
            verbKelimeler2[Math.floor(Math.random() * verbKelimeler2.length)];
          wrongOption = `${randomVerb.kelime} (perfekt)`;
        }
        break;
      }
    }

    if (wrongOption && !options.includes(wrongOption)) {
      options.push(wrongOption);
    }
  }

  if (options.length < 4) {
    const fallbackOptions = [
      "seçenek 1",
      "seçenek 2",
      "seçenek 3",
      "seçenek 4",
    ];
    while (options.length < 4) {
      const fallback = fallbackOptions[options.length - 1];
      if (!options.includes(fallback)) {
        options.push(fallback);
      } else {
        options.push(`seçenek ${options.length}`);
      }
    }
  }

  return options.sort(() => Math.random() - 0.5);
};

export default function App() {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const [kelimeler] = useState<Kelime[]>(kelimelerData);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Sistem teması değiştiğinde otomatik güncelle
  useEffect(() => {
    setIsDarkMode(systemColorScheme === "dark");
  }, [systemColorScheme]);

  // Mevcut tema renklerini al
  const colors = COLORS[isDarkMode ? "dark" : "light"];

  const generateQuestion = useCallback(() => {
    if (kelimeler.length === 0) return;

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const randomKelime =
      kelimeler[Math.floor(Math.random() * kelimeler.length)];

    const availableTypes = (QUESTION_TYPES as unknown as string[]).filter(
      (type) => {
        if (type === "çekim")
          return randomKelime.tür === "verb" && !!randomKelime.çekimler;
        if (type === "perfekt")
          return randomKelime.tür === "verb" && !!randomKelime.perfekt;
        return true;
      }
    );

    const finalTypes =
      availableTypes.length > 0 ? availableTypes : ["kelime-anlam"];
    const questionType =
      finalTypes[Math.floor(Math.random() * finalTypes.length)];

    let question: Question;

    try {
      switch (questionType) {
        case "kelime-anlam":
          question = {
            type: "kelime-anlam",
            question: randomKelime.kelime,
            correctAnswer: randomKelime.anlam,
            options: generateOptions(kelimeler, randomKelime.anlam, "anlam"),
            typeText: "Bu kelimenin anlamı nedir?",
          };
          break;
        case "anlam-kelime":
          question = {
            type: "anlam-kelime",
            question: randomKelime.anlam,
            correctAnswer: randomKelime.kelime,
            options: generateOptions(kelimeler, randomKelime.kelime, "kelime"),
            typeText: "Bu anlamın Almancası nedir?",
          };
          break;
        case "çekim":
          if (randomKelime.çekimler && randomKelime.tür === "verb") {
            const randomKişi =
              KISILER[Math.floor(Math.random() * KISILER.length)];
            const çekim = randomKelime.çekimler[randomKişi];
            question = {
              type: "çekim",
              question: `${KISI_LABELS[randomKişi]} _______ (${randomKelime.kelime})`,
              correctAnswer: çekim,
              options: generateOptions(
                kelimeler,
                çekim,
                "çekim",
                randomKelime.kelime
              ),
              verb: randomKelime.kelime,
              typeText: "Doğru çekimi seçin",
            };
          } else {
            question = {
              type: "kelime-anlam",
              question: randomKelime.kelime,
              correctAnswer: randomKelime.anlam,
              options: generateOptions(kelimeler, randomKelime.anlam, "anlam"),
              typeText: "Bu kelimenin anlamı nedir?",
            };
          }
          break;
        case "perfekt":
          if (randomKelime.perfekt && randomKelime.tür === "verb") {
            question = {
              type: "perfekt",
              question: `"${randomKelime.perfekt}" hangi fiilin perfekt halidir?`,
              correctAnswer: randomKelime.kelime,
              options: generateOptions(
                kelimeler,
                randomKelime.kelime,
                "kelime"
              ),
              verb: randomKelime.kelime,
              typeText: "Bu perfekt hali hangi fiildir?",
            };
          } else {
            question = {
              type: "kelime-anlam",
              question: randomKelime.kelime,
              correctAnswer: randomKelime.anlam,
              options: generateOptions(kelimeler, randomKelime.anlam, "anlam"),
              typeText: "Bu kelimenin anlamı nedir?",
            };
          }
          break;
        default:
          question = {
            type: "kelime-anlam",
            question: randomKelime.kelime,
            correctAnswer: randomKelime.anlam,
            options: generateOptions(kelimeler, randomKelime.anlam, "anlam"),
            typeText: "Bu kelimenin anlamı nedir?",
          };
      }

      setCurrentQuestion(question);
      setSelectedAnswer(null);
      setShowResult(false);
    } catch (error) {
      console.error("Soru oluşturulurken hata:", error);
      const fallbackQuestion: Question = {
        type: "kelime-anlam",
        question: randomKelime.kelime,
        correctAnswer: randomKelime.anlam,
        options: [randomKelime.anlam, "yanlış 1", "yanlış 2", "yanlış 3"],
        typeText: "Bu kelimenin anlamı nedir?",
      };
      setCurrentQuestion(fallbackQuestion);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  }, [kelimeler, fadeAnim]);

  const checkAnswer = (answer: string) => {
    if (!currentQuestion) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalQuestions((prev) => prev + 1);

    if (answer === currentQuestion.correctAnswer) {
      setScore((prev) => prev + 1);
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
    }
  };

  useEffect(() => {
    if (kelimeler.length > 0) {
      generateQuestion();
    }
  }, [kelimeler, generateQuestion]);

  const resetScore = () => {
    Alert.alert(
      "Skorları Sıfırla",
      "Tüm istatistikleri sıfırlamak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet",
          onPress: () => {
            setScore(0);
            setTotalQuestions(0);
            setStreak(0);
            generateQuestion();
          },
        },
      ]
    );
  };

  const getSuccessRate = () => {
    return totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  };

  const getOptionStyle = (option: string) => {
    let baseStyle = [
      styles.option,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ];

    if (!showResult || !currentQuestion) {
      return baseStyle;
    }

    if (option === currentQuestion.correctAnswer) {
      return [
        ...baseStyle,
        {
          borderColor: colors.success,
          backgroundColor: isDarkMode ? "#064e3b" : "#f0fdf4",
        },
      ];
    } else if (option === selectedAnswer) {
      return [
        ...baseStyle,
        {
          borderColor: colors.error,
          backgroundColor: isDarkMode ? "#7f1d1d" : "#fef2f2",
        },
      ];
    }
    return [
      ...baseStyle,
      { backgroundColor: isDarkMode ? "#1e293b" : "#f9fafb" },
    ];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
        translucent
      />

      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Wortly</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setIsDarkMode(!isDarkMode)}
                style={styles.themeButton}
              >
                <Ionicons
                  name={isDarkMode ? "sunny" : "moon"}
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={resetScore} style={styles.resetButton}>
                <Ionicons
                  name="refresh-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={[styles.stat, styles.statGreen]}>
              <Text style={[styles.statNumber, styles.statNumberGreen]}>
                {score}
              </Text>
              <Text style={[styles.statLabel, styles.statLabelGreen]}>
                Doğru
              </Text>
            </View>
            <View style={[styles.stat, styles.statBlue]}>
              <Text style={[styles.statNumber, styles.statNumberBlue]}>
                {getSuccessRate()}%
              </Text>
              <Text style={[styles.statLabel, styles.statLabelBlue]}>
                Başarı
              </Text>
            </View>
            <View style={[styles.stat, styles.statOrange]}>
              <View style={styles.streakContainer}>
                <Ionicons name="trophy-outline" size={20} color="#ea580c" />
                <Text style={[styles.statNumber, styles.statNumberOrange]}>
                  {streak}
                </Text>
              </View>
              <Text style={[styles.statLabel, styles.statLabelOrange]}>
                Seri
              </Text>
            </View>
          </View>
        </View>

        {/* Question Card */}
        {currentQuestion && (
          <Animated.View
            style={[
              styles.questionCard,
              { opacity: fadeAnim, backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[styles.questionType, { color: colors.textSecondary }]}
            >
              {currentQuestion.typeText}
            </Text>
            <Text style={[styles.questionText, { color: colors.text }]}>
              {currentQuestion.question}
            </Text>

            {/* Options */}
            <View style={styles.options}>
              {currentQuestion.options.map((option, index) => (
                <TouchableOpacity
                  key={`${currentQuestion.type}-${index}-${option}`}
                  onPress={() => !showResult && checkAnswer(option)}
                  disabled={showResult}
                  style={getOptionStyle(option)}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.text },
                        showResult &&
                          option === currentQuestion.correctAnswer && {
                            color: colors.success,
                          },
                        showResult &&
                          option === selectedAnswer &&
                          option !== currentQuestion.correctAnswer && {
                            color: colors.error,
                          },
                        showResult &&
                          option !== currentQuestion.correctAnswer &&
                          option !== selectedAnswer && {
                            color: colors.textSecondary,
                          },
                      ]}
                    >
                      {option}
                    </Text>
                    {showResult && (
                      <>
                        {option === currentQuestion.correctAnswer && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#10b981"
                          />
                        )}
                        {option === selectedAnswer &&
                          option !== currentQuestion.correctAnswer && (
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color="#ef4444"
                            />
                          )}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Next Question Button - only shows after answering */}
        {showResult && (
          <TouchableOpacity
            onPress={() => {
              setShowResult(false);
              setSelectedAnswer(null);
              generateQuestion();
            }}
            style={[
              styles.nextQuestionButton,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Ionicons name="arrow-forward" size={20} color="white" />
            <Text style={styles.nextQuestionButtonText}>Sonraki Soru</Text>
          </TouchableOpacity>
        )}

        {/* New Question Button - only shows when no question is active */}
        {!currentQuestion && (
          <TouchableOpacity
            onPress={() => {
              setShowResult(false);
              setSelectedAnswer(null);
              generateQuestion();
            }}
            style={[
              styles.newQuestionButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons name="shuffle-outline" size={20} color="white" />
            <Text style={styles.newQuestionButtonText}>Yeni Soru</Text>
          </TouchableOpacity>
        )}

        {/* Instructions */}
        <View
          style={[
            styles.instructions,
            {
              backgroundColor: isDarkMode
                ? "rgba(30, 41, 59, 0.5)"
                : "rgba(255,255,255,0.5)",
            },
          ]}
        >
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>
            Nasıl Çalışır:
          </Text>
          <Text
            style={[styles.instructionsText, { color: colors.textSecondary }]}
          >
            • Kelime anlamları sorulur
          </Text>
          <Text
            style={[styles.instructionsText, { color: colors.textSecondary }]}
          >
            • Fiil çekimleri test edilir
          </Text>
          <Text
            style={[styles.instructionsText, { color: colors.textSecondary }]}
          >
            • Perfekt halleri sorulur
          </Text>
          <Text
            style={[styles.instructionsText, { color: colors.textSecondary }]}
          >
            • Her soru çoktan seçmelidir
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // StatusBar alanı için
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50, // StatusBar için yeterli boşluk
  },
  header: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  themeButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
  },
  resetButton: {
    padding: 8,
    borderRadius: 8,
  },
  stats: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  statGreen: {
    backgroundColor: "#f0fdf4",
  },
  statBlue: {
    backgroundColor: "#eff6ff",
  },
  statOrange: {
    backgroundColor: "#fff7ed",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statNumberGreen: {
    color: "#15803d",
  },
  statNumberBlue: {
    color: "#2563eb",
  },
  statNumberOrange: {
    color: "#ea580c",
  },
  statLabel: {
    fontSize: 12,
  },
  statLabelGreen: {
    color: "#15803d",
  },
  statLabelBlue: {
    color: "#2563eb",
  },
  statLabelOrange: {
    color: "#ea580c",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  questionCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  questionType: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 20,
  },
  options: {
    gap: 12,
  },
  option: {
    padding: 14,
    borderWidth: 2,
    borderRadius: 12,
  },

  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    color: "#1f2937",
  },

  newQuestionButton: {
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  newQuestionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  nextQuestionButton: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  nextQuestionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  instructions: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    marginBottom: 4,
  },
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity, Easing } from 'react-native';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  interpolate,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';


const windowDimensions = Dimensions.get('window');
const SCREEN_W = windowDimensions.width;
const SCREEN_H = windowDimensions.height;

const MAP_W = 1200;
const MAP_H = 800;

const MAX_TRANSLATE_X = Math.max(0, (MAP_W - SCREEN_W) / 2);
const MAX_TRANSLATE_Y = Math.max(0, (MAP_H - SCREEN_H) / 2);


const CITY_GRAMMAR = [
  // --- УРОВЕНЬ A1 ---
  { id: 'london', name: 'LONDON', country: 'UK', coords: [-0.1276, 51.5074], topic: 'To Be (am/is/are)', level: 'A1' },
  { id: 'washington', name: 'WASHINGTON', country: 'USA', coords: [-77.0369, 38.9072], topic: 'Present Simple', level: 'A1' },
  { id: 'ottawa', name: 'OTTAWA', country: 'Canada', coords: [-75.6972, 45.4215], topic: 'Articles (a/an/the)', level: 'A1' },
  { id: 'canberra', name: 'CANBERRA', country: 'Australia', coords: [149.1300, -35.2809], topic: 'Plural Nouns', level: 'A1' },
  { id: 'dublin', name: 'DUBLIN', country: 'Ireland', coords: [-6.2603, 53.3498], topic: 'Adjectives', level: 'A1' },
  { id: 'wellington', name: 'WELLINGTON', country: 'New Zealand', coords: [174.7762, -41.2865], topic: 'Prepositions of Place', level: 'A1' },

  // --- УРОВЕНЬ A2 ---
  { id: 'tokyo', name: 'TOKYO', country: 'Japan', coords: [139.6917, 35.6895], topic: 'Past Simple', level: 'A2' },
  { id: 'berlin', name: 'BERLIN', country: 'Germany', coords: [13.4050, 52.5200], topic: 'Present Continuous', level: 'A2' },
  { id: 'madrid', name: 'MADRID', country: 'Spain', coords: [-3.7038, 40.4168], topic: 'Comparatives', level: 'A2' },
  { id: 'rome', name: 'ROME', country: 'Italy', coords: [12.4964, 41.9028], topic: 'Future (going to)', level: 'A2' },
  { id: 'paris', name: 'PARIS', country: 'France', coords: [2.3522, 48.8566], topic: 'Countable/Uncountable', level: 'A2' },

  // --- УРОВЕНЬ B1 ---
  { id: 'moscow', name: 'MOSCOW', country: 'Russia', coords: [37.6173, 55.7558], topic: 'Present Perfect', level: 'B1' },
  { id: 'beijing', name: 'BEIJING', country: 'China', coords: [116.4074, 39.9042], topic: 'First Conditional', level: 'B1' },
  { id: 'seoul', name: 'SEOUL', country: 'South Korea', coords: [126.9780, 37.5665], topic: 'Modals (can/must)', level: 'B1' },
  { id: 'cairo', name: 'CAIRO', country: 'Egypt', coords: [31.2357, 30.0444], topic: 'Past Continuous', level: 'B1' },
  { id: 'brasilia', name: 'BRASILIA', country: 'Brazil', coords: [-47.8825, -15.7942], topic: 'Relative Clauses', level: 'B1' },

  // --- УРОВЕНЬ B2 ---
  { id: 'newdelhi', name: 'NEW DELHI', country: 'India', coords: [77.1025, 28.7041], topic: 'Passive Voice', level: 'B2' },
  { id: 'mexico', name: 'MEXICO CITY', country: 'Mexico', coords: [-99.1332, 19.4326], topic: 'Reported Speech', level: 'B2' },
  { id: 'buenosaires', name: 'BUENOS AIRES', country: 'Argentina', coords: [-58.3816, -34.6037], topic: 'Second Conditional', level: 'B2' },

  // --- УРОВЕНЬ C1 ---
  { id: 'stockholm', name: 'STOCKHOLM', country: 'Sweden', coords: [18.0686, 59.3293], topic: 'Third Conditional', level: 'C1' },
];

const CONTINENTS_LABELS = [
  { name: 'NORTH AMERICA', coords: [-100, 45] },
  { name: 'SOUTH AMERICA', coords: [-60, -15] },
  { name: 'EUROPE', coords: [15, 50] },
  { name: 'AFRICA', coords: [20, 0] },
  { name: 'ASIA', coords: [90, 45] },
  { name: 'AUSTRALIA', coords: [135, -25] },
  { name: 'ANTARCTICA', coords: [0, -80] },
];

const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Компонент пульсирующей точки (ВНЕ HackerMapScreen)
const PulsingCircle = ({ cx, cy, id, pressedCityId }) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Используем функции Reanimated для создания бесконечной анимации
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1, // бесконечный повтор
      true // анимация идет в обратном направлении
    );
  }, []);

  const isPressed = pressedCityId === id;

  const animatedProps = useAnimatedProps(() => ({
    r: isPressed ? 12 : 6 + (pulse.value - 1) * 4,
    fill: isPressed ? '#FFFFFF' : '#FFCC00',
    stroke: isPressed ? '#00FFCC' : '#000',
    strokeWidth: isPressed ? 3 : 1,
  }));

  return <AnimatedCircle cx={cx} cy={cy} animatedProps={animatedProps} />;
}; // <-- ВОТ ЭТА СКОБКА БЫЛА ПОТЕРЯНА


export default function HackerMapScreen({ navigation }) {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cityPositions, setCityPositions] = useState([]);
  const [pressedCityId, setPressedCityId] = useState(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  const handleCityPress = (city) => {
    navigation.navigate('GrammarScreen', {
      cityName: city.name,
      topic: city.topic
    });
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 0.8) {
        scale.value = withSpring(0.8);
        savedScale.value = 0.8;
      } else if (scale.value > 5) {
        scale.value = withSpring(5);
        savedScale.value = 5;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translationX.value = savedTranslationX.value + e.translationX;
      translationY.value = savedTranslationY.value + e.translationY;
    })
    .onEnd((e) => {
      translationX.value = withDecay({
        velocity: e.velocityX,
        clamp: [-MAX_TRANSLATE_X, MAX_TRANSLATE_X],
      });
      translationY.value = withDecay({
        velocity: e.velocityY,
        clamp: [-MAX_TRANSLATE_Y, MAX_TRANSLATE_Y],
      });
      savedTranslationX.value = translationX.value;
      savedTranslationY.value = translationY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  const continentsOpacity = useAnimatedProps(() => ({
    opacity: interpolate(scale.value, [1, 2.5], [0.6, 0], 'clamp'),
  }));

  const countriesOpacity = useAnimatedProps(() => ({
    opacity: interpolate(scale.value, [3.5, 5], [0, 0.8], 'clamp'),
  }));

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then(topology => {
        const geoFeatures = topojson.feature(topology, topology.objects.countries).features;
        setFeatures(geoFeatures);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (loading) return;

    const projection = d3.geoMercator()
      .scale(120)
      .translate([MAP_W / 2, MAP_H / 2]);

    const positions = CITY_GRAMMAR.map(city => {
      const point = projection(city.coords);
      if (!point) return null;
      return {
        x: point[0],
        y: point[1],
        data: city
      };
    }).filter(Boolean);

    setCityPositions(positions);
  }, [loading]);

  if (loading) return <ActivityIndicator size="large" color="#00FFCC" style={{ flex: 1, backgroundColor: '#000' }} />;

  const projection = d3.geoMercator()
    .scale(120)
    .translate([MAP_W / 2, MAP_H / 2]);

  const pathGenerator = d3.geoPath().projection(projection);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          <Svg width={MAP_W} height={MAP_H}>

            {/* Слой 1: Страны */}
            <G>
              {features.map((feature, index) => (
                <Path
                  key={index}
                  d={pathGenerator(feature)}
                  fill="#0B1E2D"
                  stroke="#00FFCC"
                  strokeWidth={0.5}
                />
              ))}
            </G>

            {/* Слой 2: Материки */}
            {CONTINENTS_LABELS.map((continent, index) => {
              const point = projection(continent.coords);
              if (!point) return null;
              return (
                <AnimatedSvgText
                  key={`cont-${index}`}
                  x={point[0]}
                  y={point[1]}
                  fill="#00FFCC"
                  fontSize="20"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  animatedProps={continentsOpacity}
                >
                  {continent.name}
                </AnimatedSvgText>
              );
            })}

            {/* Слой 3: Страны (гиганты) */}
            {features.map((feature, index) => {
              const centroid = pathGenerator.centroid(feature);
              const countryName = feature.properties.name;

              if (!countryName || !centroid || isNaN(centroid[0])) return null;
              const area = pathGenerator.area(feature);
              if (area < 10.0) return null;

              return (
                <AnimatedSvgText
                  key={`country-${index}`}
                  x={centroid[0]}
                  y={centroid[1]}
                  fill="#00FFCC"
                  fontSize="5"
                  fontFamily="monospace"
                  textAnchor="middle"
                  animatedProps={countriesOpacity}
                >
                  {countryName}
                </AnimatedSvgText>
              );
            })}

            {/* Слой 4: Грамматические точки (Столицы) */}
            {cityPositions.map((city, index) => {
              const isPressed = pressedCityId === city.data.id;

              return (
                <G key={`city-${index}`}>
                  <PulsingCircle cx={city.x} cy={city.y} id={city.data.id} pressedCityId={pressedCityId} />
                  <SvgText
                    x={city.x + 10}
                    y={city.y + 4}
                    fill={isPressed ? '#FFFFFF' : '#FFCC00'}
                    fontSize={isPressed ? "12" : "8"}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {city.data.name}
                  </SvgText>
                </G>
              );
            })}

          </Svg>

          {/* Слой 5: Невидимые кнопки для кликов */}
          {cityPositions.map((city, index) => (
            <TouchableOpacity
              key={`btn-${index}`}
              style={{
                position: 'absolute',
                left: city.x - 20,
                top: city.y - 20,
                width: 40,
                height: 40,
                borderRadius: 20,
              }}
              onPressIn={() => setPressedCityId(city.data.id)}
              onPressOut={() => setPressedCityId(null)}
              onPress={() => handleCityPress(city.data)}
            />
          ))}

        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  mapContainer: {
    width: MAP_W,
    height: MAP_H,
    position: 'absolute',
    top: (SCREEN_H - MAP_H) / 2,
    left: (SCREEN_W - MAP_W) / 2,
  },
});
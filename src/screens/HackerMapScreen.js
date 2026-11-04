import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDecay, withSpring, interpolate, useAnimatedProps } from 'react-native-reanimated';

const windowDimensions = Dimensions.get('window');
const SCREEN_W = windowDimensions.width;
const SCREEN_H = windowDimensions.height;

const MAP_W = 2000; // Увеличили холст
const MAP_H = 1200;

const MAX_TRANSLATE_X = Math.max(0, (MAP_W - SCREEN_W) / 2);
const MAX_TRANSLATE_Y = Math.max(0, (MAP_H - SCREEN_H) / 2);

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

export default function HackerMapScreen() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
        savedScale.value = 0.5;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
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

  // Материки: видны при малом зуме, исчезают при среднем
  const continentsOpacity = useAnimatedProps(() => ({
    opacity: interpolate(scale.value, [1, 2], [0.6, 0], 'clamp'),
  }));

  // Страны: появляются только при сильном зуме
  const countriesOpacity = useAnimatedProps(() => ({
    opacity: interpolate(scale.value, [2.5, 3.5], [0, 0.8], 'clamp'),
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

  if (loading) return <ActivityIndicator size="large" color="#00FFCC" style={{ flex: 1, backgroundColor: '#000' }} />;

  // ✅ УВЕЛИЧИЛИ МАСШТАБ ДО 200 (было 120)
  const projection = d3.geoMercator()
    .scale(200)
    .translate([MAP_W / 2, MAP_H / 2]);

  const pathGenerator = d3.geoPath().projection(projection);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          <Svg width={MAP_W} height={MAP_H}>

            {/* Слой 1: Контуры стран */}
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

            {/* Слой 2: Названия материков */}
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

            {/* Слой 3: Названия стран (только крупные) */}
            {features.map((feature, index) => {
              const centroid = pathGenerator.centroid(feature);
              const countryName = feature.properties.name;

              if (!countryName || !centroid || isNaN(centroid[0])) return null;

              // Считаем площадь
              const area = pathGenerator.area(feature);

              // Оставляем только очень крупные страны (порог 10.0)
              // При scale(200) это оставит только гигантов
              if (area < 10.0) return null;

              return (
                <AnimatedSvgText
                  key={`country-${index}`}
                  x={centroid[0]}
                  y={centroid[1]}
                  fill="#00FFCC"
                  fontSize="6"
                  fontFamily="monospace"
                  textAnchor="middle"
                  animatedProps={countriesOpacity}
                >
                  {countryName}
                </AnimatedSvgText>
              );
            })}

          </Svg>
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
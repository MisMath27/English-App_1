import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDecay, withSpring } from 'react-native-reanimated';

const windowDimensions = Dimensions.get('window');
const SCREEN_W = windowDimensions.width;
const SCREEN_H = windowDimensions.height;

// ✅ УМЕНЬШИЛИ РАЗМЕРЫ ХОЛСТА, ЧТОБЫ КАРТА ВЛЕЗЛА
const MAP_W = 1200;
const MAP_H = 800;

// Ограничения для движения (чтобы карта не уезжала за экран)
const MAX_TRANSLATE_X = Math.max(0, (MAP_W - SCREEN_W) / 2);
const MAX_TRANSLATE_Y = Math.max(0, (MAP_H - SCREEN_H) / 2);

export default function HackerMapScreen() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  // Зум
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 0.8) {
        scale.value = withSpring(0.8);
        savedScale.value = 0.8;
      } else if (scale.value > 2) {
        scale.value = withSpring(2);
        savedScale.value = 2;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Перетаскивание
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

  if (loading) return <ActivityIndicator size="large" color="#0F0" style={{ flex: 1, backgroundColor: '#000' }} />;

  // ✅ УМЕНЬШИЛИ МАСШТАБ ПРОЕКЦИИ (было 300, стало 120)
  const projection = d3.geoMercator()
    .scale(120)
    .translate([MAP_W / 2, MAP_H / 2]);

  const pathGenerator = d3.geoPath().projection(projection);

  const londonPoint = projection([-0.1276, 51.5074]);
  const londonX = londonPoint ? londonPoint[0] : 0;
  const londonY = londonPoint ? londonPoint[1] : 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          <Svg width={MAP_W} height={MAP_H}>
            <G>
              {features.map((feature, index) => (
                <Path
                  key={index}
                  d={pathGenerator(feature)}
                  fill="#0B1E2D"
                  stroke="#0F0"
                  strokeWidth={1}
                />
              ))}
            </G>
            <Circle cx={londonX} cy={londonY} r={8} fill="#0F0" stroke="#fff" strokeWidth={1} />
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
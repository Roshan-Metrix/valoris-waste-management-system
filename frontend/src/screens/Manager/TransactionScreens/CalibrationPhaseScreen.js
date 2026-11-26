import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";

import { CameraView, Camera } from "expo-camera";
import { File } from "expo-file-system";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import colors from "../../../colors";
import Alert from "../../../Components/Alert";
import useImagePreview from "../../../lib/useImagePreview";

export default function CalibrationPhaseScreen({ navigation, route }) {
  const { transactionId } = route.params || {};

  const cameraRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto] = useState(null);

  const [enterWeight, setEnterWeight] = useState("");
  const [manualInput, setManualInput] = useState("");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [canCalibrate, setCanCalibrate] = useState(false);
  const [token, setToken] = useState(null);

  const { openImage, ImagePreviewModal } = useImagePreview();

  // Initialize screen
  useEffect(() => {
    const initialize = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        setToken(storedToken);
        await requestCameraPermission();
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initialize();
  }, []);

  // Camera permission
  const requestCameraPermission = async () => {
    try {
      const cam = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cam.status === "granted");
    } catch (error) {
      console.error("Permission error:", error);

      setHasPermission(false);
      setAlertMessage("Unable to access camera permission.");
      setAlertVisible(true);
    }
  };

  // Capture image
  const handleCapture = async () => {
    if (loading) return;

    if (!cameraRef.current) {
      setAlertMessage("Camera not ready.");
      setAlertVisible(true);
      return;
    }

    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.3,
      });

      setPhoto(picture);
      setCanCalibrate(true);
    } catch (error) {
      console.error("Capture error:", error);

      setAlertMessage(error?.message || "Failed to capture image.");
      setAlertVisible(true);
    }
  };

  // Recapture image
  const handleRecapture = () => {
    setPhoto(null);
    setManualInput("");
    setEnterWeight("");
    setCanCalibrate(false);
  };

  // Calibration API
  const handleCalibrate = async () => {
    if (loading) return;

    if (!token) {
      setAlertMessage("Please login again.");
      setAlertVisible(true);
      return;
    }

    if (!transactionId) {
      setAlertMessage("Transaction ID is missing.");
      setAlertVisible(true);
      return;
    }

    if (!photo?.uri) {
      setAlertMessage("Please capture image first!");
      setAlertVisible(true);
      return;
    }

    if (manualInput.trim() === "") {
      setAlertMessage("Please enter manual input weight.");
      setAlertVisible(true);
      return;
    }

    const finalEnterWeight =
      enterWeight.trim() === "" ? "0" : enterWeight.trim();

    try {
      setLoading(true);

      const formData = new FormData();

      const imageFile = new File(photo.uri);

      formData.append(
        "image",
        imageFile,
        `calibration-${Date.now()}.jpg`
      );

      formData.append("fetchWeight", manualInput.trim());
      formData.append("enterWeight", finalEnterWeight);

      // console.log("Uploading calibration image:", photo.uri);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/transaction/transaction-calibration/${transactionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const res = await response.json();

      // console.log("Calibration Response:", res);

      if (response.ok && res.success) {
        await AsyncStorage.setItem(
          "calibrationStatus",
          "Completed"
        );

        navigation.navigate("ProcessTransactionScreen");
      } else {
        setAlertMessage(res.message || "Calibration failed!");
        setAlertVisible(true);
      }
    } catch (error) {
      console.error("Calibration Error:", error);

      setAlertMessage(
        error?.message || "Calibration failed!"
      );

      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Permission loading
  if (hasPermission === null) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <View style={styles.centerScreen}>
        <Text>No access to camera</Text>

        <TouchableOpacity
          onPress={requestCameraPermission}
          style={styles.permissionBtn}
        >
          <Text style={{ color: "#fff" }}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons
            name="arrow-back"
            size={26}
            color={colors.primary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Calibration Phase
        </Text>

        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* CAMERA / IMAGE PREVIEW */}
        <View style={styles.card}>
          {photo ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openImage({ uri: photo.uri })}
            >
              <Image
                source={{ uri: photo.uri }}
                style={styles.capturedImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <CameraView
              style={styles.camera}
              ref={cameraRef}
              facing="back"
            />
          )}
        </View>

        {/* CAPTURE BUTTON */}
        {!photo && (
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={handleCapture}
            disabled={loading}
          >
            <MaterialIcons
              name="camera-alt"
              size={22}
              color="#fff"
            />

            <Text style={styles.captureText}>
              Capture Image
            </Text>
          </TouchableOpacity>
        )}

        {/* RECAPTURE BUTTON */}
        {photo && (
          <TouchableOpacity
            style={styles.reBtn}
            onPress={handleRecapture}
            disabled={loading}
          >
            <MaterialIcons
              name="camera"
              size={22}
              color="#fff"
            />

            <Text style={styles.captureText}>
              Capture Again
            </Text>
          </TouchableOpacity>
        )}

        {/* WEIGHT INPUTS */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            Exact Weight
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={enterWeight}
              onChangeText={setEnterWeight}
              keyboardType="decimal-pad"
              placeholder="Enter exact weight"
            />

            <Text style={styles.unit}>kg</Text>
          </View>

          <Text style={styles.inputLabel}>
            Manual Input
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={manualInput}
              onChangeText={setManualInput}
              keyboardType="decimal-pad"
              placeholder="Enter manual weight"
            />

            <Text style={styles.unit}>kg</Text>
          </View>
        </View>

        {/* CALIBRATE BUTTON */}
        {canCalibrate && (
          <TouchableOpacity
            style={[
              styles.mainBtn,
              loading && { opacity: 0.6 },
            ]}
            onPress={handleCalibrate}
            disabled={loading}
          >
            <Text style={styles.mainBtnText}>
              Calibrate
            </Text>
          </TouchableOpacity>
        )}

        {/* INFORMATION */}
        {!canCalibrate && (
          <View style={styles.infoBox}>
            <MaterialIcons
              name="info-outline"
              size={22}
              color={colors.primary}
            />

            <Text style={styles.infoText}>
              Zero error must be less than 0.1 kg{"\n"}
              Calc: Manual Input - Exact Weight {"<"} 0.1
            </Text>
          </View>
        )}
      </ScrollView>

      {/* LOADING OVERLAY */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />

          <Text style={{ color: "#fff", marginTop: 10 }}>
            Processing...
          </Text>
        </View>
      )}

      {/* ALERT */}
      <Alert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      {/* IMAGE PREVIEW */}
      <ImagePreviewModal />
    </View>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },

  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    elevation: 5,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },

  card: {
    width: "90%",
    height: 280,
    backgroundColor: "#ffffffbb",
    borderRadius: 18,
    alignSelf: "center",
    marginTop: 20,
    overflow: "hidden",
  },

  camera: {
    flex: 1,
  },

  capturedImage: {
    width: "100%",
    height: "100%",
  },

  captureBtn: {
    flexDirection: "row",
    marginTop: 15,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    width: "70%",
    alignSelf: "center",
    justifyContent: "center",
  },

  reBtn: {
    flexDirection: "row",
    marginTop: 5,
    backgroundColor: "#4b5563",
    paddingVertical: 13,
    borderRadius: 12,
    width: "70%",
    alignSelf: "center",
    justifyContent: "center",
  },

  captureText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "700",
  },

  permissionBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },

  inputCard: {
    marginTop: 13,
    padding: 20,
    backgroundColor: "#ffffffaa",
    borderRadius: 18,
    width: "90%",
    alignSelf: "center",
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    padding: 5,
  },

  inputWrapper: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 2,
    alignItems: "center",
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000",
  },

  unit: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563eb",
  },

  mainBtn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
    width: "85%",
    alignSelf: "center",
  },

  mainBtnText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    padding: 14,
    borderRadius: 12,
    margin: 15,
  },

  infoText: {
    color: "#1e3a8b",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});

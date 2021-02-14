/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useState, useRef} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { BleManager } from 'react-native-ble-plx';
import Base64Binary from './logic/Base64toInt';
import checkForBluetoothPermission from './logic/bluetoothPermissions';
import RBSheet from "react-native-raw-bottom-sheet";
import formatTime from './logic/formatTime';
import Settings from './assets/settingsgear.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { soundAlarm, stopAlarm } from './logic/soundAlarm';
import ProgressCircle from 'react-native-progress-circle'
import Colors from './assets/colors';

export const manager = new BleManager();


const App  = () =>  {
  const [weight, setWeight] = useState(0);
  const [startWeight, setStartWeight] = useState(0);
  const [percentWeightRemaining, setPercentWeightRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [maxTime, setMaxTime] = useState(1800);
  const [alarmWeight, setAlarmWeight] = useState(85);
  const [remainingTime, setRemainingTime] = useState(maxTime);
  const [bluetooth, setBluetooth] = useState({
    isConnected: false,
    scale: null

  });  
  const DEVICE_NAME = 'smartchef';
  const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
  const CHARACTERISTIC_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

  // pull in timer and weight defaults
  useEffect(() => {
    const getData = async () => {
      try {
        const savedMaxSeconds = await AsyncStorage.getItem('maxSeconds');
        const savedAlarmWeight = await AsyncStorage.getItem('alarmWeight');

        if(savedMaxSeconds) {
          setMaxTime(parseInt(savedMaxSeconds));
        }

        if (savedAlarmWeight) {
          setAlarmWeight(Number(savedAlarmWeight));
        }
      } catch(e) {
        Alert.alert('There was an error retrieving the saved presets.');
      }
    };

    getData();
  }, []);

  // check for bluetooth permission
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await checkForBluetoothPermission();
      if (permission && !permission.success) {
        Alert.alert(permission.message);
      }
    };

    checkPermission();
  }, []);


  const onDeviceFound = async (error, device) => {

    if (error) {
      return
    }

    if (device.name?.toLowerCase() === DEVICE_NAME) {
      manager.stopDeviceScan();
      let scale = await device.connect();
      setBluetooth({...bluetooth, scale: scale});

      if (scale) {
        setBluetooth({...bluetooth, isConnected: true});
        scale = await scale.discoverAllServicesAndCharacteristics();

        //let weightSubscription = await scale.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, decodeWeightFromCharacteristic);
        manager.monitorCharacteristicForDevice(device.id, SERVICE_UUID, CHARACTERISTIC_UUID, decodeWeightFromCharacteristic);
        scale.onDisconnected(() => {
          setBluetooth({...bluetooth, isConnected: false});
          soundAlarm();
          Alert.alert('App is no longer connected to scale.');
        });
      }
    }
  };

  const decodeWeightFromCharacteristic = (error, characteristic) => {
    if (error) {
      return
    }
    let data = Base64Binary.decode(characteristic.value);
    let weight = (data[5] * 256 + data[6])/100;
    setWeight(weight.toFixed(1));
  };

  useEffect(() => {
    const scanAndConnect = async () => {
      if(!bluetooth.isConnected) {
        manager.startDeviceScan(null, null, onDeviceFound);
      }
    };

    const subscription = manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
          scanAndConnect();
          subscription.remove();
      }
    }, true);

    return () => {
      manager.destroy()
      console.log('destroying');
    };
  }, [manager]);

  useEffect(() => {
    if (!bluetooth.isConnected) {
      manager.startDeviceScan(null, null, onDeviceFound);
    }
  }, [bluetooth.isConnected])

  const handleStartButtonPress = () => {
    setStartWeight(weight);
    setRunning(!running);
  };

  const handleClearButtonPress = () => {
    setRemainingTime(maxTime);
  };

  const handleMaxTimeInput = (input) => {
    // input is minutes, so convert to seconds
    let seconds = input * 60;

    setMaxTime(seconds);
    setRemainingTime(seconds);

    try {
      AsyncStorage.setItem('maxSeconds', JSON.stringify(seconds));
    } catch (e) {
      Alert.alert('There was an error saving the max time.');
    }
  };

  const handleAlarmWeightInput = (input) => {
      setAlarmWeight(input);

      try {
        AsyncStorage.setItem('alarmWeight', input);
      } catch (e) {
        Alert.alert('There was an error saving the weight.');
      }
  };

  useEffect(() => {
    if (running && ((weight <= alarmWeight) || !remainingTime)) {
      soundAlarm();
    }

    
    setPercentWeightRemaining(((startWeight - weight)/(startWeight-alarmWeight)) * 100)
  }, [weight, running, remainingTime]);

  useEffect(() => {
    // if not running then stop
    if (!running) {
      stopAlarm();
      return;
    }
    
    // exit early when we reach 0
    if (!remainingTime) {
      setRunning(false);
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingTime(remainingTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [remainingTime, running]);

  const refRBSheet = useRef();
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.DARK_BLUE} />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.mainContainer}>
            <TouchableOpacity title="Settings" onPress={() => refRBSheet.current.open()} style={styles.settingsContainer}>
              <Settings width={40} height={40} />
            </TouchableOpacity>
            {!bluetooth.isConnected && 
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>Scale not connected.</Text>
              <Text style={styles.warningText}>Scanning...</Text>
              <ActivityIndicator size='large' color={Colors.WHITE} style={{marginTop: '5%'}} />
            </View>
            }
            {bluetooth.isConnected && 
            <View style={styles.infoContainer}>
              <View style={styles.weightContainer}>
                <ProgressCircle
                  percent={percentWeightRemaining}
                  radius={150}
                  borderWidth={8}
                  color={Colors.GREEN}
                  shadowColor={Colors.WHITE}
                  bgColor={Colors.DARK_BLUE}>
                  <Text style={styles.percentText}>{percentWeightRemaining.toFixed(0)}%</Text> 
                  <Text style={styles.weightText}>{weight}g</Text> 
                </ProgressCircle>
              </View>
              <View style={styles.remainingTimeContainer}>
                <Text style={styles.remainingTimeText}>{formatTime(remainingTime)} remaining.</Text>
              </View>
              <TouchableOpacity
                style={styles.startButtonContainer}
                onPress={handleStartButtonPress}>
                <Text style={styles.startButtonText}>{running ? "Stop" : "Start"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.startButtonContainer}
                onPress={handleClearButtonPress}>
                <Text style={styles.startButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>}
            <RBSheet
              ref={refRBSheet}
              closeOnDragDown={true}
              closeOnPressMask={false}
              customStyles={{
                container: {
                  borderRadius: 10,
                  paddingHorizontal: '5%',
                },
                wrapper: {
                  //backgroundColor: "transparent"
                  opacity: 0.8,
                  backgroundColor: 'gray',
                },
                draggableIcon: {
                  backgroundColor: "#000"
                }
              }}
            >
              <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Timer limit: </Text>
                <TextInput
                  value={(maxTime/60).toString()}
                  onChangeText={handleMaxTimeInput}
                  keyboardType='numeric'
                  style={styles.textInput}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Alarm weight: </Text>
                <TextInput
                  value={alarmWeight.toString()}
                  onChangeText={handleAlarmWeightInput}
                  keyboardType='numeric'
                  style={styles.textInput}
                />
              </View>
            </RBSheet>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    //borderWidth: 2,
    borderColor: 'red',
    height: '100%',
    backgroundColor: Colors.DARK_BLUE,
  },
  mainContainer: {
    //borderWidth: 2,
    borderColor: 'black',
  },
  infoContainer: {
    //borderWidth: 2,
    alignItems: 'center',
    borderColor: 'orange',
  },
  weightContainer: {
    //borderWidth: 2,
    borderColor: 'green',
    marginVertical: '10%',
  },
  weightText: {
    fontSize: 35,
    color: 'white',
  },
  percentText: {
    fontSize: 75,
    color: 'white',
  },
  warningText: {
    color: 'orange',
    fontSize: 40
  },
  startButtonContainer: {
    //borderWidth: 3,
    marginVertical: '5%',
    alignItems: 'center',
    backgroundColor: Colors.LIGHT_BLUE,
    borderRadius: 20,
    width: '80%',
  },
  startButtonText: {
    fontSize: 35,
    color: 'white',
  },
  remainingTimeContainer: {
    //borderWidth: 1,
    alignItems: 'center',
  },
  remainingTimeText: {
    //borderWidth: 1,
    fontSize: 35,
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: '5%',
  },
  textInput: {
    marginLeft: 10,
    borderBottomWidth: 1,
    width: 100,
    fontSize: 30
  },
  inputLabel: {
    fontSize: 30
  },
  settingsContainer: {
    //borderWidth: 2,
    //borderColor: 'red',
    width: '95%',
    alignItems: 'flex-end',
    marginRight: 10,
  },
  settingsGear: {
    width: 35,
    height: 35
  },
  warningContainer: {
    alignItems: 'center',
    marginTop: '50%',    
  }
});

export default App;

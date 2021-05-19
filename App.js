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
import checkForBluetoothPermission from './logic/bluetoothPermissions';
import RBSheet from "react-native-raw-bottom-sheet";
import formatTime from './logic/formatTime';
import Settings from './assets/settingsgear.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { soundAlarm, stopAlarm } from './logic/soundAlarm';
import decodeWeightFromCharacteristic from './logic/decodeWeight';
import ProgressCircle from 'react-native-progress-circle'
import Colors from './assets/colors';
import KeepAwake from 'react-native-keep-awake';

export const manager = new BleManager();

let data = [];
let ring = [];
let dataIndex = 0;
let ringIndex = 0;
let dataOk = false;
let ringOk = false;
let sum = 0;
let avgFlow = 0;
const RING_SIZE = 10;
const DATA_SIZE = 30;

const App  = () =>  {
  const [state, setState] = useState({
    previousWeight: 0,
    previousTimestamp: Date.now(),
    currentWeight: 1,
    currentTimeStamp: Date.now(),
    startWeight: 0,
    targetWeight: 0,
    percentWeightRemaining: 0,
    isRunning: false,
    remainingTime: 0,
    maxTime: 0,
    timeTillComplete: 0,
    flowRate: 0
  });
  const [bluetooth, setBluetooth] = useState({
    isConnected: false,
    scale: null,
    deviceName: 'smartchef',
    serviceUUID: '0000fff0-0000-1000-8000-00805f9b34fb',
    characteristicUUID: '0000fff1-0000-1000-8000-00805f9b34fb',
  });  

  // pull in timer and weight defaults
  useEffect(() => {
    const getData = async () => {
      try {
        const savedMaxSeconds = await AsyncStorage.getItem('maxSeconds');
        const savedAlarmWeight = await AsyncStorage.getItem('alarmWeight');

        if (savedMaxSeconds) {
          setState(prevState => ({
            ...prevState,
            maxTime: parseInt(savedMaxSeconds),
            remainingTime: parseInt(savedMaxSeconds)
          }));
        }

        if (savedAlarmWeight) {
          setState(prevState => ({...prevState, targetWeight: parseInt(savedAlarmWeight)}));
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

    if (device.name?.toLowerCase() === bluetooth.deviceName) {
      manager.stopDeviceScan();
      let scale = await device.connect();
      
      if (scale) {
        setBluetooth({...bluetooth, scale: scale, isConnected: true});

        scale = await scale.discoverAllServicesAndCharacteristics();

        //let weightSubscription = await scale.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, decodeWeightFromCharacteristic);
        manager.monitorCharacteristicForDevice(device.id, bluetooth.serviceUUID, bluetooth.characteristicUUID, (error, characteristic) => {
        let weight = decodeWeightFromCharacteristic(error, characteristic);
          setState(prevState =>({
            ...prevState,
            currentWeight: weight,
            currentTimeStamp: Date.now(),
          }));
        });
        scale.onDisconnected(() => {
          setBluetooth({...bluetooth, scale: null, isConnected: false});
          //weightSubscription.remove();
          //soundAlarm();
          Alert.alert('App is no longer connected to scale.');
        });
      }
    }
  };

  useEffect(() => {
    const scanAndConnect = async () => {
      if(!bluetooth.isConnected) {
        console.log('starting scan')
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
      manager.destroy();
      console.log('destroying');
    };
  }, [manager]);

  useEffect(() => {
    if (!bluetooth.isConnected) {
      manager.startDeviceScan(null, null, onDeviceFound);
    }
  }, [bluetooth.isConnected])

  const handleStartButtonPress = () => {
    dataOk = false;
    ringOk = false;
    ring = [];
    data = [];
    sum = 0;
    dataIndex = 0;
    ringIndex = 0;

    for (let i=0; i<DATA_SIZE; i++){
      data.push({});
    }
    for (let i=0; i<RING_SIZE; i++){
      ring.push({});
    }
    setState(prevState => ({
      ...prevState,
      flowRate: 0,
      startWeight: prevState.currentWeight,
      remainingTime: prevState.maxTime,
      isRunning: !prevState.isRunning
    }));
  };

  const handleMaxTimeInput = (input) => {
    // input is minutes, so convert to seconds
    let seconds = input * 60;
    setState(prevState => ({...prevState, maxTime: seconds, remainingTime: seconds}));

    try {
      AsyncStorage.setItem('maxSeconds', JSON.stringify(seconds));
    } catch (e) {
      Alert.alert('There was an error saving the max time.');
    }
  };

  const handleAlarmWeightInput = (input) => {
    setState(prevState => ({...prevState, targetWeight: input}));

    try {
      AsyncStorage.setItem('alarmWeight', input);
    } catch (e) {
      Alert.alert('There was an error saving the weight.');
    }
  };

  const handleFlowMeterReset = () => {
    dataIndex = 0;
    dataOk = false;
    ringIndex = 0;
    ringOk = false;
    setState(prevState => ({...prevState, flowRate: 0}));
  }
  
  useEffect(() => {
    let flow = 0;
    
    if (dataOk) {
      let now = Date.now();
      flow = (data[dataIndex].weight - state.currentWeight) * 1000 * 60 * 60 / (now - data[dataIndex].time);

      if (ringOk) {
        sum -= ring[ringIndex];
        avgFlow = (sum / RING_SIZE).toFixed(0);
        let timeTillComplete = ((state.currentWeight - state.targetWeight) / (avgFlow / 60 / 60)).toFixed(0);
        if (timeTillComplete < 0){
          timeTillComplete = 0;
        }
        setState(prevState => ({...prevState, flowRate: avgFlow, timeTillComplete: timeTillComplete}));
      }

      ring[ringIndex] = flow;
      sum += flow;

      if (++ringIndex >= RING_SIZE) {
        ringIndex = 0;
        ringOk = true;
      }
    }

    data[dataIndex] = {weight: state.currentWeight, time: Date.now()};

    if (++dataIndex >= DATA_SIZE) {
      dataIndex = 0;
      dataOk = true;
    }
  }, [state.currentWeight])

  useEffect(() => {
    if (state.isRunning && ((state.currentWeight <= state.targetWeight) || !state.remainingTime)) {
      soundAlarm();
    }

    let percentRemaining = ((state.startWeight - state.currentWeight)/(state.startWeight-state.targetWeight)) * 100;

    if (percentRemaining > 100) {
      percentRemaining = 100;
    } else if (percentRemaining < 0) {
      percentRemaining = 0;
    }

    setState(prevState => ({...prevState, percentWeightRemaining: percentRemaining}));
  }, [state.currentWeight, state.isRunning, state.remainingTime]);

  useEffect(() => {
    // if not running then stop
    if (!state.isRunning) {
      stopAlarm();
      return;
    }
    
    // exit early when we reach 0
    if (!state.remainingTime) {
      return;
    }

    const intervalId = setInterval(() => {
      setState(prevState => ({...prevState, remainingTime: state.remainingTime - 1}));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [state.remainingTime, state.isRunning]);

  const refRBSheet = useRef();
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.DARK_BLUE} />
      <KeepAwake />
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
                  percent={state.percentWeightRemaining}
                  radius={150}
                  borderWidth={8}
                  color={Colors.GREEN}
                  shadowColor={Colors.WHITE}
                  bgColor={Colors.DARK_BLUE}>
                  <Text style={styles.percentText}>{Math.floor(state.percentWeightRemaining)}%</Text> 
                  <Text style={styles.weightText}>{formatTime(state.timeTillComplete)}</Text> 
                </ProgressCircle>
              </View>
              <View style={{width: '100%', padding: 15, justifyContent: 'space-between', marginBottom: '10%', flexDirection: 'row'}}>
                <View style={{alignItems: 'center'}}>
                  <TouchableOpacity onPress={handleFlowMeterReset}>
                    <Text style={{color: ringOk ? Colors.WHITE : Colors.ORANGE, fontSize: 35}}>{state.flowRate} cc/hr</Text>
                    <Text style={{color: Colors.WHITE, fontSize: 20}}>Flow Rate</Text>
                  </TouchableOpacity>
                </View>
                <View>
                  <View style={{alignItems: 'center'}}>
                    <Text style={{color: Colors.WHITE, fontSize: 35}}>{state.currentWeight}</Text>
                    <Text style={{color: Colors.WHITE, fontSize: 20}}>Weight</Text>
                  </View>
                </View>
            </View>
              <View style={styles.remainingTimeContainer}>
                <Text style={styles.remainingTimeText}>{formatTime(state.remainingTime)} remaining.</Text>
              </View>
              <TouchableOpacity
                style={styles.startButtonContainer}
                onPress={handleStartButtonPress}>
                <Text style={styles.startButtonText}>{state.isRunning ? "Stop" : "Start"}</Text>
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
                  value={(state.maxTime/60).toString()}
                  onChangeText={handleMaxTimeInput}
                  keyboardType='numeric'
                  style={styles.textInput}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Alarm weight: </Text>
                <TextInput
                  value={state.targetWeight.toString()}
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
    marginTop: '5%',
    marginBottom: '2%',
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

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
  Image
} from 'react-native';

import { BleManager } from 'react-native-ble-plx';
import Base64Binary from './logic/Base64toInt';
import SoundPlayer from 'react-native-sound-player';
import checkForBluetoothPermission from './logic/bluetoothPermissions';
import RBSheet from "react-native-raw-bottom-sheet";
import formatTime from './logic/formatTime';
import Settings from './assets/settingsgear.svg';

const App  = () =>  {
  const [powerState, setPowerState] = useState('');
  const [weight, setWeight] = useState(0);
  const [running, setRunning] = useState(false);
  const [maxTime, setMaxTime] = useState(1800);
  const [alarmWeight, setAlarmWeight] = useState(85);
  const [remainingTime, setRemainingTime] = useState(maxTime);

  useEffect(() => {
    checkForBluetoothPermission()
    .then((result) => {
      if (result && !result.success) {
        Alert.alert(result.message);
      }
    });
  }, []);

  useEffect(() => {
    const manager = new BleManager();

    const scanAndConnect = async () => {
      /*console.log('checking connection state')
      const connected = await manager.isDeviceConnected();
      console.log('finished checking connection state')
      if (connected) {
        console.log('device already connected');
        return;
      }*/
      
      manager.startDeviceScan(null, null, (error, device) => {
          if (error) {
              // Handle error (scanning will be stopped automatically)
              console.log('error!' + JSON.stringify(error));
              return
          }

          // Stop scanning as it's not necessary if you are scanning for one device.
          if (device.name === 'smartchef') {
            let data = Base64Binary.decode(device.manufacturerData);
            let weight = (data[5] * 256 + data[6])/100;
            setWeight(weight.toFixed(1));
            
            }

            //manager.stopDeviceScan();
            //console.log('ended scan');
            // Proceed with connection.
            /*manager.connectToDevice(device.id)
            .then(device => {
              console.log('connected! ' + device.name);
              return device.discoverAllServicesAndCharacteristics()
            })
            .then(device => {
              console.log('got service, apparently');
              return device.services()
            })
            .then(services => {
              console.log('services ' + services);
            });*/
      });
    };

    const subscription = manager.onStateChange((state) => {
      setPowerState(state);

      if (state === 'PoweredOn') {
          scanAndConnect();
          subscription.remove();
        }
  }, true);

    //return manager.destroy();
  }, []);

  const handleStartButtonPress = () => {
    setRunning(!running);
  };

  const handleClearButtonPress = () => {
    setRemainingTime(maxTime);
  };

  // input is minutes, so convert to seconds
  const handleMaxTimeInput = (input) => {
    setMaxTime(input * 60);
  };

  const handleAlarmWeightInput = (input) => {
    setAlarmWeight(input);
  };

  useEffect(() => {
    if (running && weight < alarmWeight) {
      console.log('alarm: ' + alarmWeight);
      try {
        // play the file tone.mp3
        SoundPlayer.playSoundFile('nudge', 'mp3');
      } catch (e) {
        console.log(`cannot play the sound file`, e);
      }
    } else {
      SoundPlayer.stop();
    }
  }, [weight, running]);

  useEffect(() => {

  }, [remainingTime]);

  useEffect(() => {
    // if not running then stop
    if (!running) {
      return;
    }
    
    // exit early when we reach 0
    if (!remainingTime) {
      setRunning(false);
      SoundPlayer.playSoundFile('nudge', 'mp3');
      return;
    }



    // save intervalId to clear the interval when the
    // component re-renders
    const intervalId = setInterval(() => {
      setRemainingTime(remainingTime - 1);
    }, 1000);

    // clear interval on re-render to avoid memory leaks
    return () => clearInterval(intervalId);
    // add timeLeft as a dependency to re-rerun the effect
    // when we update it
  }, [remainingTime, running]);

  const refRBSheet = useRef();
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor='#4c6691' />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.mainContainer}>
            <TouchableOpacity title="Settings" onPress={() => refRBSheet.current.open()} style={styles.settingsContainer}>
              {/*<Image source={require('./assets/settings.png')} style={styles.settingsGear} />*/}
              <Settings width={40} height={40} />
            </TouchableOpacity>
            <View style={styles.weightContainer}>
              <Text style={styles.weightText}>{weight}g</Text>
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
                  onChange={handleMaxTimeInput}
                  keyboardType='numeric'
                  style={styles.textInput}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Alarm weight: </Text>
                <TextInput
                  value={alarmWeight.toString()}
                  onChange={handleAlarmWeightInput}
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
    padding: '3%',
    backgroundColor: '#4c6691',
  },
  mainContainer: {
    //borderWidth: 2,
    borderColor: 'black',
  },
  weightContainer: {
    //borderWidth: 2,
    borderColor: 'green',
    alignItems: 'center',
    marginTop: '25%',
  },
  weightText: {
    fontSize: 75,
    color: 'white',
  },
  startButtonContainer: {
    marginVertical: '5%',
    alignItems: 'center',
    //borderWidth: 1,
    backgroundColor: '#89ade8',
    borderRadius: 20,
  },
  startButton: {
    
  },
  startButtonText: {
    fontSize: 35,
    color: 'white',
  },
  remainingTimeContainer: {
    alignItems: 'center',
  },
  remainingTimeText: {
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
    alignItems: 'flex-end',
    marginRight: 10,
  },
  settingsGear: {
    width: 35,
    height: 35
  }
});

export default App;

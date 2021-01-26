/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  FlatList,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
} from 'react-native';

import { BleManager } from 'react-native-ble-plx';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import Base64Binary from './logic/Base64toInt';

const App  = () =>  {
  const [powerState, setPowerState] = useState('');
  const [weight, setWeight] = useState('0.00g');

  useEffect(() => {
    check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
    .then((result) => {
      switch (result) {
        case RESULTS.UNAVAILABLE:
          console.log('This feature is not available (on this device / in this context)');
          break;
        case RESULTS.DENIED:
          request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then((result) => {
            console.log('permission granted');
          });
          break;
        case RESULTS.LIMITED:
          console.log('The permission is limited: some actions are possible');
          break;
        case RESULTS.GRANTED:
          console.log('The permission is granted');
          break;
        case RESULTS.BLOCKED:
          console.log('The permission is denied and not requestable anymore');
          break;
      }
    })
    .catch((error) => {
      // …
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
            setWeight(weight + 'g')
            
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

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor='white' />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.mainContainer}>
            <View style={styles.weightContainer}>
              <Text style={styles.weightText}>{weight}</Text>
            </View>
            <View style={styles.startButtonContainer}>
              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    borderWidth: 2,
    borderColor: 'red',
    height: '100%',
    padding: '3%',
  },
  mainContainer: {
    borderWidth: 2,
    borderColor: 'black',
    backgroundColor: 'white',
  },
  weightContainer: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'green',
    alignItems: 'center',
    marginTop: '40%',
  },
  weightText: {
    fontSize: 75,
  },
  startButtonContainer: {
    marginVertical: '5%',
    alignItems: 'center',
    //borderWidth: 1,
    backgroundColor: 'gray',
    borderRadius: 20,
  },
  startButton: {
    
  },
  startButtonText: {
    fontSize: 35,
  },
});

export default App;

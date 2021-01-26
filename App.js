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
} from 'react-native';

import { BleManager } from 'react-native-ble-plx';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {decode} from 'base-64';

const App  = () =>  {
  const [powerState, setPowerState] = useState('');
  const [device, setDevice] = useState({});

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

          let data = '';
          let tempData = '0'

          // Stop scanning as it's not necessary if you are scanning for one device.
          if (device.name === 'smartchef') {
            //setDevice(device);
            tempData = device.manufacturerData;
            if (data !== tempData) {
              console.log(tempData);
              console.log(Base64Binary.decode(tempData));
              data = tempData;
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
          } 
      });
    };

    var Base64Binary = {
      _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      
      /* will return a  Uint8Array type */
      decodeArrayBuffer: function(input) {
        var bytes = (input.length/4) * 3;
        var ab = new ArrayBuffer(bytes);
        this.decode(input, ab);
        
        return ab;
      },
    
      removePaddingChars: function(input){
        var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
        if(lkey == 64){
          return input.substring(0,input.length - 1);
        }
        return input;
      },
    
      decode: function (input, arrayBuffer) {
        //get last chars to see if are valid
        input = this.removePaddingChars(input);
        input = this.removePaddingChars(input);
    
        var bytes = parseInt((input.length / 4) * 3, 10);
        
        var uarray;
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        var j = 0;
        
        if (arrayBuffer)
          uarray = new Uint8Array(arrayBuffer);
        else
          uarray = new Uint8Array(bytes);
        
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        
        for (i=0; i<bytes; i+=3) {	
          //get the 3 octects in 4 ascii chars
          enc1 = this._keyStr.indexOf(input.charAt(j++));
          enc2 = this._keyStr.indexOf(input.charAt(j++));
          enc3 = this._keyStr.indexOf(input.charAt(j++));
          enc4 = this._keyStr.indexOf(input.charAt(j++));
      
          chr1 = (enc1 << 2) | (enc2 >> 4);
          chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          chr3 = ((enc3 & 3) << 6) | enc4;
      
          uarray[i] = chr1;			
          if (enc3 != 64) uarray[i+1] = chr2;
          if (enc4 != 64) uarray[i+2] = chr3;
        }
      
        return uarray;	
      }
    }

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
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View>
            <Text>BLE State: {powerState}</Text>
            {device && <Text>{device.name}: {device.id} data: {JSON.stringify(device.manufacturerData)}</Text>}
          </View>

          {/*<FlatList
            data={deviceList}
            renderItem={((item) => <View><Text>{item.name}</Text></View>)}
            keyExtractor={item => item.id} 
          />*/}
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    height: '100%',
    padding: '3%',
  },
  body: {
    backgroundColor: 'white',
  },
});

export default App;

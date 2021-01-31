import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';


const checkForBluetoothPermission = async () => {
  check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
  .then(async (result) => {
    switch (result) {
      case RESULTS.UNAVAILABLE:
        return {success: false, message: 'This device does not support bluetooth!'};
      case RESULTS.DENIED:
        let permission = await requestBluetoothPermission();
        if (permission == RESULTS.GRANTED) {
          return {success: true, message: ''};
        } else {
          return {success: false, message: 'The permission is denied and not requestable anymore.'};
        }
      case RESULTS.LIMITED:
        return {success: false, message: 'The permission is limited: some actions are possible.'};
      case RESULTS.GRANTED:
        return {success: true, message: ''};
      case RESULTS.BLOCKED:
        return {success: false, message: 'The permission is denied and not requestable anymore.'};
    }
  })
  .catch((error) => {
    return {success: false, message: 'An error occurred trying to access bluetooth.'};
  });
};

const requestBluetoothPermission = async () => {
  let permission = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
  return permission;
}

export default checkForBluetoothPermission;

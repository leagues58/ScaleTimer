import {Alert} from 'react-native';
import SoundPlayer from 'react-native-sound-player';

const soundAlarm = async () => {
  try {
    SoundPlayer.playSoundFile('nudge', 'mp3');
  } catch (e) {
    Alert.alert('Alarm is not working!!!');
  }
};

const stopAlarm = () => {
  SoundPlayer.stop();
};

export {soundAlarm, stopAlarm};

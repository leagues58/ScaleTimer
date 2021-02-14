import {Alert} from 'react-native';
import SoundPlayer from 'react-native-sound-player';

let isAlarming = false;
let onFinishedPlayingSubscription = SoundPlayer.addEventListener('FinishedPlaying', ({ success }) => {
  isAlarming = false;
});

const soundAlarm = async () => {
  try {
    if(!isAlarming) {
      SoundPlayer.playSoundFile('nudge', 'mp3');
      isAlarming = true;
    }
  } catch (e) {
    console.error('alarm is not working. ' + e.toString());
  }
};

const stopAlarm = () => {
  SoundPlayer.stop();
  isAlarming = false;
};

export {soundAlarm, stopAlarm};

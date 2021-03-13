import Base64Binary from './Base64toInt';

const decodeWeightFromCharacteristic = (error, characteristic) => {
  if (error) {
    return
  }
  let data = Base64Binary.decode(characteristic.value);
  let weight = (data[5] * 256 + data[6])/100;
  
  return weight.toFixed(2);
};

export default decodeWeightFromCharacteristic;
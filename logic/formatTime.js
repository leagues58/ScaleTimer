const formatTime = (secondsInput) => {
  let minutes = Math.floor(secondsInput / 60);
  let seconds = secondsInput % 60;
  if (seconds < 10) {seconds = "0"+seconds;}
  return minutes + ':' + seconds;
};

export default formatTime;
function timePassedAsSeconds(time) {
    const now = new Date();
    const timeDiff = now - time;
    const seconds = Math.floor(timeDiff / 1000);
    return seconds;
  }
  
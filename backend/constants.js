// Duration rules:
// - Shorts must be at least SHORT_MIN_SECONDS and at most SHORT_MAX_SECONDS.
// - Long videos must be at least LONG_MIN_SECONDS.
// - Anything strictly between SHORT_MAX_SECONDS and LONG_MIN_SECONDS fits
//   neither category and is rejected at upload time.
module.exports = {
  SHORT_MIN_SECONDS: 10,
  SHORT_MAX_SECONDS: 120,
  LONG_MIN_SECONDS: 180
};

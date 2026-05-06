//Adds a slight pause so that long operations
module.exports = function () {
  return new Promise<void>((resolve) => {
    setImmediate(() => resolve());
  });
};

const healthCheck = (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(), //show how long the server has been running
  });
};

module.exports = {
  healthCheck,
};

module.exports = function (req, res, next) {
    console.log("== Got request:");
    console.log("  -- URL:", req.url);
    console.log("  -- method:", req.method);
    next();
};
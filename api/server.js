const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const PythonShell = require("python-shell");
const api = require('./routes/index');

const app = express();
const port = process.env.PORT || 8000;

/*****************************************************************
 *  MongoDB initialization
 *****************************************************************/
const mongoHost = process.env.MONGO_HOST;
const mongoPort = process.env.MONGO_PORT || '27017';
const mongoDBName = process.env.MONGO_DATABASE;
const mongoUser = process.env.MONGO_USER;
const mongoPassword = process.env.MONGO_PASSWORD;

const mongoURL = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDBName}`;
console.log("== Mongo URL:", mongoURL);


/*****************************************************************
 *  Route handling
 *****************************************************************/
app.use('/', api);

app.use('*', function (req, res) {
    res.status(404).json({
        error: "Requested resource " + req.originalUrl + " does not exist"
    });
});

/*****************************************************************
 *  Python shell init
 *****************************************************************/
app.locals.pythonShell = new PythonShell("");

/*****************************************************************
 *  Database + server connection
 *****************************************************************/
MongoClient.connect(mongoURL, function (err, client) {
    if (!err) {
        app.locals.mongoDB = client.db(mongoDBName);
        app.listen(port, function() {
            console.log("== Server is running on port", port);
        });
    }
});

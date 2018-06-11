const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const MongoClient = require('mongodb').MongoClient;
const pythonShell = require('child_process');


const api = require('./api/routes');

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

// use morgan for logging and bodyparser to make json easier to work with
app.use(morgan('dev'));
app.use(bodyParser.json());


app.use('/', api);

app.use('*', function (req, res) {
    res.status(404).json({
        error: "Requested resource " + req.originalUrl + " does not exist"
    });
});

/*****************************************************************
 *  Python shell init
 *****************************************************************/

app.locals.pythonShell = pythonShell.spawn('python', ["classify_samoyed.py"]);

app.locals.pythonShell.stdout.on('data', function(data) {
    console.log(data.toString());
});

app.locals.pythonShell.on('exit', function(code) {
    console.log("Exited with code " + code);
});

app.locals.pythonShell.stderr.on('data', function(data) {
    console.error(data.toString());
});

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


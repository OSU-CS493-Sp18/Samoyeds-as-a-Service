const router = require('express').Router();
const ObjectId = require('mongodb').ObjectId;

const validation = require('../../lib/validation');
const { requireAuthentication } = require('../../lib/auth');

const reportSchema = {
    photoID: { required: true },
    issue: { required: false },
};

/*****************************************************************
 *  Pop and send first listed report
 *****************************************************************/
//TODO: give easy option to add/remove photo from "photos" database
function getFirstReport(mongoDB){
    const reportCollection = mongoDB.collection('reports');
    return reportCollection.findOneAndDelete({})
        .then((results) => {
            return Promise.resolve(results);
        });
}

router.get('/', requireAuthentication, (req, res, next) =>{
    const mongoDB = req.app.locals.mongoDB;
    //Checks "user id" based off of admin key. Pretty janky but works for now.
    console.log(process.env.ADMIN_KEY);
    if (process.env.ADMIN_KEY !== req.headers.userid) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    }
    else{
        getFirstReport(mongoDB)
            .then((report) => {
                if (report) {
                    console.log(report);
                    report.accept = `/report/accept/${report.value.photoID}`;
                    report.reject = `/report/reject/${report.value.photoID}`;
                    res.status(200).json(report);
                }
                else {
                    next();
                }
            })
            .catch((err) => {
                res.status(500).json({
                    error: "Failed to fetch report."
                });
            });
    }
});

/*****************************************************************
 *  Add new document to report collection
 *****************************************************************/
function insertNewReport(report, mongoDB) {
    const reportCollection = mongoDB.collection('reports');
    const reportDocument = {
        photoID: report.photoID,
        issue: report.issue,
    };
    return reportCollection.insertOne(reportDocument)
        .then((result)=>{
            return Promise.resolve(result.insertedId);
        });
}

router.post('/', (req, res) =>{
    const mongoDB = req.app.locals.mongoDB;
    if (validation.validateAgainstSchema(req.body, reportSchema)) {
        insertNewReport(req.body, mongoDB)
            .then((id) => {
                res.status(201).json({
                    _id: id,
                    success: "Your report has been submitted successfully, we will resolve it shortly."
                });
            })
            .catch((err) => {
                res.status(500).json({
                    error: "Error submitting report, please try again later"
                });
            });
    } else {
        res.status(400).json({
            error: "Error submitting report, please check that you have all fields filled out correctly."
        })
    }
});

/*****************************************************************
 *  Accept/Reject report
 *****************************************************************/
router.post('/accept/:PID', (req, res) =>{
    const mongoDB = req.app.locals.mongoDB;
    if (process.env.ADMIN_KEY !== req.headers.userid) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    }
    else{
        mongoDB.collection('samoyeds').findOne({_id: req.params.PID})
            .then((result)=>{
                console.log("result: " + result);
                if(result !== null){
                    res.status(200).json({
                        success: "Photo is already in the database"
                    })
                }
                else{
                    mongoDB.collection('samoyeds').insert({
                        _id: req.params.PID
                    })
                        .then( () =>{
                            res.status(200).json({
                                success: "Photo inserted successfully"
                            });
                        });

                }
            });
    }
});

router.post('/reject/:PID', (req, res) =>{
    //check if ID is in database and delete if it is
    const mongoDB = req.app.locals.mongoDB;
    if (process.env.ADMIN_KEY !== req.headers.userid) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    }
    else{
        mongoDB.collection('samoyeds').findOne({_id: req.params.PID})
            .then((result)=>{
                console.log("result: " + result);
                if(result !== null){
                    mongoDB.collection('samoyeds').deleteOne({_id: req.params.PID}, function (err, obj) {
                        if (err) throw err;
                        console.log("1 document deleted");
                        res.status(200).json({
                            success: "Photo deleted successfully"
                        });
                    })
                }
                else{
                    res.status(200).json({
                        success: "Photo was not in the database"
                    })
                }
            });
    }
});
exports.router = router;


const router = require('express').Router();

const validation = require('../../lib/validation');
const { requireAuthentication } = require('../../lib/auth');

const reportSchema = {
    photoID: { required: true },
    issue: { required: false },
};

/*****************************************************************
 *  Pop and send first listed report
 *****************************************************************/
//TODO: Make admin only able to get to reports
//TODO: give easy option to add/remove photo from "photos" database
function getFirstReport(mongoDB){
    const reportCollection = mongoDB.collection('reports');
    return reportCollection.findOneAndDelete({})
        .then((results) => {
            return Promise.resolve(results);
        });
}

router.get('/', requireAuthentication, (req, res, next) =>{
    console.log("here");
    const mongoDB = req.app.locals.mongoDB;
    console.log(`req.user: ${req.user}`);
    console.log(`req.headers: ${JSON.stringify(req.headers)}`);
    if (req.user !== req.headers.userid) {
        res.status(403).json({
            error: "Unauthorized to access that resource"
        });
    }
    else{
        console.log(req.params.userID);
        getFirstReport(mongoDB)
            .then((report) => {
                if (report) {
                    res.status(200).json(report);
                }
                else {
                    console.log("going to heck next?");
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

exports.router = router;


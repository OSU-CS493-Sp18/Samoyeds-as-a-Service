const router = require('express').Router();

const validation = require('../lib/validation');
const { requireAuthentication } = require('../lib/auth');

const reportSchema = {
    photoID: { required: true },
    issue: { required: false },
};

/*****************************************************************
 *  Pop and send first listed report
 *****************************************************************/
function getFirstReport(mongoDB){
    const reportCollection = mongoDB.collection('reports');
    return reportCollection.findOneAndDelete({})
        .then((results) => {
            return Promise.resolve(results[0]);
        });
}

router.get('/', requireAuthentication, (req, res, next) =>{
    const mongoDB = req.app.locals.mongoDB;
    if (req.user !== req.params.userID) {
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
                } else {
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


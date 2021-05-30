// Force AWS SDK to use credentials and config files :facepalm:
process.env.AWS_PROFILE = 'zuzu';
process.env.AWS_SDK_LOAD_CONFIG = '1';


// Imports the AWS client library
const AWS = require('aws-sdk');
var credentials = new AWS.SharedIniFileCredentials({profile: 'zuzu'});
AWS.config.credentials = credentials;
AWS.config.logger = console;

const rekognition = new AWS.Rekognition();
//const s3 = new AWS.S3({region: "eu-central-1"});
const s3 = new AWS.S3();
const fs = require('fs');

function ZuzuRekognition (opts) {
    this.collection = opts.config.aws.rekognition.collection;
    this.s3obj = {S3Object:{Bucket:opts.config.aws.s3.bucket,Name:"zuzu-camera.jpg"}};
    self = this;

    // Depends on creating an IAM user with AmazonRekognitionFullAccess and maybe AmazonS3ReadOnlyAccess as explained in
    // https://docs.aws.amazon.com/rekognition/latest/dg/setting-up.html#setting-up-iam
    // And API keys saved in ~/.aws/credentials under [zuzu] 
    this.search = async function (imageFilePath, callback) {
        this.uploadFile(imageFilePath, this.doRekognition(callback));
    };

    this.doRekognition = function (callback) {
        // This will itself be sent as a callback, so return callable function (sigh)
        return function() {
            console.log("send rekognition request...");
            var params = {
                CollectionId: self.collection,
                Image: self.s3obj
            };
            rekognition.searchFacesByImage(params, function (err, data) {
                if (err) {
                    if ( err.message == "There are no faces in the image. Should be at least 1." ) {
                        callback({original_error: err, status: "NO FACE"})
                    }
                    else {
                        console.log(err, err.stack);
                    }
                }
                else {
                    console.log(data);
                    if ( data.FaceMatches && data.FaceMatches.length > 0 ) {
                        console.log(data.FaceMatches[0].Face);
                        callback({name: data.FaceMatches[0].Face.ExternalImageId,
                                confidence: data.FaceMatches[0].Face.Confidence,
                                status: "OK"});
                    } else {
                        // There is a face but it didn't match anyone in our Rekognition collection.
                        callback({status: "UNKNOWN FACE"});
                    }
                }
            });
        };
    };

    this.uploadFile = (fileName, callback) => {
        console.log("Upload to S3...");
        // Read content from the file
        const fileContent = fs.readFileSync(fileName);

        // Setting up S3 upload parameters
        const params = {
            Bucket: opts.config.aws.s3.bucket,
            Key: fileName, // File name you want to save as in S3
            Body: fileContent,
            //ACL: 'public-read'
        };

        // Uploading files to the bucket
        s3.upload(params, function(err, data) {
            if (err) {
                throw err;
            }
            console.log(`File uploaded successfully. ${data.Location}`);
            callback();
        });
    };

    this.add = function ( friend, callback ) {
        console.log("ZuzuRekognition.add(" + friend.name + ")");
        var params = {
            CollectionId: self.collection, 
            ExternalImageId: friend.name, 
            Image: self.s3obj
        };
        rekognition.indexFaces(params, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
            }
            else {
                console.log(data);           // successful response
                if (callback) callback();
            }
        });
    };
};

// module.exports = {
//     search: doBoth,
//     add: addNewFace,
// };
module.exports.create = function(opts) {
    return new ZuzuRekognition(opts);
};

// Imports the AWS client library
const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-central-1'});
var credentials = new AWS.SharedIniFileCredentials({profile: 'zuzu'});
AWS.config.credentials = credentials;
AWS.config.logger = console;

const rekognition = new AWS.Rekognition({region: "eu-central-1"});
const s3 = new AWS.S3({region: "eu-central-1"});
const fs = require('fs');

var _robot;
var _FriendFactory;

module.exports = async function (imageFilePath, callback) {
    doBoth(imageFilePath, callback);
}

// Depends on creating an IAM user with AmazonRekognitionFullAccess and maybe AmazonS3ReadOnlyAccess as explained in
// https://docs.aws.amazon.com/rekognition/latest/dg/setting-up.html#setting-up-iam
// And API keys saved in ~/.aws/credentials under [zuzu] 
const doBoth = function (imageFilePath, callback) {
    //console.log(base64_img);
    uploadFile(imageFilePath, doRekognition(callback));
};

const doRekognition = function (callback) {
    // This will itself be sent as a callback, so return callable function (sigh)
    return function(S3Path) {
        console.log("send rekognition request...");
        var params = {
            CollectionId: "zuzufriends",
            Image: {S3Object:{Bucket:"zuzu",Name:"zuzu-camera.jpg"}}
        };
        rekognition.searchFacesByImage(params, function (err, data) {
            if (err) {
                if ( err.message == "There are no faces in the image. Should be at least 1." ) {
                    // Nothing to do.
                }
                else {
                    console.log(err, err.stack);
                }
            }
            else {
                console.log(data);
                if ( data.FaceMatches && data.FaceMatches.length > 0 ) {
                    console.log(data.FaceMatches[0].Face);
                    callback(data.FaceMatches[0].Face.ExternalImageId);
                } else {
                    // There is a face but it didn't match anyone in our Rekognition collection.
                    callback();
                }
            }
        });
    };
};

const uploadFile = (fileName, callback) => {
    console.log("Upload to S3...");
    // Read content from the file
    const fileContent = fs.readFileSync(fileName);

    // Setting up S3 upload parameters
    const params = {
        Bucket: "zuzu",
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
        callback(data.Location);
    });
};
// Imports the AWS client library
const AWS = require('aws-sdk');
AWS.config.update({region: 'eu-central-1'});
var credentials = new AWS.SharedIniFileCredentials({profile: 'zuzu'});
AWS.config.credentials = credentials;
AWS.config.logger = console;

const rekognition = new AWS.Rekognition({region: "eu-central-1"});
const s3 = new AWS.S3({region: "eu-central-1"});
const fs = require('fs');

const collection = "zuzufriends";
const s3obj = {S3Object:{Bucket:"zuzu",Name:"zuzu-camera.jpg"}};

// Depends on creating an IAM user with AmazonRekognitionFullAccess and maybe AmazonS3ReadOnlyAccess as explained in
// https://docs.aws.amazon.com/rekognition/latest/dg/setting-up.html#setting-up-iam
// And API keys saved in ~/.aws/credentials under [zuzu] 
const doBoth = async function (imageFilePath, callback) {
    //console.log(base64_img);
    uploadFile(imageFilePath, doRekognition(callback));
};

const doRekognition = function (callback) {
    // This will itself be sent as a callback, so return callable function (sigh)
    return function() {
        console.log("send rekognition request...");
        var params = {
            CollectionId: collection,
            Image: s3obj
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
        callback();
    });
};

const addNewFace = function ( friend, callback ) {
    console.log("addNewFace(" + friend.name + ")");
    var params = {
        CollectionId: collection, 
        ExternalImageId: friend.name, 
        Image: s3obj
    };
    rekognition.indexFaces(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        }
        else {
            console.log(data);           // successful response
            callback();
        }
    });
};

module.exports = {
    search: doBoth,
    add: addNewFace,
};

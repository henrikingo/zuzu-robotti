## Dependencies

    sudo apt install fswebcam mplayer alsa-utils

GCP text-to-speech returns mp3, so mplayer is required. alsa-utils is for arecord.

## Register faces to Rekognition collection

You must create this collection manually:

    aws --profile zuzu --region eu-central-1 rekognition create-collection --collection-id zuzufriends

You can upload photos also manually. One benefit is you can type your name correctly! Note that --external-image-id is used to store the name. Zuzu currently has no storage of its own.

    aws --profile zuzu --region eu-central-1 rekognition index-faces --collection-id zuzufriends --image-bytes 'fileb://Ebba.jpeg' --external-image-id Ebba

You can test the recognition working with `search-faces-by-image`:

    aws --profile zuzu --region eu-central-1 rekognition search-faces-by-image --collection-id zuzufriends --image-bytes 'fileb://Ebba2.jpg'

List all faces:

    aws --profile zuzu --region eu-central-1 rekognition list-faces --collection-id zuzufriends

Delete a face:

    aws --profile zuzu --region eu-central-1 rekognition delete-faces --collection-id zuzufriends --face-ids '["40d1fb5b-6f32-441f-831b-af67720b68ed"]'

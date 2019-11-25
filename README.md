
## Register faces to Rekognition collection

Zuzu doesn't know how to add new friends. This must be done manually with aws cli. Note that --external-image-id is used to store the name. Zuzu currently has no storage of its own.

    aws --profile zuzu --region eu-central-1 rekognition create-collection --collection-id zuzufriends
    
    aws --profile zuzu --region eu-central-1 rekognition index-faces --collection-id zuzufriends --image-bytes 'fileb://Ebba.jpeg' --external-image-id Ebba

You can test the recognition working with `search-faces-by-image`:

    aws --profile zuzu --region eu-central-1 rekognition search-faces-by-image --collection-id zuzufriends --image-bytes 'fileb://Ebba2.jpg'